/**
 * @file Create Entry DB
 * @name EntryDB.ts
 * @license MIT
 */

import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

import { ComputeRandomObjectHash, CreateHash, Encrypt } from "./helpers/Hash";
import SQL from "./helpers/SQL";

import Media from "./MediaDB";
import Expiry from "./Expiry";
import LogDB from "./LogDB";

import pack from "../../../package.json";
import type { Config } from "../..";

import BaseParser from "./helpers/BaseParser";

export type Paste = {
    // * = value is not stored in database record
    Content: string;
    EditPassword: string;
    CustomURL: string;
    PubDate: number;
    EditDate: number;
    GroupName?: string;
    GroupSubmitPassword?: string;
    ENC_IV?: string;
    ENC_KEY?: string;
    ENC_CODE?: string;
    ViewPassword?: string; // we're going to use this to check if the paste is private,
    //                        if it is valid, the paste is private and should have a
    //                        corresponding entry in the Encryption table
    HostServer?: string; // *
    IsEditable?: string; // *
    ExpireOn?: string; //   *
    UnhashedEditPassword?: string; // * only used on paste creation
    Views?: number; // * amount of log records LIKE "%{CustomURL}%"
    CommentOn?: string; // * the paste the that this paste is commenting on
    IsPM?: string; // * details if the **comment** is a private message, boolean string
    Comments?: number; // * (obvious what this is for, added in GetPasteFromURL)
    ReportOn?: string; // * the paste that this paste is reporting
    Associated?: string; // * the paste that is associated with this new paste
    Metadata?: PasteMetadata; // * (kinda), stored in paste content after "_metadata:" as base64 encoded JSON string
};

export type PasteMetadata = {
    Version: 1;
    Owner: string; // the owner of the paste
    Locked?: boolean; // locked pastes cannot be edited, and the paste cannot be used as an association
    ShowOwnerEnabled?: boolean;
    ShowViewCount?: boolean;
    Favicon?: string; // favicon shown on paste
    Title?: string; // title shown on paste
    PrivateSource?: boolean;
    SocialIcon?: string; // shown as a "profile picture" in some places
    Badges?: string; // comma separated array of badges, shown under paste
    PasteType?: "normal" | "builder" | "workshop" | "package";
    // comments/reports stuff
    Comments?: {
        IsCommentOn?: string;
        ParentCommentOn?: string; // (if paste is a reply) stores the IsCommentOn of the comment it is replying to
        IsPrivateMessage?: boolean;
        Enabled: boolean;
        Filter?: string;
        ReportsEnabled?: boolean;
    };
};

/**
 * @export
 * @class EntryDB
 */
export default class EntryDB {
    public static DataDirectory = (
        process.env.DATA_LOCATION || path.resolve(process.cwd(), "data")
    ).replace(":cwd", process.cwd());

    public static ConfigLocation = (
        process.env.CONFIG_LOCATION || ":cwd/data/config.json"
    ).replace(":cwd", process.cwd());

    public readonly db: Database;
    public readonly isNew: boolean = true;
    public static Zones: { [key: string]: EntryDB } = {};

    public static Expiry: Expiry; // hold expiry registry
    public static Logs: LogDB; // hold log db
    public static Media: Media; // hold media db

    public static readonly MaxContentLength = 400_000;
    public static readonly MaxPasswordLength = 256;
    public static readonly MaxCustomURLLength = 500;

    public static readonly MinContentLength = 1;
    public static readonly MinPasswordLength = 5;
    public static readonly MinCustomURLLength = 2;

    public static config: Config;
    private static readonly URLRegex = /^[\w\_\-\.\!\@]+$/gm; // custom urls must match this to be accepted

    public static StaticInit: boolean = false;

