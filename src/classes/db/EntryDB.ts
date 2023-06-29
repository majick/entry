/**
 * @file Create Entry DB
 * @name EntryDB.ts
 * @license MIT
 */

import path from "node:path";

import { Database } from "bun:sqlite";
import { CreateHash } from "./Hash";
import SQL from "./SQL";

export type Paste = {
    Content: string;
    EditPassword: string;
    CustomURL: string;
    PubDate: string;
    EditDate: string;
};

/**
 * @export
 * @class EntryDB
 */
export default class EntryDB {
    private readonly DataDirectory = path.resolve(process.cwd(), "data");
    public readonly db: Database;

    private static readonly MaxContentLength = 200000;
    private static readonly MaxPasswordLength = 256;
    private static readonly MaxCustomURLLength = 100;

    private static readonly MinContentLength = 1;
    private static readonly MinPasswordLength = 5;
    private static readonly MinCustomURLLength = 2;

    /**
     * Creates an instance of EntryDB.
     * @memberof EntryDB
     */
    constructor() {
        // create db link
        const [db, isNew] = SQL.CreateDB("entry");
        this.db = db;

        // check if we need to create tables
        (async () => {
            if (isNew)
                await SQL.QueryOBJ({
                    db,
                    query: `CREATE TABLE Pastes (
                        Content varchar(${EntryDB.MaxContentLength}),
                        EditPassword varchar(${EntryDB.MaxPasswordLength}),
                        CustomURL varchar(${EntryDB.MaxCustomURLLength}),
                        PubDate datetime DEFAULT CURRENT_TIMESTAMP,
                        EditDate datetime DEFAULT CURRENT_TIMESTAMP
                    )`,
                });
        })();
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
        if (PasteInfo.Content.length >= EntryDB.MaxContentLength)
            return [
                false,
                `Content must be less than ${EntryDB.MaxContentLength} characters!`,
            ];
        else if (PasteInfo.EditPassword.length >= EntryDB.MaxPasswordLength)
            return [
                false,
                `Edit password must be less than ${EntryDB.MaxPasswordLength} characters!`,
            ];
        else if (PasteInfo.CustomURL.length >= EntryDB.MaxCustomURLLength)
            return [
                false,
                `Custom URL must be less than ${EntryDB.MaxCustomURLLength} characters!`,
            ];
        // check less than minimum
        else if (PasteInfo.Content.length <= EntryDB.MinContentLength)
            return [
                false,
                `Content must be more than ${EntryDB.MinContentLength} characters!`,
            ];
        else if (PasteInfo.EditPassword.length <= EntryDB.MinPasswordLength)
            return [
                false,
                `Edit password must be more than ${EntryDB.MinPasswordLength} characters!`,
            ];
        else if (PasteInfo.CustomURL.length <= EntryDB.MinCustomURLLength)
            return [
                false,
                `Custom URL must be more than ${EntryDB.MinCustomURLLength} characters!`,
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
    public async GetPasteFromURL(PasteURL: string): Promise<Paste | undefined> {
        const record = await SQL.QueryOBJ({
            db: this.db,
            query: "SELECT * FROM Pastes WHERE CustomURL = ?",
            params: [PasteURL],
            get: true,
            use: "Prepare",
        });

        if (record) return record as Paste;
        else return undefined;
    }

    /**
     * @method CreatePaste
     *
     * @param {Paste} PasteInfo
     * @return {Promise<[boolean, string, Paste]>}
     * @memberof EntryDB
     */
    public async CreatePaste(
        PasteInfo: Paste
    ): Promise<[boolean, string, Paste]> {
        // hash password
        PasteInfo.EditPassword = CreateHash(PasteInfo.EditPassword);

        // validate lengths
        const lengthsValid = EntryDB.ValidatePasteLengths(PasteInfo);
        if (!lengthsValid[0]) return [...lengthsValid, PasteInfo];

        // make sure a paste does not already exist with this custom URL
        if (await this.GetPasteFromURL(PasteInfo.CustomURL))
            return [
                false,
                "A paste with this custom URL already exists!",
                PasteInfo,
            ];

        // create paste
        await SQL.QueryOBJ({
            db: this.db,
            query: "INSERT INTO Pastes VALUES (?, ?, ?, ?, ?)",
            params: [
                ...Object.values(PasteInfo),
                new Date().toUTCString(), // PubDate
                new Date().toUTCString(), // EditDate
            ],
            transaction: true,
            use: "Prepare",
        });

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
        // hash passwords
        PasteInfo.EditPassword = CreateHash(PasteInfo.EditPassword);
        NewPasteInfo.EditPassword = CreateHash(NewPasteInfo.EditPassword);

        // validate lengths
        const lengthsValid = EntryDB.ValidatePasteLengths(NewPasteInfo);
        if (!lengthsValid[0]) return [...lengthsValid, NewPasteInfo];

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

        // update paste
        await SQL.QueryOBJ({
            db: this.db,
            query: "UPDATE Pastes SET (Content, EditPassword, CustomURL, PubDate, EditDate) = (?, ?, ?, ?, ?) WHERE CustomURL = ?",
            params: [...Object.values(NewPasteInfo), PasteInfo.CustomURL],
            use: "Prepare",
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
        if (!PasteInfo.CustomURL)
            return [false, "Missing CustomURL", PasteInfo];

        // get paste
        const paste = await this.GetPasteFromURL(PasteInfo.CustomURL);

        // make sure a paste exists
        if (!paste) return [false, "This paste does not exist!", PasteInfo];

        // validate password
        if (CreateHash(password) !== paste.EditPassword)
            return [false, "Invalid password!", PasteInfo];

        // delete paste
        await SQL.QueryOBJ({
            db: this.db,
            query: "DELETE FROM Pastes WHERE CustomURL = ?",
            params: [PasteInfo.CustomURL],
            use: "Prepare",
        });

        // return
        return [true, "Paste deleted!", PasteInfo];
    }
}
