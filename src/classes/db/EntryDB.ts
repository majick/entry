/**
 * @file Create Entry DB
 * @name EntryDB.ts
 * @license MIT
 */

import crypto from "node:crypto";
import path from "node:path";

import { Database } from "bun:sqlite";
import { CreateHash, Encrypt } from "./helpers/Hash";
import SQL from "./helpers/SQL";
import Expiry from "./Expiry";
import LogDB from "./LogDB";

import pack from "../../../package.json";
import type { Config } from "../..";

export type Paste = {
    Content: string;
    EditPassword: string;
    CustomURL: string;
    PubDate: string;
    EditDate: string;
    GroupName?: string;
    GroupSubmitPassword?: string;
    ENC_IV?: string;
    ENC_KEY?: string;
    ENC_CODE?: string;
    ViewPassword?: string; // we're going to use this to check if the paste is private,
    //                        if it is valid, the paste is private and should have a
    //                        corresponding entry in the Encryption table
    HostServer?: string; // this is not actually stored in the record
    IsEditable?: string; // this is not actually stored in the record
    ExpireOn?: string; //   this is not actually stored in the record
    UnhashedEditPassword?: string; // this should never be stored in the record! only used have paste creation
};

/**
 * @export
 * @class EntryDB
 */
export default class EntryDB {
    public static DataDirectory = (
        process.env.DATA_LOCATION || path.resolve(process.cwd(), "data")
    ).replace(":cwd", process.cwd());

    public readonly db: Database;
    public static Expiry: Expiry; // hold expiry registry
    public static Logs: LogDB; // hold log db

    public static readonly MaxContentLength = 200000;
    public static readonly MaxPasswordLength = 256;
    public static readonly MaxCustomURLLength = 100;

    public static readonly MinContentLength = 1;
    public static readonly MinPasswordLength = 5;
    public static readonly MinCustomURLLength = 2;

    private static readonly URLRegex = /^[\w\_\-]+$/gm; // custom urls must match this to be accepted

    public static isNew: boolean = true;

