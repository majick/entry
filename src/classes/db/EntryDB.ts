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
import PasteConnection, { Paste, PasteMetadata, Revision } from "./objects/Paste";
import SQL from "./helpers/SQL";

import Media from "./MediaDB";
import Expiry from "./Expiry";
import LogDB from "./LogDB";

import pack from "../../../package.json";
import type { Config } from "../..";

import BaseParser from "./helpers/BaseParser";
import punycode from "node:punycode";

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

    public readonly db: typeof Config.postgres | Database;
    public readonly isNew: boolean = true;
    public static PasteCache: { [key: string]: PasteConnection } = {};

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
     * @memberof EntryDB
     */
    constructor(dbname: string = "entry", dbdir?: string) {
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
        const [db, isNew] = EntryDB.config.pg
            ? [
                  SQL.CreatePostgres(
                      EntryDB.config.pg.host,
                      EntryDB.config.pg.user,
                      EntryDB.config.pg.password,
                      EntryDB.config.pg.database
                  ),
                  false,
              ]
            : SQL.CreateDB(dbname, dbdir);

        this.isNew = isNew;
        this.db = db;

        (async () => {
            await EntryDB.GetConfig(); // fill config

            // create tables
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: db,
                query: `CREATE TABLE IF NOT EXISTS "Pastes" (
                    "Content" varchar(${EntryDB.MaxContentLength}),
                    "EditPassword" varchar(${EntryDB.MaxPasswordLength}),
                    "CustomURL" varchar(${EntryDB.MaxCustomURLLength}),
                    "ViewPassword" varchar(${EntryDB.MaxPasswordLength}),
                    "PubDate" float,
                    "EditDate" float,
                    "GroupName" varchar(${EntryDB.MaxCustomURLLength}),
                    "GroupSubmitPassword" varchar(${EntryDB.MaxPasswordLength}),
                    "Metadata" varchar(${EntryDB.MaxContentLength})
                )`,
            });

            try {
                // check if "Metadata" column exists
                // I don't want to use an SQL if statement because they're stupidly ugly
                await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                    // COMPATIBILITY
                    // @ts-ignore
                    db: db,
                    query: `SELECT "Metadata" FROM "Pastes" LIMIT 1`,
                });
            } catch {
                await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                    // COMPATIBILITY
                    // @ts-ignore
                    db: db,
                    query: `ALTER TABLE "Pastes" ADD COLUMN 'Metadata' varchar(${EntryDB.MaxContentLength})`,
                });
            }

            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: db,
                query: `CREATE TABLE IF NOT EXISTS "Encryption" (
                    "ViewPassword" varchar(${EntryDB.MaxPasswordLength}),
                    "CustomURL" varchar(${EntryDB.MaxCustomURLLength}),
                    "ENC_IV" varchar(24),
                    "ENC_KEY" varchar(64),
                    "ENC_CODE" varchar(32)
                )`,
            });

            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: db,
                query: `CREATE TABLE IF NOT EXISTS "Revisions" (
                    "CustomURL" varchar(${EntryDB.MaxCustomURLLength}),
                    "Content" varchar(${EntryDB.MaxContentLength}),
                    "EditDate" float
                )`,
            });

            // static init
            if (!EntryDB.StaticInit) {
                EntryDB.StaticInit = true;

                // ...inits
                await EntryDB.CreateExpiry();
                await EntryDB.InitLogs();
                await EntryDB.InitMedia();

                // version paste check
                if (!(await EntryDB.GetConfig())) return;

                // check version
                let storedVersion = await this.GetPasteFromURL("ver");

                if (!storedVersion) {
                    // create version paste
                    // this is used to check if the server is outdated
                    await this.CreatePaste({
                        CustomURL: "ver",
                        EditPassword: EntryDB.config.admin,
                        Content: pack.version,
                        PubDate: new Date().getTime(),
                        EditDate: new Date().getTime(),
                    });

                    storedVersion = await this.GetPasteFromURL("ver");
                }

                if (storedVersion!.Content !== pack.version) {
                    // update version, this means that we are running a different version
                    // than the version file contains
                    storedVersion!.Content = pack.version;

                    await this.EditPaste(
                        {
                            CustomURL: "ver",
                            EditPassword: EntryDB.config.admin,
                            Content: pack.version,
                            PubDate: new Date().getTime(),
                            EditDate: new Date().getTime(),
                        },
                        {
                            CustomURL: "ver",
                            EditPassword: EntryDB.config.admin,
                            Content: pack.version,
                            PubDate: new Date().getTime(),
                            EditDate: new Date().getTime(),
                        }
                    );
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

        // make sure config has a log entry
        if (!config.log) config.log = { clear_on_start: true, events: [] };

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
        // if (!EntryDB.config.log || EntryDB.Logs) return; // LOGS ARE NOW REQUIRED

        // init logs
        EntryDB.Logs = new LogDB();

        // delete bot sessions
        if (EntryDB.config.log.events.includes("session")) {
            const BotSessions = await EntryDB.Logs.QueryLogs(
                "\"Content\" LIKE '%bot%' OR \"Content\" LIKE '%compatible%'"
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
            let query = `DELETE FROM "Logs" WHERE "Type" = 'session'`;

            // ...build query
            for (const log of (
                await EntryDB.Logs.QueryLogs("\"Type\" = 'session'")
            )[2]) {
                // get dates
                const Created = new Date(log.Timestamp);
                const Now = new Date();

                // subtract milliseconds
                const Difference = Now.getTime() - Created.getTime();

                // if difference is more than two months, delete log (invalidating the session)
                if (Difference > 1000 * 60 * 60 * 24 * 64) {
                    console.log(`Removing session "${log.ID}" (maximum age)`);
                    query += ` AND "ID" = '${log.ID}'`;
                }
            }

            if (query.includes("AND"))
                // ...run query
                await (EntryDB.config.pg && EntryDB.config.pg.logdb
                    ? SQL.PostgresQueryOBJ
                    : SQL.QueryOBJ)({
                    // @ts-ignore
                    db: EntryDB.Logs.db,
                    query,
                    use: "Prepare",
                    all: true,
                });
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
     * @param {boolean} [SkipExtras=false]
     * @param {boolean} [isFromCon=false]
     * @return {(Promise<Paste | undefined>)}
     * @memberof EntryDB
     */
    public GetPasteFromURL(
        PasteURL: string,
        SkipExtras: boolean = false,
        isFromCon: boolean = false
    ): Promise<Partial<Paste> | undefined> {
        return new Promise(async (resolve) => {
            // check if paste is from another server
            const server = PasteURL.split(":")[1];

            if (!server) {
                // ...everything after this assumes paste is NOT from another server, as the
                // logic for the paste being from another server SHOULD have been handled above!

                // encode with punycode
                PasteURL = punycode.toASCII(decodeURIComponent(PasteURL));

                // check PasteCache for paste!
                if (isFromCon !== true) {
                    if (EntryDB.PasteCache[PasteURL.toLowerCase()] === undefined)
                        EntryDB.PasteCache[PasteURL.toLowerCase()] =
                            new PasteConnection(
                                this,
                                PasteURL.toLowerCase(),
                                true // don't fetch, we're doing that below! (prevent inf loop)
                            );

                    // fetch and return
                    return resolve(
                        await EntryDB.PasteCache[PasteURL.toLowerCase()].Fetch()
                    );
                }

                // get paste from local db
                const record = (await (EntryDB.config.pg
                    ? SQL.PostgresQueryOBJ
                    : SQL.QueryOBJ)({
                    // @ts-ignore
                    db: this.db,
                    query: 'SELECT * FROM "Pastes" WHERE "CustomURL" = ?',
                    params: [PasteURL.toLowerCase()],
                    get: true,
                    use: "Query",
                })) as Paste;

                if (!record) return resolve(undefined); // don't reject because we want this to be treated like an async function

                // update encryption values
                if (record.ViewPassword && !SkipExtras) {
                    const encryption = await (EntryDB.config.pg
                        ? SQL.PostgresQueryOBJ
                        : SQL.QueryOBJ)({
                        // @ts-ignore
                        db: this.db,
                        query: 'SELECT * FROM "Encryption" WHERE "ViewPassword" = ? AND "CustomURL" = ?',
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
                            `\"Content\" LIKE '${record.CustomURL.replaceAll(
                                "_",
                                "\\_"
                            )};%' ESCAPE '\\'`
                        )
                    )[2].length;

                // count comments
                if (EntryDB.Logs) {
                    const comments = await (EntryDB.config.pg
                        ? SQL.PostgresQueryOBJ
                        : SQL.QueryOBJ)({
                        // @ts-ignore
                        db: this.db,
                        query: 'SELECT "CustomURL" FROM "Pastes" WHERE "CustomURL" LIKE ?',
                        params: [`c.${record.CustomURL.replaceAll("/", "_")}-%`],
                        all: true,
                        transaction: true,
                        use: "Prepare",
                    });

                    record.Comments = comments.length;
                }

                if (record.Comments === undefined) record.Comments = 0;

                // remove metadata
                const [RealContent, _Metadata] = record.Content.split("_metadata:");
                record.Content = RealContent;

                if (_Metadata) record.Metadata = BaseParser.parse(_Metadata) as any;
                else if (!record.Metadata)
                    // fill default values
                    record.Metadata = {
                        Version: 1,
                        Owner: record.CustomURL,
                        Comments: { Enabled: true },
                    };

                if (typeof record.Metadata === "string")
                    record.Metadata = JSON.parse(record.Metadata);

                // MAKE SURE paste has an owner value!
                if (record.Metadata && !record.Metadata.Owner)
                    record.Metadata.Owner = record.CustomURL;

                // return
                return resolve(record);
            } else {
                // ...everything after this assumes paste IS from another server!

                // just send a /api/get request to the other server
                if (server.startsWith("%")) return resolve(undefined);
                const request = fetch(
                    server !== "text.is"
                        ? // everything
                          `https://${server}/api/raw/${PasteURL.split(":")[0]}`
                        : // text.is (terrible api)
                          `https://${server}/${PasteURL.split(":")[0]}/raw`
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
                        Metadata: { Version: 1, Owner: PasteURL },
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

        // encode with punycode
        PasteInfo.CustomURL = punycode.toASCII(PasteInfo.CustomURL);

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
            const GroupRecord = (await (EntryDB.config.pg
                ? SQL.PostgresQueryOBJ
                : SQL.QueryOBJ)({
                // @ts-ignore
                db: this.db,
                query: 'SELECT * FROM "Pastes" WHERE "GroupName" = ?',
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
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: this.db,
                query: 'INSERT INTO "Encryption" VALUES (?, ?, ?, ?, ?)',
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
                            `"Type" = 'session' AND \"Content\" LIKE \'%;_with;${CommentingOn.Metadata.Owner}\'`
                        )
                    )[2][0];

                    if (MentionSession)
                        // create notification
                        await EntryDB.Logs.CreateLog({
                            Type: "notification",
                            // notification paste must start with "c/"
                            // so that the notif dashboard understands this is a new comment!
                            Content: `c/${CommentingOn.CustomURL};${CommentingOn.Metadata.Owner}`,
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
                        `"Type" = 'session' AND \"Content\" LIKE \'%;_with;${match.groups.NAME}\'`
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
        // PasteInfo.Content += `_metadata:${BaseParser.stringify(metadata)}`; // OLD
        PasteInfo.Metadata = metadata; // NEW

        // create paste
        await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: 'INSERT INTO "Pastes" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            params: [
                PasteInfo.Content,
                PasteInfo.EditPassword,
                PasteInfo.CustomURL,
                PasteInfo.ViewPassword,
                new Date().getTime(), // PubDate
                new Date().getTime(), // EditDate
                PasteInfo.GroupName || "",
                PasteInfo.GroupSubmitPassword || "",
                JSON.stringify(PasteInfo.Metadata),
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
     * @param {boolean} [OnlyCreateRevision=false]
     * @return {Promise<[boolean, string, Paste]>}
     * @memberof EntryDB
     */
    public async EditPaste(
        PasteInfo: Paste,
        NewPasteInfo: Paste,
        Force: boolean = false,
        OnlyCreateRevision: boolean = false
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

        // encode with punycode
        PasteInfo.CustomURL = punycode.toASCII(PasteInfo.CustomURL);
        NewPasteInfo.CustomURL = punycode.toASCII(NewPasteInfo.CustomURL);

        // we're not allowing users to change ViewPasswords currently

        // make sure a paste exists
        const paste = await this.GetPasteFromURL(PasteInfo.CustomURL);
        if (!paste) return [false, "This paste does not exist!", NewPasteInfo];

        // hash passwords

        // ...store unhashed
        PasteInfo.UnhashedEditPassword = `${PasteInfo.EditPassword}`;
        NewPasteInfo.UnhashedEditPassword = `${NewPasteInfo.EditPassword}`;

        // ...hash
        PasteInfo.EditPassword = CreateHash(PasteInfo.EditPassword);
        NewPasteInfo.EditPassword = CreateHash(NewPasteInfo.EditPassword);

        // if PasteInfo doesn't include an EditPassword, set it to the current password
        // ...ONLY IF we're the owner of the paste!
        const UndefinedHash = CreateHash("undefined");
        let UsedPasswordless = false;

        if (
            PasteInfo.EditPassword === UndefinedHash &&
            PasteInfo.Associated &&
            paste.Metadata &&
            paste.Metadata.Owner &&
            PasteInfo.Associated === paste.Metadata!.Owner
        ) {
            PasteInfo.EditPassword = paste.EditPassword!;
            UsedPasswordless = true;
        }

        // ...if we're not changing the paste password, make sure it stays the same!
        if (
            !NewPasteInfo.EditPassword ||
            NewPasteInfo.EditPassword === UndefinedHash
        )
            NewPasteInfo.EditPassword = PasteInfo.EditPassword;

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

        // validate password
        if (
            PasteInfo.EditPassword !== paste.EditPassword &&
            // also accept admin password
            PasteInfo.EditPassword !== CreateHash(EntryDB.config.admin)
        )
            return [false, "Invalid password", NewPasteInfo];

        // make sure paste isn't locked
        if (paste.Metadata && paste.Metadata.Locked === true && Force === false)
            return [
                false,
                "This paste has been locked by a server administrator.",
                NewPasteInfo,
            ];

        // if the admin password was used, log an "access_admin" log
        if (
            PasteInfo.EditPassword === CreateHash(EntryDB.config.admin) &&
            EntryDB.config.log &&
            EntryDB.config.log.events.includes("access_admin")
        )
            await EntryDB.Logs.CreateLog({
                Type: "access_admin",
                Content: `Paste edit: ${paste.CustomURL}`,
            });

        // if custom url was changed, add the group back to it
        // ...users cannot add the group manually because of the custom url regex
        if (NewPasteInfo.CustomURL !== paste.CustomURL && !OnlyCreateRevision) {
            // add groupname
            if (paste.GroupName)
                NewPasteInfo.CustomURL = `${paste.GroupName}/${NewPasteInfo.CustomURL}`;

            // make sure the paste we're changing to doesn't already exist
            const _existingPaste = await this.GetPasteFromURL(
                NewPasteInfo.CustomURL,
                true
            );

            if (_existingPaste)
                return [
                    false,
                    "Cannot change url to a url that is already taken!",
                    PasteInfo, // return old paste info because we didn't actually update anything!!
                ];

            // ALSO... delete all view_paste logs that have to do with the old URL
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: EntryDB.Logs.db,
                query: 'DELETE FROM "Logs" WHERE "Type" = \'view_paste\' AND "Content" LIKE ?',
                params: [`%${paste.CustomURL}%`],
                use: "Prepare",
            });

            // ALSO... free up custom domain
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: EntryDB.Logs.db,
                query: 'DELETE FROM "Logs" WHERE "Type" = \'custom_domain\' AND "Content" LIKE ?',
                params: [`${paste.CustomURL}%`],
                use: "Prepare",
            });

            // ALSO... delete all revisions
            if (EntryDB.config.app && EntryDB.config.app.enable_versioning)
                await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                    // @ts-ignore
                    db: this.db,
                    query: 'DELETE FROM "Revisions" WHERE "CustomURL" = ?',
                    params: [paste.CustomURL],
                    use: "Prepare",
                });
        }

        // re-encrypt (if needed, again)
        if (NewPasteInfo.ViewPassword && !OnlyCreateRevision) {
            // using NewPasteInfo for all of these values because PasteInfo doesn't actually
            // really matter for this, as the content is only defined in NewPasteInfo
            const result = Encrypt(NewPasteInfo.Content.split("_metadata:")[0]);
            if (!result) return [false, "Encryption error!", NewPasteInfo];
            NewPasteInfo.Content = result[0];

            // update encryption
            // we select by ViewPassword for the Encryption table
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: this.db,
                query: 'UPDATE "Encryption" SET ("ENC_IV", "ENC_KEY", "ENC_CODE", "CustomURL") = (?, ?, ?, ?) WHERE "ViewPassword" = ? AND "CustomURL" = ?',
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

        // create new revision
        if (EntryDB.config.app && EntryDB.config.app.enable_versioning)
            await this.CreateRevision({
                CustomURL: NewPasteInfo.CustomURL,
                Content: NewPasteInfo.Content,
                EditDate: NewPasteInfo.EditDate,
            });

        // append metadata
        // NewPasteInfo.Content += `_metadata:${BaseParser.stringify(paste.Metadata!)}`;

        // update paste
        if (!OnlyCreateRevision)
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: this.db,
                query: 'UPDATE "Pastes" SET ("Content", "EditPassword", "CustomURL", "ViewPassword", "PubDate", "EditDate", "Metadata") = (?, ?, ?, ?, ?, ?, ?) WHERE "CustomURL" = ?',
                params: [
                    NewPasteInfo.Content,
                    NewPasteInfo.EditPassword,
                    NewPasteInfo.CustomURL,
                    NewPasteInfo.ViewPassword,
                    NewPasteInfo.PubDate,
                    NewPasteInfo.EditDate,
                    JSON.stringify(paste.Metadata), // update metadata
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

        // encode with punycode
        PasteInfo.CustomURL = punycode.toASCII(PasteInfo.CustomURL);

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

        // if the admin password was used, log an "access_admin" log
        if (
            PasteInfo.EditPassword === CreateHash(EntryDB.config.admin) &&
            EntryDB.config.log &&
            EntryDB.config.log.events.includes("access_admin")
        )
            await EntryDB.Logs.CreateLog({
                Type: "access_admin",
                Content: `Paste delete: ${paste.CustomURL}`,
            });

        // if paste is encrypted, delete the encryption values too
        if (paste.ViewPassword) {
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: this.db,
                query: 'DELETE FROM "Encryption" WHERE "ViewPassword" = ? AND "CustomURL" = ?',
                params: [paste.ViewPassword, paste.CustomURL],
                use: "Prepare",
            });
        }

        // delete paste
        await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: 'DELETE FROM "Pastes" WHERE "CustomURL" = ?',
            params: [PasteInfo.CustomURL.toLowerCase()],
            use: "Prepare",
        });

        // delete from PasteCache
        if (EntryDB.PasteCache[PasteInfo.CustomURL.toLowerCase()])
            delete EntryDB.PasteCache[PasteInfo.CustomURL.toLowerCase()];

        // delete media
        if (EntryDB.Media) await EntryDB.Media.DeleteOwner(PasteInfo.CustomURL);

        // delete all revisions
        if (EntryDB.config.app && EntryDB.config.app.enable_versioning)
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: this.db,
                query: 'DELETE FROM "Revisions" WHERE "CustomURL" = ?',
                params: [paste.CustomURL],
                use: "Prepare",
            });

        // register event
        if (EntryDB.config.log && EntryDB.config.log.events.includes("delete_paste"))
            await EntryDB.Logs.CreateLog({
                Content: PasteInfo.CustomURL,
                Type: "delete_paste",
            });

        // delete all views
        if (EntryDB.config.log && EntryDB.config.log.events.includes("view_paste")) {
            const views = await EntryDB.Logs.QueryLogs(
                `"Type" = 'view_paste' AND \"Content\" LIKE \'${PasteInfo.CustomURL};%\'`
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
     * @param {string} [method="POST"]
     * @param {boolean} [https=true]
     * @param {Headers} headers
     * @return {Promise<[boolean, Response]>} [isBad, record]
     * @memberof EntryDB
     */
    public async ForwardRequest(
        server: string,
        endpoint: string,
        body: string[],
        method: string = "POST",
        https: boolean = true,
        headers?: Headers
    ): Promise<[boolean, Response]> {
        // send request
        const request = fetch(
            `${https === true ? "https" : "http"}://${server}/api/${endpoint}`,
            {
                body: method !== "GET" ? body.join("&") : "",
                method,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    ...(headers || new Headers()).toJSON(),
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
        const record = (await (EntryDB.config.pg
            ? SQL.PostgresQueryOBJ
            : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: `SELECT * FROM \"Encryption\" WHERE \"ViewPassword\" = ? AND \"CustomURL\" = ?`,
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
        const pastes = await (EntryDB.config.pg
            ? SQL.PostgresQueryOBJ
            : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: `SELECT * FROM \"Pastes\" WHERE ${
                sql || '"CustomURL" IS NOT NULL LIMIT 500'
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
                        Owner: paste.CustomURL,
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
     * @return {Promise<[boolean, string][]>} Outputs
     * @memberof EntryDB
     */
    public async ImportPastes(_export: Paste[]): Promise<[boolean, string][]> {
        let outputs: [boolean, string][] = [];

        // create each paste
        for (let paste of _export) {
            // convert date
            if (typeof paste.PubDate === "string")
                paste.PubDate = new Date().getTime();

            if (typeof paste.EditDate === "string")
                paste.EditDate = new Date().getTime();

            // create paste
            await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                // @ts-ignore
                db: this.db,
                query: 'INSERT INTO "Pastes" VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                params: [
                    paste.Content,
                    paste.EditPassword,
                    paste.CustomURL,
                    paste.ViewPassword,
                    paste.PubDate,
                    paste.EditDate,
                    paste.GroupName,
                    paste.GroupSubmitPassword,
                ],
                transaction: true,
                use: "Prepare",
            });

            // create paste
            outputs.push([true, "Paste created!"]);
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
        const pastes = await (EntryDB.config.pg
            ? SQL.PostgresQueryOBJ
            : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: 'SELECT * FROM "Pastes" WHERE "GroupName" = ? LIMIT ?',
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
     * @method GetAllPastesOwnedByPaste
     *
     * @param {string} owner
     * @return {Promise<Paste[]>}
     * @memberof EntryDB
     */
    public async GetAllPastesOwnedByPaste(owner: string): Promise<Paste[]> {
        return await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: 'SELECT * FROM "Pastes" WHERE "Metadata" LIKE ?',
            params: [`%"Owner":"${owner}"%`],
            all: true,
            transaction: true,
            use: "Prepare",
        });
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
        const result = await (EntryDB.config.pg
            ? SQL.PostgresQueryOBJ
            : SQL.QueryOBJ)({
            // @ts-ignore
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
            result.Metadata &&
            result.Metadata.Comments &&
            result.Metadata.Comments.Enabled === false
        )
            return [false, "Paste has comments disabled", []];

        // get comments
        const comments: Paste[] = await (EntryDB.config.pg
            ? SQL.PostgresQueryOBJ
            : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: `SELECT * FROM \"Pastes\" WHERE \"CustomURL\" LIKE ? ORDER BY cast(\"PubDate\" as float) DESC LIMIT 50 OFFSET ${offset}`,
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
                    Owner: paste.CustomURL,
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
                await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                    // @ts-ignore
                    db: this.db,
                    query: 'SELECT "CustomURL" FROM "Pastes" WHERE "CustomURL" LIKE ?',
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

    // revisions (versions)

    /**
     * @method GetRevision
     *
     * @param {string} PasteURL
     * @param {number} time
     * @return {Promise<[boolean, string, Revision?]>}
     * @memberof EntryDB
     */
    public async GetRevision(
        PasteURL: string,
        time: number
    ): Promise<[boolean, string, Revision?]> {
        // make sure paste exists
        const paste = await this.GetPasteFromURL(PasteURL, true);
        if (!paste) return [false, "Paste does not exist"];

        // handle "latest" revision
        if (Number.isNaN(time))
            time = (await this.GetAllPasteRevisions(PasteURL))[2][0].EditDate;

        // get revision
        const revision = await (EntryDB.config.pg
            ? SQL.PostgresQueryOBJ
            : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: 'SELECT * FROM "Revisions" WHERE "CustomURL" = ? AND "EditDate" = ?',
            params: [PasteURL, time],
            transaction: true,
            get: true,
            use: "Prepare",
        });

        // return
        if (!revision) return [false, "Revision does not exist"];
        return [true, "Found revision", revision];
    }

    /**
     * @method GetAllPasteRevisions
     *
     * @param {string} PasteURL
     * @return {Promise<[boolean, string, Revision[]]>}
     * @memberof EntryDB
     */
    public async GetAllPasteRevisions(
        PasteURL: string
    ): Promise<[boolean, string, Revision[]]> {
        // make sure paste exists
        const paste = await this.GetPasteFromURL(PasteURL, true);
        if (!paste) return [false, "Paste does not exist", []];

        // get revisions
        const revisions = await (EntryDB.config.pg
            ? SQL.PostgresQueryOBJ
            : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: 'SELECT * FROM "Revisions" WHERE "CustomURL" = ? ORDER BY "EditDate" DESC',
            params: [PasteURL],
            transaction: true,
            all: true,
            use: "Prepare",
        });

        // return
        return [true, "Found revisions", revisions];
    }

    /**
     * @method CreateRevision
     *
     * @param {Revision} props
     * @return {Promise<[boolean, string, Revision]>}
     * @memberof EntryDB
     */
    public async CreateRevision(
        props: Revision
    ): Promise<[boolean, string, Revision]> {
        // make sure paste exists
        const paste = await this.GetPasteFromURL(props.CustomURL, true);
        if (!paste) return [false, "Paste does not exist", props];

        // make sure revision doesn't already exist
        const revision = await this.GetRevision(props.CustomURL, props.EditDate);
        if (revision[0]) return [false, "Revision already exists at time", props];

        // get all paste revisions, if there are already 5... delete one!
        const AllRevisions = await this.GetAllPasteRevisions(props.CustomURL);
        if (AllRevisions[2] && AllRevisions[2].length >= 10) {
            const LastRevision = AllRevisions[2].pop();
            if (LastRevision)
                await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
                    // @ts-ignore
                    db: this.db,
                    query: 'DELETE FROM "Revisions" WHERE "CustomURL" = ? AND "EditDate" = ?',
                    params: [LastRevision.CustomURL, LastRevision.EditDate],
                    transaction: true,
                    use: "Prepare",
                });
        }

        // create revision
        await (EntryDB.config.pg ? SQL.PostgresQueryOBJ : SQL.QueryOBJ)({
            // @ts-ignore
            db: this.db,
            query: 'INSERT INTO "Revisions" VALUES (?, ?, ?)',
            params: [props.CustomURL, props.Content, props.EditDate],
            transaction: true,
            use: "Prepare",
        });

        // return
        return [true, "Revision created", props];
    }
}
