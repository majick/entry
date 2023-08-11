/**
 * @file Create Log DB
 * @name LogDB.ts
 * @license MIT
 */

import path from "node:path";
import fs from "node:fs";

import { ComputeRandomObjectHash } from "./helpers/Hash";
import { Database } from "bun:sqlite";
import SQL from "./helpers/SQL";

import EntryDB from "./EntryDB";
import { Config } from "../..";

// types
export type LogEvent = "generic" | "create_paste" | "edit_paste" | "delete_paste";

export type Log = {
    Content: string;
    Timestamp: string;
    Type: LogEvent;
    ID: string;
    Admin: boolean; // states that the event should only be viewed by admins
};

/**
 * @export
 * @class LogDB
 */
export default class LogDB {
    public static isNew: boolean = true;
    public readonly db: Database;

    /**
     * Creates an instance of EntryDB.
     * @memberof EntryDB
     */
    constructor(config: Config) {
        // delete database is option is set in config
        if (config.log && config.log.clear_on_start)
            fs.rmSync(path.resolve(EntryDB.DataDirectory, "log.sqlite"));

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
                    ID varchar(256),
                    Admin boolean
                )`,
            });
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
            Timestamp: log.Timestamp || new Date().toUTCString(),
            Type: log.Type || "generic",
            ID: log.ID || ComputeRandomObjectHash(),
            Admin: log.Admin || false,
        };

        // create entry
        await SQL.QueryOBJ({
            db: this.db,
            query: "INSERT INTO Logs VALUES (?, ?, ?, ?, ?)",
            params: [_log.Content, _log.Timestamp, _log.Type, _log.ID, _log.Admin],
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
     * @return {Promise<[boolean, string, Log[]]>}
     * @memberof LogDB
     */
    public async QueryLogs(sql: string): Promise<[boolean, string, Log[]]> {
        // query logs
        const logs = await SQL.QueryOBJ({
            db: this.db,
            query: `SELECT * FROM Logs WHERE ${sql}`,
            use: "Prepare",
            all: true,
        });

        // return
        return [true, sql, logs];
    }
}
