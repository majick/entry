/**
 * @file Create Log DB
 * @name LogDB.ts
 * @license MIT
 */

import { ComputeRandomObjectHash } from "./helpers/Hash";
import { Database } from "bun:sqlite";
import SQL from "./helpers/SQL";

import EntryDB from "./EntryDB";
import type { Config } from "../..";

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
    | "custom_domain";

export type Log = {
    Content: string;
    Timestamp: number;
    Type: LogEvent;
    ID: string;
};

/**
 * @export
 * @class LogDB
 */
export default class LogDB {
    public static isNew: boolean = true;
    public readonly db: Database;

    /**
     * Creates an instance of LogDB.
     * @memberof LogDB
     */
    constructor() {
        // create db link
        const [db, isNew] = SQL.CreateDB("log", EntryDB.DataDirectory);

        LogDB.isNew = isNew;
        this.db = db;

        (async () => {
            await SQL.QueryOBJ({
                db,
                query: `CREATE TABLE IF NOT EXISTS Logs (
                    Content varchar(${EntryDB.MaxContentLength}),
                    Timestamp datetime DEFAULT CURRENT_TIMESTAMP,
                    Type varchar(255),
                    ID varchar(256)
                )`,
            });

            // clear logs is option is set in config
            if (EntryDB.config.log && EntryDB.config.log.clear_on_start === true)
                for (const event of EntryDB.config.log.events) {
                    // make sure the event isn't something that we shouldn't clear
                    if (
                        // should match the things excluded in the admin log page
                        event === "comment" ||
                        event === "report" ||
                        event === "session" ||
                        event === "view_paste" ||
                        event === "custom_domain"
                    )
                        continue;

                    // delete
                    await SQL.QueryOBJ({
                        db,
                        query: "DELETE FROM Logs WHERE Type = ?",
                        params: [event],
                        use: "Prepare",
                        all: true,
                    });
                }
        })();
    }

    /**
     * @method CreateLog
     *
     * @param {Partial<Log>} log
     * @return {Promise<[boolean, string, Log]>} success, message, full log
     * @memberof LogDB
     */
    public async CreateLog(log: Partial<Log>): Promise<[boolean, string, Log]> {
        // fill log
        const _log: Log = {
            Content: log.Content || "No content",
            Timestamp: log.Timestamp || new Date().getTime(),
            Type: log.Type || "generic",
            ID: log.ID || ComputeRandomObjectHash(),
        };

        // return false if this log already exists (same content, timestamp, type)
        // since sessions are stored as logs, this should prevent duplicated being created
        // at the exact same time from the exact same device
        const ExistingLog = await SQL.QueryOBJ({
            db: this.db,
            query: "SELECT * FROM Logs WHERE Content = ? AND Timestamp = ? AND Type = ?",
            params: [_log.Content, _log.Timestamp, _log.Type],
            get: true,
            use: "Prepare",
            transaction: true,
        });

        // return false so two different users with the exact same user-agent don't end up
        // sharing the same session, one of them just has to try again later
        if (ExistingLog) return [false, "Log exists", ExistingLog];

        // create entry
        await SQL.QueryOBJ({
            db: this.db,
            query: "INSERT INTO Logs VALUES (?, ?, ?, ?)",
            params: [_log.Content, _log.Timestamp, _log.Type, _log.ID],
            use: "Prepare",
        });

        // return
        return [true, "Log created", _log];
    }

    /**
     * @method GetLog
     *
     * @param {string} id
     * @return {Promise<[boolean, string, Log?]>} success, message, log
     * @memberof LogDB
     */
    public async GetLog(id: string): Promise<[boolean, string, Log?]> {
        // attempt to get log
        const log = await SQL.QueryOBJ({
            db: this.db,
            query: "SELECT * FROM Logs WHERE ID = ?",
            params: [id],
            get: true,
            transaction: true,
            use: "Prepare",
        });

        if (!log) return [false, "Log does not exist"];

        // return
        return [true, id, log];
    }

    /**
     * @method DeleteLog
     *
     * @param {string} id
     * @return {Promise<[boolean, string, Log?]>} success, message, deleted log
     * @memberof LogDB
     */
    public async DeleteLog(id: string): Promise<[boolean, string, Log?]> {
        // make sure log exists
        const log = await this.GetLog(id);
        if (!log[2]) return log;

        // delete log
        await SQL.QueryOBJ({
            db: this.db,
            query: "DELETE FROM Logs WHERE ID = ?",
            params: [id],
            use: "Prepare",
        });

        // return
        return [true, "Log deleted", log[2]];
    }

    /**
     * @method QueryLogs
     *
     * @param {string} sql
     * @param [select="*"]
     * @return {Promise<[boolean, string, Log[]]>}
     * @memberof LogDB
     */
    public async QueryLogs(
        sql: string,
        select: string = "*"
    ): Promise<[boolean, string, Log[]]> {
        // query logs
        const logs = await SQL.QueryOBJ({
            db: this.db,
            query: `SELECT ${select} FROM Logs WHERE ${sql}`,
            use: "Prepare",
            all: true,
        });

        // return
        return [true, sql, logs];
    }

    /**
     * @method UpdateLog
     *
     * @param {string} id
     * @param {string} content
     * @return {Promise<[boolean, string]>}
     * @memberof LogDB
     */
    public async UpdateLog(id: string, content: string): Promise<[boolean, string]> {
        // make sure log exists
        const log = await this.GetLog(id);
        if (!log[2]) return [false, "Log does not exist"];

        // delete log
        await SQL.QueryOBJ({
            db: this.db,
            query: "UPDATE Logs SET Content = ? WHERE ID = ?",
            params: [content, id],
            use: "Prepare",
        });

        // return
        return [true, "Log updated"];
    }
}