    /**
     * Creates an instance of EntryDB.
     * @memberof EntryDB
     */
    constructor() {
        // create db link
        const [db, isNew] = SQL.CreateDB("entry", EntryDB.DataDirectory);

        EntryDB.isNew = isNew;
        this.db = db;

        (async () => {
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

            // ...
            if (isNew) {
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
            } else {
                // check version
                const storedVersion = await this.GetPasteFromURL("v");
                if (!storedVersion) return;

                if (storedVersion.Content !== pack.version) {
                    // update version, this means that we are running a different version
                    // than the version file contains
                    storedVersion.Content = pack.version;

                    await SQL.QueryOBJ({
                        db: db,
                        query: "UPDATE Pastes SET (Content, EditDate) = (?, ?) WHERE CustomURL = ?",
                        params: [
                            storedVersion.Content,
                            new Date().toUTCString(), // new edit date
                            storedVersion.CustomURL,
                        ],
                        transaction: true,
                        use: "Prepare",
                    });
                }
            }

            // init logs
            EntryDB.Logs = new LogDB((await EntryDB.GetConfig()) as Config);
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
        const ConfigPath = path.resolve(EntryDB.DataDirectory, "config.json");

        // make sure config exists
        if (!(await Bun.file(ConfigPath).exists())) return undefined;

        // return config
        return JSON.parse(await Bun.file(ConfigPath).text());
    }

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
        await EntryDB.Expiry.Initialize(); // create expiry store

        // run expiry clock
        setInterval(async () => {
            await EntryDB.Expiry.CheckExpiry();
        }, 1000 * 60); // run every minute
    }

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
     * @return {(Promise<Paste | undefined>)}
     * @memberof EntryDB
     */
    public GetPasteFromURL(PasteURL: string): Promise<Partial<Paste> | undefined> {
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
                    params: [PasteURL],
                    get: true,
                    use: "Prepare",
                })) as Paste;

                if (!record) return resolve(undefined); // don't reject because we want this to be treated like an async function

                // update encryption values
                if (record.ViewPassword) {
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
                const expires = await EntryDB.Expiry.GetExpiryDate(record.CustomURL);
                if (expires[0]) record.ExpireOn = expires[1]!.toUTCString();

                // return
                return resolve(record);
            } else {
                // ...everything after this assumes paste IS from another server!

                // just send an /api/get request to the other server
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
                        PubDate:
                            (await request).headers.get("X-Paste-PubDate") ||
                            new Date().toUTCString(),
                        EditDate:
                            (await request).headers.get("X-Paste-EditDate") ||
                            new Date().toUTCString(),
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
        if (!PasteInfo.CustomURL) PasteInfo.CustomURL = crypto.randomUUID();

        // if edit password was not provided, randomize it
        if (!SkipHash)
            if (!PasteInfo.EditPassword) {
                PasteInfo.UnhashedEditPassword = crypto
                    .randomBytes(EntryDB.MinPasswordLength)
                    .toString("hex");

                PasteInfo.EditPassword = `${PasteInfo.UnhashedEditPassword}`;

                // check for PasteInfo.IsEditable, if it does not exist set UnhashedEditPassword to "paste is not editable!"
                if (!PasteInfo.IsEditable)
                    PasteInfo.UnhashedEditPassword = "paste is not editable!";
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

        // check for IsEditable, if it does not exist set EditPassword to "" so the paste
        // cannot be changed
        if (!PasteInfo.IsEditable && !SkipHash) PasteInfo.EditPassword = "";

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
            const NotAllowed = ["admin", "api", "group", "new", ""];

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

        // make sure CustomURL isn't the name of a page
        if (PasteInfo.CustomURL === "group")
            return [false, 'The custom URL "group" is reserved!', PasteInfo];

        // encrypt (if needed)
        if (PasteInfo.ViewPassword) {
            const result = Encrypt(PasteInfo.Content);
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

        // create paste
        await SQL.QueryOBJ({
            db: this.db,
            query: "INSERT INTO Pastes VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params: [
                PasteInfo.Content,
                PasteInfo.EditPassword,
                PasteInfo.CustomURL,
                PasteInfo.ViewPassword,
                new Date().toUTCString(), // PubDate
                new Date().toUTCString(), // EditDate
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
     * @return {Promise<[boolean, string, Paste]>}
     * @memberof EntryDB
     */
    public async EditPaste(
        PasteInfo: Paste,
        NewPasteInfo: Paste
    ): Promise<[boolean, string, Paste]> {
        // check if paste is from another server
        const server = PasteInfo.CustomURL.split(":")[1];

        if (server) {
            // send request
            const [isBad, record] = await this.ForwardRequest(server, "edit", [
                `OldContent=${PasteInfo.Content}`,
                `OldEditPassword=${PasteInfo.EditPassword}`,
                `OldURL=${PasteInfo.CustomURL.split(":")[0]}`,
                // new
                `NewContent=${NewPasteInfo.Content}`,
                `NewEditPassword=${NewPasteInfo.EditPassword}`,
                `NewURL=${NewPasteInfo.CustomURL.split(":")[0]}`,
            ]);

            // check if promise rejected
            if (isBad) return [false, "Connection failed", NewPasteInfo];

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

        // hash passwords
        PasteInfo.EditPassword = CreateHash(PasteInfo.EditPassword);
        NewPasteInfo.EditPassword = CreateHash(NewPasteInfo.EditPassword);
        // we're not allowing users to change ViewPasswords currently

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

        // make sure a paste exists
        const paste = await this.GetPasteFromURL(PasteInfo.CustomURL);
        if (!paste) return [false, "This paste does not exist!", NewPasteInfo];

        // validate password
        // don't use NewPasteInfo to get the password because NewPasteInfo will automatically have the old password
        // if a new password is not supplied. this is done on the server in API.EditPaste
        // paste is the version of the paste stored in the server, so the client cannot have messed with it
        // that means it is safe to compare with what we got from the client
        // ...comparing paste.EditPassword and PasteInfo.EditPassword because if we DID supply a new password,
        // PasteInfo will not have it, only NewPasteInfo will
        if (paste.EditPassword !== PasteInfo.EditPassword)
            return [false, "Invalid password!", NewPasteInfo];

        // if custom url was changed, add the group back to it
        // ...users cannot add the group manually because of the custom url regex
        if (NewPasteInfo.CustomURL !== paste.CustomURL)
            NewPasteInfo.CustomURL = `${paste.GroupName}/${NewPasteInfo.CustomURL}`;

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
            // TODO: i do think it would be cool to allow the server admin to see an analytics panel
            //       with the top viewed pastes (maybe)

            // send request
            const [isBad, record] = await this.ForwardRequest(server, "delete", [
                `CustomURL=${PasteInfo.CustomURL.split(":")[0]}`,
                `password=${password}`,
            ]);

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

        // make sure paste is not "v" (version paste)
        if (paste.CustomURL === "v")
            return [false, "Cannot delete version paste!", PasteInfo];

        // get server config
        const config = (await EntryDB.GetConfig()) as Config;

        // validate password
        // ...password can be either the paste EditPassword or the server admin password
        // ...if the custom url is v, then no password can be used (that's the version file, it is required)
        if (
            (password !== config.admin &&
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

        // register event
        if (config.log && config.log.events.includes("delete_paste"))
            await EntryDB.Logs.CreateLog({
                Content: PasteInfo.CustomURL,
                Type: "delete_paste",
            });

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
     * @return {Promise<[boolean, Response]>} [isBad, record]
     * @memberof EntryDB
     */
    private async ForwardRequest(
        server: string,
        endpoint: string,
        body: string[],
        method: string = "POST"
    ): Promise<[boolean, Response]> {
        // send request
        const request = fetch(`https://${server}/api/${endpoint}`, {
            body: body.join("&"),
            method,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

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
            query: `SELECT * From Pastes${
                !includePrivate ? ' WHERE ViewPassword = ""' : ""
            } WHERE ${sql || "CustomURL IS NOT NULL LIMIT 1000"}`,
            all: true,
            transaction: true,
            use: "Prepare",
        });

        // remove passwords from pastes
        if (removeInfo)
            for (let paste of pastes as Paste[]) {
                paste = this.CleanPaste(paste);
                pastes[pastes.indexOf(paste)] = paste;
            }

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
    public async GetAllPastesInGroup(group: string): Promise<Paste[]> {
        // decentralization stuff
        const server = group.split(":")[1];

        if (server) {
            const [isBad, record] = await this.ForwardRequest(
                server,
                `group/${group.split(":")[0]}`,
                [],
                "GET"
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
            query: "SELECT * From Pastes WHERE GroupName = ?",
            params: [group],
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
     * @method CheckPasteEditable
     *
     * @param {string} PasteURL
     * @return {Promise<[boolean, string, boolean]>} success, message, editable
     * @memberof EntryDB
     */
    public async CheckPasteEditable(
        PasteURL: string
    ): Promise<[boolean, string, boolean]> {
        // get paste
        const paste = await this.GetPasteFromURL(PasteURL);
        if (!paste) return [false, "Paste does not exist", false];

        // check if paste is editable
        // non-editable pastes just have their edit password set to the hash of ""
        const editable =
            paste.EditPassword !== CreateHash("") && paste.EditPassword !== "";

        return [true, "Editable status:", editable];
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
}