    /**
     * Creates an instance of EntryDB.
     * @param {string} [dbname="entry"] Set the name of the database file
     * @param {string} [dbdir] Set the parent directory of the database file
     * @param {boolean} [ZoneStaticInit] Force new database functions to run
     * @memberof EntryDB
     */
    constructor(dbname: string = "entry", dbdir?: string, ZoneStaticInit?: boolean) {
        // set datadirectory based on config file
        if (fs.existsSync(EntryDB.ConfigLocation))
            EntryDB.DataDirectory =
                // if config file doesn't include a data entry, don't change datadirectory at all...
                // STILL ACCEPTS PROCESS.ENV.DATA_DIRECTORY!!! (just prefers config file version)
                (
                    (
                        JSON.parse(
                            fs.readFileSync(EntryDB.ConfigLocation).toString()
                        ) as Config
                    ).data || EntryDB.DataDirectory
                ).replace(":cwd", process.cwd());

        // set dbdir to EntryDB.DataDirectory if it is undefined
        if (!dbdir) dbdir = EntryDB.DataDirectory;

        // create db link
        const [db, isNew] = SQL.CreateDB(dbname, dbdir);

        this.isNew = isNew;
        this.db = db;

        (async () => {
            // create tables
            await SQL.QueryOBJ({
                db,
                query: `CREATE TABLE IF NOT EXISTS Pastes (
                    Content varchar(${EntryDB.MaxContentLength}),
                    EditPassword varchar(${EntryDB.MaxPasswordLength}),
                    CustomURL varchar(${EntryDB.MaxCustomURLLength}),
                    ViewPassword varchar(${EntryDB.MaxPasswordLength}),
                    PubDate datetime DEFAULT CURRENT_TIMESTAMP,
                    EditDate datetime DEFAULT CURRENT_TIMESTAMP,
                    GroupName varchar(${EntryDB.MaxCustomURLLength}),
                    GroupSubmitPassword varchar(${EntryDB.MaxPasswordLength})
                )`,
            });

            await SQL.QueryOBJ({
                db,
                query: `CREATE TABLE IF NOT EXISTS Encryption (
                    ViewPassword varchar(${EntryDB.MaxPasswordLength}),
                    CustomURL varchar(${EntryDB.MaxCustomURLLength}),
                    ENC_IV varchar(24),
                    ENC_KEY varchar(64),
                    ENC_CODE varchar(32)
                )`,
            });

            // static init
            if (!EntryDB.StaticInit || ZoneStaticInit === true) {
                EntryDB.StaticInit = true;

                await EntryDB.GetConfig(); // fill config

                // ...inits
                await EntryDB.CreateExpiry();
                await EntryDB.InitLogs();
                await EntryDB.InitMedia();
                await EntryDB.InitZones();

                // version paste check
                if (!(await EntryDB.GetConfig())) return;

                // check version
                let storedVersion = await this.GetPasteFromURL("v");

                if (!storedVersion) {
                    // create version paste
                    // this is used to check if the server is outdated
                    await SQL.QueryOBJ({
                        db: db,
                        query: "INSERT INTO Pastes VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        params: [
                            pack.version,
                            "", // an empty EditPassword essentially makes this paste uneditable without server access
                            //     this is because, by default, both the server and the client prevent paste passwords
                            //     that are less than 5 characters, so this isn't possible unless the server created it
                            "v", // a custom URL is required to be more than 2 characters by client and server, this is
                            //      basically just the same thing we did above with the EditPassword
                            "",
                            new Date().toUTCString(), // PubDate
                            new Date().toUTCString(), // EditDate
                            "server",
                            "", // same deal as EditPassword
                        ],
                        transaction: true,
                        use: "Prepare",
                    });

                    storedVersion = await this.GetPasteFromURL("v");
                }

                if (storedVersion!.Content !== pack.version) {
                    // update version, this means that we are running a different version
                    // than the version file contains
                    storedVersion!.Content = pack.version;

                    await SQL.QueryOBJ({
                        db: db,
                        query: "UPDATE Pastes SET (Content, EditDate) = (?, ?) WHERE CustomURL = ?",
                        params: [
                            storedVersion!.Content,
                            new Date().toUTCString(), // new edit date
                            storedVersion!.CustomURL,
                        ],
                        transaction: true,
                        use: "Prepare",
                    });
                }
            }
        })();
    }

    /**
     * @method GetConfig
     *
     * @static
     * @return {Promise<Config>}
     * @memberof EntryDB
     */
    public static async GetConfig(): Promise<Config | undefined> {
        // make sure config exists
        if (!(await Bun.file(EntryDB.ConfigLocation).exists())) {
            // @ts-ignore - (most) values are prefilled when undefined anyways
            EntryDB.config = { name: "Entry", app: { auto_tag: false } };
            return undefined; // still return undefined so setup runs
        }

        // get config
        const config = await Bun.file(EntryDB.ConfigLocation).json();

        // store config
        EntryDB.config = config;

        // return config
        return config;
    }

    // inits

    /**
     * @method CreateExpiry
     *
     * @static
     * @return {Promise<void>}
     * @memberof EntryDB
     */
    public static async CreateExpiry(): Promise<void> {
        // check if expiry already exists
        if (EntryDB.Expiry) return;

        // create expiry
        EntryDB.Expiry = new Expiry(new this());

        // create expiry store
        await EntryDB.Expiry.Initialize(
            path.resolve(EntryDB.DataDirectory, "expiry")
        );

        // check if expiry is disabled
        // we're still going to create the expiry store if expiry is disabled,
        // we just won't run any checks on it
        await EntryDB.GetConfig();
        if (EntryDB.config.app && EntryDB.config.app.enable_expiry === false) return;

        // run expiry clock
        setInterval(async () => {
            await EntryDB.Expiry.CheckExpiry();
        }, 1000 * 60); // run every minute
    }

    /**
     * @method InitLogs
     * @description Create LogDB
     *
     * @static
     * @return {Promise<void>}
     * @memberof EntryDB
     */
    public static async InitLogs(): Promise<void> {
        if (!EntryDB.config.log || EntryDB.Logs) return;

        // init logs
        EntryDB.Logs = new LogDB();

        // delete bot sessions
        if (EntryDB.config.log.events.includes("session")) {
            const BotSessions = await EntryDB.Logs.QueryLogs(
                'Content LIKE "%bot%" OR Content LIKE "%compatible%"'
            );

            for (const session of BotSessions[2]) EntryDB.Logs.DeleteLog(session.ID);

            // log (only if there were multiple bot sessions)
            if (BotSessions[2].length > 1)
                console.log(`Deleted ${BotSessions[2].length} bot sessions`);
        }

        // start logs interval
        // runs every day, checks sessions to see if it has been more than two months
        // since they were created. deletes session if it's expired
        const CheckSessions = async () => {
            for (const log of (
                await EntryDB.Logs.QueryLogs('Type = "session"')
            )[2]) {
                // get dates
                const Created = new Date(log.Timestamp);
                const Now = new Date();

                // subtract milliseconds
                const Difference = Now.getTime() - Created.getTime();

                // if difference is more than two months, delete log (invalidating the session)
                if (Difference > 1000 * 60 * 60 * 24 * 64) {
                    console.log(`Removing session "${log.ID}" (maximum age)`);
                    EntryDB.Logs.DeleteLog(log.ID);
                }
            }
        };

        setInterval(CheckSessions, 1000 * 60 * 60 * 24); // run every day
        CheckSessions(); // initial run
    }

    /**
     * @method InitMedia
     *
     * @static
     * @return {Promise<any>}
     * @memberof EntryDB
     */
    public static async InitMedia(): Promise<any> {
        if (
            !EntryDB.config ||
            !EntryDB.config.app ||
            !EntryDB.config.app.media ||
            EntryDB.config.app.media.enabled === false
        )
            return;

        // create db
        EntryDB.Media = new Media(new this());
        EntryDB.Media.Initialize();

        // return
        return EntryDB.Media;
    }

    // pastes

    /**
     * @method ValidatePasteLengths
     * @description Validate the length of the fields in a paste
     *
     * @private
     * @static
     * @param {Paste} PasteInfo
     * @return {[boolean, string]} [okay, reason]
     * @memberof EntryDB
     */
    private static ValidatePasteLengths(PasteInfo: Paste): [boolean, string] {
        // validate lengths

        // check more than maximum
        // ...content
        if (PasteInfo.Content.length >= EntryDB.MaxContentLength)
            return [
                false,
                `Content must be less than ${EntryDB.MaxContentLength} characters!`,
            ];
        // ...edit password
        else if (PasteInfo.EditPassword.length >= EntryDB.MaxPasswordLength)
            return [
                false,
                `Edit password must be less than ${EntryDB.MaxPasswordLength} characters!`,
            ];
        // ...custom url
        else if (PasteInfo.CustomURL.length >= EntryDB.MaxCustomURLLength)
            return [
                false,
                `Custom URL must be less than ${EntryDB.MaxCustomURLLength} characters!`,
            ];
        // ...view password
        else if (
            PasteInfo.ViewPassword &&
            PasteInfo.ViewPassword.length >= EntryDB.MaxPasswordLength
        )
            return [
                false,
                `View password must be less than ${EntryDB.MaxPasswordLength} characters!`,
            ];
        // ...group
        else if (
            PasteInfo.GroupName &&
            PasteInfo.GroupName.length >= EntryDB.MaxCustomURLLength
        )
            return [
                false,
                `Group name must be less than ${EntryDB.MaxCustomURLLength} characters!`,
            ];
        else if (
            PasteInfo.GroupSubmitPassword &&
            PasteInfo.GroupSubmitPassword.length >= EntryDB.MaxPasswordLength
        )
            return [
                false,
                `Group submit password must be less than ${EntryDB.MaxPasswordLength} characters!`,
            ];
        // check less than minimum
        // ...content
        else if (PasteInfo.Content.length <= EntryDB.MinContentLength)
            return [
                false,
                `Content must be more than ${EntryDB.MinContentLength} characters!`,
            ];
        // ...edit password
        else if (PasteInfo.EditPassword.length <= EntryDB.MinPasswordLength)
            return [
                false,
                `Edit password must be more than ${EntryDB.MinPasswordLength} characters!`,
            ];
        // ...custom url
        else if (PasteInfo.CustomURL.length <= EntryDB.MinCustomURLLength)
            return [
                false,
                `Custom URL must be more than ${EntryDB.MinCustomURLLength} characters!`,
            ];
        // ...view password
        else if (
            PasteInfo.ViewPassword &&
            PasteInfo.ViewPassword.length <= EntryDB.MinPasswordLength
        )
            return [
                false,
                `View password must be more than ${EntryDB.MinPasswordLength} characters!`,
            ];
        // ...group
        else if (
            PasteInfo.GroupName &&
            PasteInfo.GroupName.length <= EntryDB.MinCustomURLLength
        )
            return [
                false,
                `Group name must be more than ${EntryDB.MinCustomURLLength} characters!`,
            ];
        else if (
            PasteInfo.GroupSubmitPassword &&
            PasteInfo.GroupSubmitPassword.length <= EntryDB.MinPasswordLength
        )
            return [
                false,
                `Group submit password must be more than ${EntryDB.MinPasswordLength} characters!`,
            ];

        return [true, ""];
    }

    /**
     * @method GetPasteFromURL
     *
     * @param {string} PasteURL
     * @param [SkipExtras=false]
     * @return {(Promise<Paste | undefined>)}
     * @memberof EntryDB
     */
    public GetPasteFromURL(
        PasteURL: string,
        SkipExtras: boolean = false
    ): Promise<Partial<Paste> | undefined> {
        return new Promise(async (resolve) => {
            // check if paste is from another server
            const server = PasteURL.split(":")[1];

            if (!server) {
                // ...everything after this assumes paste is NOT from another server, as the
                // logic for the paste being from another server SHOULD have been handled above!

                // get paste from local db
                const record = (await SQL.QueryOBJ({
                    db: this.db,
                    query: "SELECT * FROM Pastes WHERE CustomURL = ?",
                    params: [PasteURL.toLowerCase()],
                    get: true,
                    use: "Query",
                })) as Paste;

                if (!record) return resolve(undefined); // don't reject because we want this to be treated like an async function

                // update encryption values
                if (record.ViewPassword && !SkipExtras) {
                    const encryption = await SQL.QueryOBJ({
                        db: this.db,
                        query: "SELECT * FROM Encryption WHERE ViewPassword = ? AND CustomURL = ?",
                        params: [record.ViewPassword, record.CustomURL],
                        get: true,
                        use: "Prepare",
                    });

                    record.ENC_IV = encryption.ENC_IV;
                    record.ENC_KEY = encryption.ENC_KEY;
                    record.ENC_CODE = encryption.ENC_CODE;
                }

                // update expiry information
                if (EntryDB.Expiry && EntryDB.StaticInit && !SkipExtras) {
                    const expires = await EntryDB.Expiry.GetExpiryDate(
                        record.CustomURL
                    );

                    if (expires[0]) record.ExpireOn = expires[1]!.toUTCString();
                }

                // count views
                if (
                    EntryDB.config.log &&
                    EntryDB.config.log.events.includes("view_paste") &&
                    EntryDB.Logs &&
                    !SkipExtras
                )
                    record.Views = (
                        await EntryDB.Logs.QueryLogs(
                            `Content LIKE "${record.CustomURL.replaceAll(
                                "_",
                                "\\_"
                            )};%" ESCAPE "\\"`
                        )
                    )[2].length;

                // count comments
                if (EntryDB.Logs) {
                    const comments = await SQL.QueryOBJ({
                        db: this.db,
                        query: "SELECT CustomURL FROM Pastes WHERE CustomURL LIKE ?",
                        params: [`c.${record.CustomURL.replaceAll("/", "_")}-%`],
                        all: true,
                        transaction: true,
                        use: "Prepare",
                    });

                    record.Comments = comments.length;
                } else record.Comments = 0;

                // remove metadata
                const [RealContent, _Metadata] = record.Content.split("_metadata:");

                record.Content = RealContent;

                if (_Metadata) record.Metadata = BaseParser.parse(_Metadata) as any;
                else
                    record.Metadata = {
                        Version: 1,
                        Owner: "",
                    };

                // if record.Metadata contains an owner, but that owner record does not exist
                // ...remove record.Metadata.owner (this will also allow value to be overwritten)
                if (record.Metadata && record.Metadata.Owner) {
                    // get owner record
                    const Owner = (await SQL.QueryOBJ({
                        db: this.db,
                        query: "SELECT CustomURL FROM Pastes WHERE CustomURL = ?",
                        params: [record.Metadata.Owner],
                        get: true,
                        use: "Prepare",
                    })) as Paste;

                    // if !Owner, remove from metadata
                    if (!Owner) record.Metadata.Owner = "";
                }

                // return
                return resolve(record);
            } else {
                // ...everything after this assumes paste IS from another server!

                // just send a /api/get request to the other server
                if (server.startsWith("%")) return resolve(undefined);
                const request = fetch(
                    `https://${server}/api/raw/${PasteURL.split(":")[0]}`
                );

                // handle bad
                request.catch(() => {
                    return resolve(undefined);
                });

                // get record
                const record = await request;

                // handle bad (again)
                if (!record.headers.get("Content-Type")!.includes("text/plain"))
                    return resolve(undefined);

                // get body
                const text =
                    server !== "rentry.co"
                        ? await record.text()
                        : (await record.json()).content;

                // return
                if (record.ok)
                    return resolve({
                        CustomURL: PasteURL,
                        Content: text,
                        PubDate: parseFloat(
                            (await request).headers.get("X-Paste-PubDate") ||
                                new Date().getTime().toString()
                        ),
                        EditDate: parseFloat(
                            (await request).headers.get("X-Paste-EditDate") ||
                                new Date().getTime().toString()
                        ),
                        GroupName:
                            (await request).headers.get("X-Paste-GroupName") || "",
                        HostServer: server,
                        Views: 0,
                    });
                else return resolve(undefined);
            }
        });
    }

    /**
     * @method CreatePaste
     *
     * @param {Paste} PasteInfo
     * @param {boolean} SkipHash used for import, skip hashing passwords (useful if they're already hashed)
     * @return {Promise<[boolean, string, Paste]>}
     * @memberof EntryDB
     */
    public async CreatePaste(
        PasteInfo: Paste,
        SkipHash: boolean = false
    ): Promise<[boolean, string, Paste]> {
        // if custom url was not provided, randomize it
        if (!PasteInfo.CustomURL)
            PasteInfo.CustomURL = ComputeRandomObjectHash().substring(0, 9);

        // if edit password was not provided, randomize it
        if (!SkipHash)
            if (!PasteInfo.EditPassword) {
                PasteInfo.UnhashedEditPassword = crypto
                    .randomBytes(EntryDB.MinPasswordLength)
                    .toString("hex");

                PasteInfo.EditPassword = `${PasteInfo.UnhashedEditPassword}`;
            } else PasteInfo.UnhashedEditPassword = `${PasteInfo.EditPassword}`;
        // if we don't need to hash the editpassword, just set unhashed to hashed
        else PasteInfo.UnhashedEditPassword = PasteInfo.EditPassword;

        // check custom url
        if (!PasteInfo.CustomURL.match(EntryDB.URLRegex))
            return [
                false,
                `Custom URL does not pass test: ${EntryDB.URLRegex}`,
                PasteInfo,
            ];

        // check group name
        if (PasteInfo.GroupName && !PasteInfo.GroupName.match(EntryDB.URLRegex))
            return [
                false,
                `Group name does not pass test: ${EntryDB.URLRegex}`,
                PasteInfo,
            ];

        // hash passwords
        if (!SkipHash) {
            PasteInfo.EditPassword = CreateHash(PasteInfo.EditPassword);

            if (PasteInfo.ViewPassword)
                PasteInfo.ViewPassword = CreateHash(PasteInfo.ViewPassword);

            if (PasteInfo.GroupSubmitPassword)
                PasteInfo.GroupSubmitPassword = CreateHash(
                    PasteInfo.GroupSubmitPassword
                );
        }

        // validate lengths
        const lengthsValid = EntryDB.ValidatePasteLengths(PasteInfo);
        if (!lengthsValid[0]) return [...lengthsValid, PasteInfo];

        // if there is a group name, there must be a group password (and vice versa)
        if (PasteInfo.GroupName && !PasteInfo.GroupSubmitPassword)
            return [
                false,
                "There must be a group submit password provided if there is a group name provided!",
                PasteInfo,
            ];
        else if (PasteInfo.GroupSubmitPassword && !PasteInfo.GroupName)
            return [
                false,
                "There must be a group name provided if there is a group submit password provided!",
                PasteInfo,
            ];

        // check if group already exists, i it does make sure the password matches
        // groups don't really have a table for themselves, more of just if a paste
        // with that group name already exists!
        if (PasteInfo.GroupName) {
            const GroupRecord = (await SQL.QueryOBJ({
                db: this.db,
                query: "SELECT * From Pastes WHERE GroupName = ?",
                params: [PasteInfo.GroupName],
                get: true, // only return 1
                transaction: true,
                use: "Prepare",
            })) as Paste | undefined;

            if (
                GroupRecord &&
                // it's safe to assume PasteInfo.GroupSubmitPassword exists becauuse we
                // required it in the previous step, it was also hashed previously!
                PasteInfo.GroupSubmitPassword! !== GroupRecord.GroupSubmitPassword
            )
                return [
                    false,
                    "Please use the correct paste group password!",
                    PasteInfo,
                ];

            // check group name (again)
            // it can't be anything that exists in Server.ts
            // ...this is because of the thing we do after this!
            // if we didn't check this and the paste had the group of admin or something,
            // somebody could make a paste named "login" and the paste would have the URL
            // of "/admin/login" which would make the real admin login page either inaccessible
            // OR make the paste inaccessible!
            const NotAllowed = [
                "admin",
                "api",
                "search",
                "new",
                "paste",
                "group",
                "reports",
                "components",
            ];

            if (NotAllowed.includes(PasteInfo.GroupName))
                return [
                    false,
                    `Group name cannot be any of the following: ${JSON.stringify(
                        NotAllowed
                    )}`,
                    PasteInfo,
                ];
            else if (NotAllowed.includes(PasteInfo.CustomURL))
                return [
                    false,
                    `Paste name cannot be any of the following: ${JSON.stringify(
                        NotAllowed
                    )}`,
                    PasteInfo,
                ];

            // append group name to CustomURL
            PasteInfo.CustomURL = `${PasteInfo.GroupName}/${PasteInfo.CustomURL}`;
        }

        // make sure a paste does not already exist with this custom URL
        if (await this.GetPasteFromURL(PasteInfo.CustomURL))
            return [
                false,
                "A paste with this custom URL already exists!",
                PasteInfo,
            ];

        // encrypt (if needed)
        if (PasteInfo.ViewPassword) {
            const result = Encrypt(PasteInfo.Content.split("_metadata:")[0]);
            if (!result) return [false, "Encryption error!", PasteInfo];

            PasteInfo.Content = result[0];

            // encryption values are stored in a different table
            await SQL.QueryOBJ({
                db: this.db,
                query: "INSERT INTO Encryption VALUES (?, ?, ?, ?, ?)",
                params: [
                    PasteInfo.ViewPassword,
                    PasteInfo.CustomURL,
                    result[2], // iv
                    result[1], // key
                    result[3], // code
                ],
                transaction: true,
                use: "Prepare",
            });
        }

        // create expiry record if it is needed
        if (PasteInfo.ExpireOn)
            await EntryDB.Expiry.AddPasteExpiry(
                PasteInfo.CustomURL,
                PasteInfo.ExpireOn
            );

        // create metadata
        const metadata: PasteMetadata = {
            Version: 1,
            Owner: PasteInfo.Associated || "",
            Comments: {
                Enabled: true,
            },
        };

        // get owner paste (if it exists)
        if (PasteInfo.Associated) {
            const Associated = await this.GetPasteFromURL(PasteInfo.Associated);

            if (Associated && Associated.Metadata && Associated.Metadata.Locked)
                return [
                    false,
                    "This paste is locked and cannot be used as an association at this time.",
                    PasteInfo,
                ];
        }

        // if paste is a comment, create the respective log entry and set groupname to "comments"
        if (PasteInfo.CommentOn) {
            // get the paste we're commenting on
            const CommentingOn = await this.GetPasteFromURL(PasteInfo.CommentOn);

            // make sure it exists
            if (CommentingOn) {
                PasteInfo.CustomURL = `c.${CommentingOn.CustomURL!.replaceAll(
                    "/",
                    "_"
                )}-${PasteInfo.CustomURL}`;

                if (PasteInfo.Associated)
                    PasteInfo.Associated = `;${PasteInfo.Associated}`;

                // update metadata
                metadata.Comments = {
                    IsCommentOn: PasteInfo.CommentOn,
                    ParentCommentOn: (CommentingOn.CustomURL!.split("c.")[1]
                        ? CommentingOn.CustomURL!.split("c.")[1]
                        : CommentingOn.CustomURL)!.split("-")[0],
                    Enabled: true,
                    IsPrivateMessage: PasteInfo.IsPM === "true",
                };

                // check comments filter
                if (
                    CommentingOn.Metadata &&
                    CommentingOn.Metadata.Comments &&
                    CommentingOn.Metadata.Comments.Filter
                )
                    for (const BadWord of CommentingOn.Metadata.Comments.Filter.split(
                        ","
                    ))
                        if (PasteInfo.Content.includes(BadWord))
                            return [
                                false,
                                "Comment violates paste's comment filter!",
                                PasteInfo,
                            ];

                // create notification for CommentingOn.Metadata.Owner
                if (PasteInfo.Associated && PasteInfo.Associated.startsWith(";"))
                    PasteInfo.Associated = PasteInfo.Associated.slice(1);

                if (
                    // make sure we're commenting on a paste with an owner
                    CommentingOn.Metadata &&
                    CommentingOn.Metadata.Owner &&
                    // make sure we're not commenting on our own paste
                    PasteInfo.Associated !== CommentingOn.Metadata.Owner
                ) {
                    // get commenting on paste session
                    // (only create a notification for pastes that somebody is associated with!)
                    const MentionSession = (
                        await EntryDB.Logs.QueryLogs(
                            `Type = "session" AND Content LIKE "%;_with;${CommentingOn.Metadata.Owner}"`
                        )
                    )[2][0];

                    if (MentionSession)
                        // create notification
                        await EntryDB.Logs.CreateLog({
                            Type: "notification",
                            // notification paste must start with "paste/comments/"
                            // so that the notif dashboard understands this is a new comment!
                            Content: `paste/comments/${CommentingOn.CustomURL};${CommentingOn.Metadata.Owner}`,
                        });
                }
            }
        }

        // if paste is a report, create the respective log entry and set groupname to "reports"
        if (PasteInfo.ReportOn) {
            // set group
            PasteInfo.GroupName = "reports";
            PasteInfo.CustomURL = `reports/${PasteInfo.CustomURL}`;

            // create log
            await EntryDB.Logs.CreateLog({
                Type: "report",
                Content: `create;${PasteInfo.ReportOn};${PasteInfo.CustomURL}`,
            });
        }

        // create notifications for mentioned users
        const Mentioned: string[] = []; // list of mentioned pastes
        if (EntryDB.config.log && EntryDB.config.log.events.includes("notification"))
            for (const match of PasteInfo.Content.matchAll(
                /(\.\/)(?<NAME>.*?)(?<END>\s|\n)/gm
            )) {
                if (!match.groups) continue;
                if (Mentioned.includes(match.groups.NAME)) continue; // don't double mention
                Mentioned.push(match.groups.NAME);

                // get mentioning paste session
                // (only create a notification for pastes that somebody is associated with!)
                const MentionSession = (
                    await EntryDB.Logs.QueryLogs(
                        `Type = "session" AND Content LIKE "%;_with;${match.groups.NAME}"`
                    )
                )[2][0];

                if (!MentionSession) continue;

                // create notification
                await EntryDB.Logs.CreateLog({
                    Type: "notification",
                    Content: `${PasteInfo.CustomURL};${match.groups.NAME}`,
                });
            }

        // add metadata
        PasteInfo.Content += `_metadata:${BaseParser.stringify(metadata)}`;

        // create paste
        await SQL.QueryOBJ({
            db: this.db,
            query: "INSERT INTO Pastes VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params: [
                PasteInfo.Content,
                PasteInfo.EditPassword,
                PasteInfo.CustomURL,
                PasteInfo.ViewPassword,
                new Date().getTime(), // PubDate
                new Date().getTime(), // EditDate
                PasteInfo.GroupName || "",
                PasteInfo.GroupSubmitPassword || "",
            ],
            transaction: true,
            use: "Prepare",
        });

        // get server config
        const config = (await EntryDB.GetConfig()) as Config;

        // register event
        if (config.log && config.log.events.includes("create_paste"))
            await EntryDB.Logs.CreateLog({
                Content: PasteInfo.CustomURL,
                Type: "create_paste",
            });

        // gc
        Bun.gc(true);

        // return
        return [true, "Paste created!", PasteInfo];
    }

    /**
     * @method EditPaste
     *
     * @param {Paste} PasteInfo
     * @param {Paste} NewPasteInfo
     * @param {boolean} Force
     * @return {Promise<[boolean, string, Paste]>}
     * @memberof EntryDB
     */
    public async EditPaste(
        PasteInfo: Paste,
        NewPasteInfo: Paste,
        Force: boolean = false
    ): Promise<[boolean, string, Paste]> {
        // check if paste is from another server
        const server = PasteInfo.CustomURL.split(":")[1];

        if (server) {
            PasteInfo.CustomURL = PasteInfo.CustomURL.split(":")[0].toLowerCase();

            NewPasteInfo.CustomURL =
                NewPasteInfo.CustomURL.split(":")[0].toLowerCase();

            // send request
            const [isBad, record] = await this.ForwardRequest(
                server,
                "edit",
                [
                    `OldContent=${PasteInfo.Content}`,
                    `EditPassword=${PasteInfo.EditPassword}`,
                    `OldURL=${PasteInfo.CustomURL}`,
                    // new
                    `Content=${NewPasteInfo.Content}`,
                    `NewEditPassword=${NewPasteInfo.EditPassword}`,
                    `NewURL=${NewPasteInfo.CustomURL.split(":")[0]}`,
                ],
                "POST",
                true
            );

            // check if promise rejected
            if (isBad) return [false, "Connection failed", NewPasteInfo];

            // add host back to custom url
            NewPasteInfo.CustomURL = `${NewPasteInfo.CustomURL}:${server}`;

            // return
            const err = this.GetErrorFromResponse(record);

            return [
                err === null || err === undefined,
                err || "Paste updated!",
                NewPasteInfo,
            ];
        }

        // ...everything after this assumes paste is NOT from another server, as the
        // logic for the paste being from another server SHOULD have been handled above!

        // we're not allowing users to change ViewPasswords currently

        // make sure a paste exists
        const paste = await this.GetPasteFromURL(PasteInfo.CustomURL);
        if (!paste) return [false, "This paste does not exist!", NewPasteInfo];

        // hash passwords
        PasteInfo.EditPassword = CreateHash(PasteInfo.EditPassword);

        if (NewPasteInfo.EditPassword)
            NewPasteInfo.EditPassword = CreateHash(NewPasteInfo.EditPassword);
        else NewPasteInfo.EditPassword = CreateHash(paste.EditPassword as string);

        // validate lengths
        const lengthsValid = EntryDB.ValidatePasteLengths(NewPasteInfo);
        if (!lengthsValid[0]) return [...lengthsValid, NewPasteInfo];

        if (
            !NewPasteInfo.CustomURL.match(EntryDB.URLRegex) &&
            NewPasteInfo.CustomURL !== PasteInfo.CustomURL // we're doing this so that if
            //                                                the custom url is invalid because
            //                                                of the group name append thing,
            //                                                users will still be able to edit this paste!
        )
            return [
                false,
                `Custom URL does not pass test: ${EntryDB.URLRegex}`,
                PasteInfo,
            ];

        // make sure paste isn't locked
        if (paste.Metadata && paste.Metadata.Locked === true && Force === false)
            return [
                false,
                "This paste has been locked by a server administrator.",
                NewPasteInfo,
            ];

        // validate password
        // don't use NewPasteInfo to get the password because NewPasteInfo will automatically have the old password
        // if a new password is not supplied. this is done on the server in API.EditPaste
        // paste is the version of the paste stored in the server, so the client cannot have messed with it
        // that means it is safe to compare with what we got from the client
        // ...comparing paste.EditPassword and PasteInfo.EditPassword because if we DID supply a new password,
        // PasteInfo will not have it, only NewPasteInfo will
        if (
            paste.EditPassword !== PasteInfo.EditPassword &&
            PasteInfo.EditPassword !== CreateHash(EntryDB.config.admin)
        )
            return [false, "Invalid password!", NewPasteInfo];

        // if custom url was changed, add the group back to it
        // ...users cannot add the group manually because of the custom url regex
        if (NewPasteInfo.CustomURL !== paste.CustomURL) {
            // add groupname
            if (paste.GroupName)
                NewPasteInfo.CustomURL = `${paste.GroupName}/${NewPasteInfo.CustomURL}`;

            // make sure the paste we're changing to doesn't already exist
            const _existingPaste = await this.GetPasteFromURL(
                NewPasteInfo.CustomURL
            );

            if (_existingPaste)
                return [
                    false,
                    "Cannot change url to a url that is already taken!",
                    PasteInfo, // return old paste info because we didn't actually update anything!!
                ];

            // ALSO... delete all view_paste logs that have to do with the old URL
            await SQL.QueryOBJ({
                db: EntryDB.Logs.db,
                query: 'DELETE FROM Logs WHERE Type = "view_paste" AND Content LIKE ?',
                params: [`%${paste.CustomURL}%`],
                use: "Prepare",
            });
        }

        // rencrypt (if needed, again)
        if (NewPasteInfo.ViewPassword) {
            // using NewPasteInfo for all of these values because PasteInfo doesn't actually
            // really matter for this, as the content is only defined in NewPasteInfo
            const result = Encrypt(NewPasteInfo.Content);
            if (!result) return [false, "Encryption error!", NewPasteInfo];

            NewPasteInfo.Content = result[0];

            // update encryption
            // we select by ViewPassword for the Encryption table
            await SQL.QueryOBJ({
                db: this.db,
                query: "UPDATE Encryption SET (ENC_IV, ENC_KEY, ENC_CODE, CustomURL) = (?, ?, ?, ?) WHERE ViewPassword = ? AND CustomURL = ?",
                params: [
                    result[2], // iv
                    result[1], // key
                    result[3], // code
                    NewPasteInfo.CustomURL, // update with new CustomURL
                    paste.ViewPassword,
                    paste.CustomURL, // use old custom URL to select encryption
                ],
                use: "Prepare",
            });
        }

        // update paste
        await SQL.QueryOBJ({
            db: this.db,
            query: "UPDATE Pastes SET (Content, EditPassword, CustomURL, ViewPassword, PubDate, EditDate) = (?, ?, ?, ?, ?, ?) WHERE CustomURL = ?",
            params: [
                NewPasteInfo.Content,
                NewPasteInfo.EditPassword,
                NewPasteInfo.CustomURL,
                NewPasteInfo.ViewPassword,
                NewPasteInfo.PubDate,
                NewPasteInfo.EditDate,
                PasteInfo.CustomURL, // select by old CustomURL
            ],
            use: "Prepare",
        });

        // get server config
        const config = (await EntryDB.GetConfig()) as Config;

        // register event
        if (config.log && config.log.events.includes("edit_paste"))
            await EntryDB.Logs.CreateLog({
                Content: `${PasteInfo.CustomURL}->${NewPasteInfo.CustomURL}`,
                Type: "edit_paste",
            });

        // return
        return [true, "Paste updated!", NewPasteInfo];
    }

    /**
     * @method DeletePaste
     *
     * @param {Paste} PasteInfo
     * @param {string} password
     * @return {Promise<[boolean, string, Paste]>}
     * @memberof EntryDB
     */
    public async DeletePaste(
        PasteInfo: Partial<Paste>,
        password: string
    ): Promise<[boolean, string, Partial<Paste>]> {
        if (!PasteInfo.CustomURL) return [false, "Missing CustomURL", PasteInfo];

        // check if paste is from another server
        const server = PasteInfo.CustomURL.split(":")[1];

        if (server) {
            // we aren't checking for admin password here or anything because it shouldn't
            // be provided because the admin panel cannot show federated pastes

            // send request
            const [isBad, record] = await this.ForwardRequest(
                server,
                "delete",
                [
                    `CustomURL=${PasteInfo.CustomURL.split(":")[0]}`,
                    `password=${password}`,
                ],
                "POST",
                true
            );

            // check if promise rejected
            if (isBad) return [false, "Connection failed", PasteInfo];

            // return
            const err = this.GetErrorFromResponse(record);
            return [
                err === null || err === undefined,
                err ? err : "Paste deleted!",
                PasteInfo,
            ];
        }

        // ...everything after this assumes paste is NOT from another server, as the
        // logic for the paste being from another server SHOULD have been handled above!

        // get paste
        const paste = await this.GetPasteFromURL(PasteInfo.CustomURL);

        // make sure a paste exists
        if (!paste) return [false, "This paste does not exist!", PasteInfo];

        // make sure paste isn't locked
        if (paste.Metadata && paste.Metadata.Locked === true)
            return [
                false,
                "This paste has been locked by a server administrator.",
                PasteInfo,
            ];

        // make sure paste is not "v" (version paste)
        if (paste.CustomURL === "v")
            return [false, "Cannot delete version paste!", PasteInfo];

        // validate password
        // ...password can be either the paste EditPassword or the server admin password
        // ...if the custom url is v, then no password can be used (that's the version file, it is required)
        if (
            (password !== EntryDB.config.admin &&
                CreateHash(password) !== paste.EditPassword) ||
            paste.CustomURL === "v"
        )
            return [false, "Invalid password!", PasteInfo];

        // if paste is encrypted, delete the encryption values too
        if (paste.ViewPassword) {
            await SQL.QueryOBJ({
                db: this.db,
                query: "DELETE FROM Encryption WHERE ViewPassword = ? AND CustomURL = ?",
                params: [paste.ViewPassword, paste.CustomURL],
                use: "Prepare",
            });
        }

        // delete paste
        await SQL.QueryOBJ({
            db: this.db,
            query: "DELETE FROM Pastes WHERE CustomURL = ?",
            params: [PasteInfo.CustomURL],
            use: "Prepare",
        });

        // delete media
        if (EntryDB.Media) await EntryDB.Media.DeleteOwner(PasteInfo.CustomURL);

        // register event
        if (EntryDB.config.log && EntryDB.config.log.events.includes("delete_paste"))
            await EntryDB.Logs.CreateLog({
                Content: PasteInfo.CustomURL,
                Type: "delete_paste",
            });

        // delete all views
        if (EntryDB.config.log && EntryDB.config.log.events.includes("view_paste")) {
            const views = await EntryDB.Logs.QueryLogs(
                `Type = "view_paste" AND Content LIKE "${PasteInfo.CustomURL};%"`
            );

            for (const view of views[2]) await EntryDB.Logs.DeleteLog(view.ID);
        }

        // return
        return [true, "Paste deleted!", PasteInfo];
    }

    /**
     * @method ForwardRequest
     * @description Forward an endpoint request to another server
     *
     * @private
     * @param {string} server
     * @param {string} endpoint
     * @param {string[]} body
     * @param [method="POST"]
     * @param [https=true]
     * @return {Promise<[boolean, Response]>} [isBad, record]
     * @memberof EntryDB
     */
    public async ForwardRequest(
        server: string,
        endpoint: string,
        body: string[],
        method: string = "POST",
        https: boolean = true
    ): Promise<[boolean, Response]> {
        // send request
        const request = fetch(
            `${https === true ? "https" : "http"}://${server}/api/${endpoint}`,
            {
                body: method !== "GET" ? body.join("&") : "",
                method,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        // handle bad
        let isBad = false;
        request.catch(() => {
            isBad = true;
        });

        // get record
        const record = await request;

        // return
        return [isBad, record];
    }

    /**
     * @method GetErrorFromRequest
     * @description This is needed because depending on how fast your code is executed,
     * the request might resolve all the way to the redirect, or it might not
     *
     * @private
     * @param {Response} response
     * @return {(string | undefined | null)}
     * @memberof EntryDB
     */
    private GetErrorFromResponse(response: Response): string | undefined | null {
        if (response.headers.get("Location")) {
            // get from location
            return new URLSearchParams(
                new URL(response.headers.get("Location")!).search
            ).get("err")!;
        } else {
            // get from url
            return new URLSearchParams(new URL(response.url).search).get("err");
        }
    }

    /**
     * @function GetEncryptionInfo
     *
     * @param {string} ViewPassword Must be hashed before
     * @param {string} CustomURL
     * @return {Promise<
     *         [
     *             boolean,
     *             {
     *                 iv: string;
     *                 key: string;
     *                 auth: string;
     *             }
     *         ]
     *     >}
     * @memberof EntryDB
     */
    public async GetEncryptionInfo(
        ViewPassword: string,
        CustomURL: string
    ): Promise<
        [
            boolean,
            {
                iv: string;
                key: string;
                auth: string;
            },
        ]
    > {
        // get encryption values by view password and customurl
        const record = (await SQL.QueryOBJ({
            db: this.db,
            query: `SELECT * FROM Encryption WHERE ViewPassword = ? AND CustomURL = ?`,
            params: [ViewPassword, CustomURL],
            get: true,
            use: "Prepare",
        })) as Paste | undefined;

        // check if paste exists
        if (!record)
            return [
                false,
                {
                    iv: "",
                    key: "",
                    auth: "",
                },
            ];

        // return
        return [
            true,
            {
                iv: record.ENC_IV as string,
                key: record.ENC_KEY as string,
                auth: record.ENC_CODE as string,
            },
        ];
    }

    /**
     * @method CleanPaste
     *
     * @param {Paste} paste
     * @return {*}  {Paste}
     * @memberof EntryDB
     */
    public CleanPaste(paste: Paste): Paste {
        paste.EditPassword = "";

        if (paste.ViewPassword) paste.ViewPassword = "exists";
        // set to "exists" so the server understands the paste is private
        else paste.ViewPassword = "";

        delete paste.ENC_IV;
        delete paste.ENC_KEY;
        delete paste.ENC_CODE;

        delete paste.GroupSubmitPassword;

        // return
        return paste;
    }

    /**
     * @method GetAllPastes
     * @description Return all (public) pastes in the database
     *
     * @static
     * @param {boolean} includePrivate
     * @memberof EntryDB
     */
    public async GetAllPastes(
        includePrivate: boolean = false,
        removeInfo: boolean = true,
        sql?: string
    ): Promise<Paste[]> {
        // get pastes
        const pastes = await SQL.QueryOBJ({
            db: this.db,
            query: `SELECT * From Pastes WHERE ${
                sql || "CustomURL IS NOT NULL LIMIT 500"
            }`,
            all: true,
            transaction: true,
            use: "Prepare",
        });

        // remove passwords from pastes
        if (removeInfo)
            for (let paste of pastes as Paste[]) {
                // clean paste
                paste = this.CleanPaste(paste);

                // get paste metadata
                const [RealContent, _Metadata] = paste.Content.split("_metadata:");

                paste.Content = RealContent;

                if (_Metadata) paste.Metadata = BaseParser.parse(_Metadata) as any;
                else
                    paste.Metadata = {
                        Version: 1,
                        Owner: "",
                    };

                // replace paste
                pastes[pastes.indexOf(paste)] = paste;
            }

        // remove private pastes
        if (!includePrivate)
            for (let paste of pastes as Paste[])
                if (
                    paste.ViewPassword !== "" &&
                    paste.ViewPassword !== CreateHash("") &&
                    paste.ViewPassword !== "exists"
                )
                    (pastes as Paste[]).splice(pastes.indexOf(paste));

        // return
        return pastes;
    }

    /**
     * @method ImportPastes
     *
     * @param {Paste[]} _export
     * @return {Promise<[boolean, string, Paste][]>} Outputs
     * @memberof EntryDB
     */
    public async ImportPastes(
        _export: Paste[]
    ): Promise<[boolean, string, Paste][]> {
        let outputs: [boolean, string, Paste][] = [];

        // create each paste
        for (let paste of _export) {
            if (paste.GroupName)
                paste.CustomURL = paste.CustomURL.replace(`${paste.GroupName}/`, "");

            // delete existing paste if it exists
            const _paste = await this.GetPasteFromURL(paste.CustomURL);
            if (_paste) await this.DeletePaste(_paste, EntryDB.config.admin);

            // create paste
            outputs.push(await this.CreatePaste(paste, true));
        }

        // return
        return outputs;
    }

    /**
     * @method GetAllPastesInGroup
     *
     * @param {string} group
     * @return {Promise<Paste[]>}
     * @memberof EntryDB
     */
    public async GetAllPastesInGroup(
        group: string,
        limit: number = 100
    ): Promise<Paste[]> {
        // decentralization stuff
        const server = group.split(":")[1];

        if (server) {
            const [isBad, record] = await this.ForwardRequest(
                server,
                `group/${group.split(":")[0]}`,
                [],
                "GET",
                true
            );

            // check if promise rejected
            if (isBad) return [];

            // check error
            const err = this.GetErrorFromResponse(record);
            if (err) return [];

            // add server to all returned pastes
            const pastes = await record.json(); // /api/group/{group} returns [] even if the group doesn't exist

            for (let i in pastes)
                pastes[i].CustomURL = `${pastes[i].CustomURL}:${server}`;

            // return
            return pastes;
        }

        // get pastes
        const pastes = await SQL.QueryOBJ({
            db: this.db,
            query: "SELECT * From Pastes WHERE GroupName = ? LIMIT ?",
            params: [group, limit],
            all: true,
            transaction: true,
            use: "Prepare",
        });

        // remove passwords from pastes
        for (let paste of pastes as Paste[]) {
            paste = this.CleanPaste(paste);
            pastes[pastes.indexOf(paste)] = paste;
        }

        // return
        return pastes;
    }

    /**
     * @method DeletePastes
     *
     * @param {string[]} Pastes array of customurls to delete
     * @param {string} password
     * @return {Promise<[boolean, string, Partial<Paste>][]>} success, message, pastes
     * @memberof EntryDB
     */
    public async DeletePastes(
        Pastes: string[],
        password: string
    ): Promise<[boolean, string, Partial<Paste>][]> {
        const outputs = [];

        // delete pastes
        for (let paste of Pastes)
            outputs.push(
                await this.DeletePaste(
                    {
                        CustomURL: paste,
                        EditPassword: password,
                    },
                    password
                )
            );

        // return
        return outputs;
    }

    /**
     * @method DirectSQL
     *
     * @param {string} sql
     * @param {boolean} [get=false]
     * @param {boolean} [all=false]
     * @param {string} password
     * @return {Promise<[boolean, string, any?]>}
     * @memberof EntryDB
     */
    public async DirectSQL(
        sql: string,
        get: boolean = false,
        all: boolean = false,
        password: string
    ): Promise<[boolean, string, any?]> {
        // verify password
        if (password !== (await EntryDB.GetConfig())?.admin)
            return [false, "Invalid password"];

        // ...
        if (get) all = false;
        else if (all) get = false;

        // run query
        const result = await SQL.QueryOBJ({
            db: this.db,
            query: sql,
            transaction: true,
            use: "Prepare",
            get,
            all,
        });

        // return
        return [true, sql, result];
    }

    /**
     * @method GetPasteComments
     *
     * @param {string} url
     * @param {number} [offset=0]
     * @param {string} [associated]
     * @return {Promise<[boolean, string, Paste[]]>}
     * @memberof EntryDB
     */
    public async GetPasteComments(
        url: string,
        offset: number = 0,
        associated?: string
    ): Promise<[boolean, string, Paste[]]> {
        // make sure comments are enabled globally
        if (!EntryDB.config.app || EntryDB.config.app.enable_comments !== true)
            return [false, "Comments disabled globally", []];

        // make sure paste exists
        const result = (await this.GetPasteFromURL(url)) as Paste;
        if (!result) return [false, "Paste does not exist", []];

        // check if paste is from another server
        if (result.HostServer) {
            result.CustomURL = result.CustomURL.split(":")[0];

            // send request
            const [isBad, record] = await this.ForwardRequest(
                result.HostServer,
                `comments/${result.CustomURL}`,
                [],
                "GET",
                true
            );

            // check if promise rejected
            if (isBad) return [false, "Connection failed", []];

            // return
            const err = this.GetErrorFromResponse(record);
            const body = !err ? await record.json() : undefined;

            if (body) return body;
            else if (err) return [false, err, []];

            return [false, "Unknown", []];
        }

        // return false if page does not allow comments
        if (
            result.Content.includes("<% disable comments %>") ||
            (result.Metadata &&
                result.Metadata.Comments &&
                result.Metadata.Comments.Enabled === false)
        )
            return [false, "Paste has comments disabled", []];

        // get comments
        const comments: Paste[] = await SQL.QueryOBJ({
            db: this.db,
            query: `SELECT * FROM Pastes WHERE CustomURL LIKE ? ORDER BY cast(PubDate as float) DESC LIMIT 50 OFFSET ${offset}`,
            params: [`c.${result.CustomURL.replaceAll("/", "_")}-%`],
            all: true,
            transaction: true,
            use: "Query",
        });

        const CommentPastes: Paste[] = []; // we're going to store fixed comments in here

        for (const paste of comments) {
            // get paste metadata
            const [RealContent, _Metadata] = paste.Content.split("_metadata:");

            paste.Content = RealContent;

            if (_Metadata) paste.Metadata = BaseParser.parse(_Metadata) as any;
            else
                paste.Metadata = {
                    Version: 1,
                    Owner: "",
                };

            // set comment owner
            if (paste.Metadata && paste.Metadata.Owner)
                paste.Associated = paste.Metadata.Owner;

            // set paste.IsPM
            if (
                paste.Metadata &&
                paste.Metadata.Comments &&
                paste.Metadata.Comments.IsPrivateMessage
            )
                paste.IsPM = "true";

            // if we're provided with an association and paste is a pm, make sure we're
            // allowed to view this comment!
            if (
                paste.IsPM === "true" &&
                associated !== result.CustomURL &&
                result.Metadata &&
                paste.Metadata &&
                // make sure we're either the owner of the paste the comment was posted on,
                // or the owner of the comment
                (result.Metadata.Owner !== associated ||
                    associated === paste.Metadata?.Owner)
            )
                continue;

            // count sub comments (replies) (once)
            paste.Comments = (
                await SQL.QueryOBJ({
                    db: this.db,
                    query: "SELECT CustomURL FROM Pastes WHERE CustomURL LIKE ?",
                    params: [`c.${paste.CustomURL.replaceAll("/", "_")}-%`],
                    all: true,
                    transaction: true,
                    use: "Prepare",
                })
            ).length;

            // remove paste edit passwords
            const cleaned = this.CleanPaste(paste);

            // push comment
            CommentPastes.push(cleaned);
        }

        // return
        return [
            true,
            `${CommentPastes.length} result${
                CommentPastes.length === 0 || CommentPastes.length > 1 ? "s" : ""
            }`,
            CommentPastes,
        ];
    }

    // zones

    /**
     * @method InitZones
     *
     * @return {Promise<boolean>}
     * @memberof EntryDB
     */
    public static async InitZones(): Promise<boolean> {
        const ZonesDir = path.resolve(EntryDB.DataDirectory, "zones");

        // make sure zones are enabled
        if (!EntryDB.config.zones) return false;

        // create zones directory (if needed)
        if (!fs.existsSync(ZonesDir)) fs.mkdirSync(ZonesDir);

        // remove all invalid zone files (zones that don't exist in the array)
        for (const zone of fs.readdirSync(ZonesDir)) {
            // make sure zone is a .sqlite file
            if (!zone.endsWith(".sqlite")) continue;
            const ZoneName = zone.split(".sqlite")[0];

            // make sure zone is valid
            const IsValid = EntryDB.GetZone(ZoneName);
            if (IsValid) continue;

            // delete zone (and zone files)
            fs.rmSync(path.resolve(ZonesDir, zone));

            // ...WAL files
            if (fs.existsSync(path.resolve(ZonesDir, `${ZoneName}.sqlite-shm`)))
                fs.rmSync(path.resolve(ZonesDir, `${ZoneName}.sqlite-shm`));

            if (fs.existsSync(path.resolve(ZonesDir, `${ZoneName}.sqlite-wal`)))
                fs.rmSync(path.resolve(ZonesDir, `${ZoneName}.sqlite-wal`));
        }

        // create zones
        for (const zone of EntryDB.config.zones)
            if (!EntryDB.Zones[zone])
                EntryDB.Zones[zone] = new EntryDB(zone, ZonesDir, true);

        // return
        return true;
    }

    /**
     * @method GetZone
     *
     * @param {string} zone
     * @return {boolean}
     * @memberof EntryDB
     */
    public static GetZone(zone: string): boolean {
        if (!EntryDB.config.zones) return false;
        return EntryDB.config.zones.includes(zone);
    }
}
