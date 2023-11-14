import EntryDB from "../EntryDB";
import SQL from "../helpers/SQL";

// types
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
    Views?: number; // * amount of log records LIKE \'%{CustomURL}%\'
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
    Description?: string; // description shown on paste (opengraph)
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

// ...

/**
 * @export
 * @class PasteConnection
 */
export default class PasteConnection {
    public readonly Database: EntryDB;

    private _paste: Paste | undefined;
    private _name: string;

    /**
     * Creates an instance of PasteConnection.
     * @param {EntryDB} db
     * @param {string} name
     * @param {boolean} [skipInitialFetch=false]
     * @memberof PasteConnection
     */
    constructor(db: EntryDB, name: string, skipInitialFetch: boolean = false) {
        this.Database = db;
        this._name = name.toLowerCase();

        // fetch paste
        (async () => {
            if (skipInitialFetch) return;
            this._paste = (await db.GetPasteFromURL(name, false, true)) as Paste;
        })();
    }

    /**
     * @method Fetch
     * @description Get stored paste/update if changed
     *
     * @return {Promise<Paste>}
     * @memberof PasteConnection
     */
    public async Fetch(): Promise<Paste> {
        // fetch paste content from the db
        const res = (await SQL.QueryOBJ({
            db: this.Database.db,
            query: 'SELECT "Content" FROM "Pastes" WHERE "CustomURL" = ?',
            params: [this._name],
            get: true,
            use: "Query",
        })) as { Content: string };

        // if the content differs from what we have, sync paste
        // (or if this._paste is undefined!)
        if (!this._paste || res.Content !== this._paste!.Content)
            return await this.Sync();

        // return
        return this._paste!;
    }

    /**
     * @method Sync
     * @description Update stored paste
     *
     * @return {Promise<Paste>}
     * @memberof PasteConnection
     */
    public async Sync(): Promise<Paste> {
        return (this._paste = (await this.Database.GetPasteFromURL(
            this._name,
            false,
            true // make sure we don't run connection methods... this is the connection! (prevent inf loop)
        )) as Paste);
    }

    // getters
    public get paste(): Paste {
        return this._paste!;
    }
}
