import LogDB from "../LogDB";
import SQL from "../helpers/SQL";

// types
export type LogEvent =
    | "generic"
    | "create_paste"
    | "edit_paste"
    | "delete_paste"
    | "access_admin"
    | "session"
    | "error"
    | "view_paste"
    | "report"
    | "custom_domain"
    | "notification";

export type Log = {
    Content: string;
    Timestamp: number;
    Type: LogEvent;
    ID: string;
};

// ...

/**
 * @export
 * @class LogConnection
 */
export default class LogConnection {
    public readonly Database: LogDB;

    private _log: Log | undefined;
    private _id: string;

    /**
     * Creates an instance of LogConnection.
     * @param {LogDB} db
     * @param {string} id
     * @param {boolean} [skipInitialFetch=false]
     * @memberof PasteConnection
     */
    constructor(db: LogDB, id: string, skipInitialFetch: boolean = false) {
        this.Database = db;
        this._id = id;

        // fetch paste
        (async () => {
            if (skipInitialFetch) return;
            this._log = (await db.GetLog(id, true))[2] as Log;
        })();
    }

    /**
     * @method Fetch
     * @description Get stored log/update if changed
     *
     * @return {Promise<Log>}
     * @memberof PasteConnection
     */
    public async Fetch(): Promise<Log> {
        // fetch paste content from the db
        const res = (await SQL.QueryOBJ({
            db: this.Database.db,
            query: 'SELECT "Content" FROM "Logs" WHERE "ID" = ?',
            params: [this._id],
            get: true,
            use: "Query",
        })) as { Content: string; EditPassword: string };

        // if the content differs from what we have, sync paste
        // (or if this._log is undefined!)
        if (!this._log || res.Content !== this._log!.Content)
            return await this.Sync();

        // return
        return this._log!;
    }

    /**
     * @method Sync
     * @description Update stored log
     *
     * @return {Promise<Paste>}
     * @memberof PasteConnection
     */
    public async Sync(): Promise<Log> {
        return (this._log = (
            await this.Database.GetLog(
                this._id,
                true // make sure we don't run connection methods... this is the connection! (prevent inf loop)
            )
        )[2] as Log);
    }

    // getters
    public get log(): Log {
        return this._log!;
    }
}
