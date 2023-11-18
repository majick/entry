/**
 * @file SQL helper
 * @name SQL.ts
 * @license MIT
 */

import { Database } from "bun:sqlite";
import path from "node:path";
import fs from "node:fs";

import pg, { Pool } from "pg";

/**
 * @export
 * @class SQL
 */
export default class SQL {
    /**
     * @static
     * @param {string} name
     * @param {string} data
     * @param {boolean} [wal=true]
     * @param {"sqlite" | "postgres"} [type="sqlite"]
     * @return {[Database, boolean]}
     * @memberof SQL
     */
    public static CreateDB(
        name: string,
        data: string,
        wal: boolean = true
    ): [Database, boolean] {
        if (!fs.existsSync(data))
            // create data directory
            fs.mkdirSync(data, { recursive: true });

        const needToCreate = !fs.existsSync(path.join(data, `${name}.sqlite`));

        // see: https://bun.sh/docs/api/sqlite
        const db = new Database(path.join(data, `${name}.sqlite`), {
            create: true,
        });

        if (wal) db.exec("PRAGMA journal_mode = WAL;"); // enable Write Ahead Mode

        // return
        return [db, needToCreate]; // needToCreate tells us if we need to create tables
    }

    /**
     * @method CreatePostgres
     *
     * @static
     * @param {string} host
     * @param {string} user
     * @param {string} password
     * @return {Client}
     * @memberof SQL
     */
    public static CreatePostgres(
        host: string,
        user: string,
        password: string,
        database: string
    ): Pool {
        // ...
        if (!host || !user || !password) throw new Error("Missing values!");

        // create database
        const db = new pg.Pool({ host, user, password, database, max: 5 });
        db.connect();

        // return
        return db;
    }

    /**
     * @static
     * @param {Database} db
     * @param {string} query
     * @param {any[]} [insertValues=[]]
     * @param {boolean} [transaction=false]
     * @param {boolean} [get=false]
     * @param {boolean} [all=false]
     * @return {Promise<any>}
     * @memberof SQL
     */
    public static async Query(
        db: Database,
        query: string,
        insertValues: any[] = [],
        transaction: boolean = false,
        get: boolean = false,
        all: boolean = false
    ): Promise<any> {
        let result;
        const _query = db.query(query);

        if (!transaction) {
            if (get) result = _query.get(...insertValues);
            else if (all) result = _query.all(...insertValues);
            else result = _query.run(...insertValues);
        } else {
            await db.transaction(() => {
                if (get) result = _query.get(...insertValues);
                else if (all) result = _query.all(...insertValues);
                else result = _query.run(...insertValues);
            })();
        }

        _query.finalize();
        return result;
    }

    /**
     * @static
     * @param {Database} db
     * @param {string} query
     * @param {any[]} [insertValues=[]]
     * @param {boolean} [transaction=false]
     * @param {boolean} [get=false]
     * @param {boolean} [all=false]
     * @return {Promise<any>}
     * @memberof SQL
     */
    public static async Prepare(
        db: Database,
        query: string,
        insertValues: any[] = [],
        transaction: boolean = false,
        get: boolean = false,
        all: boolean = false
    ): Promise<any> {
        let result;
        const _query = db.prepare(query);

        if (!transaction) {
            if (get) result = _query.get(...insertValues);
            else if (all) result = _query.all(...insertValues);
            else result = _query.run(...insertValues);
        } else {
            await db.transaction(() => {
                if (get) result = _query.get(...insertValues);
                else if (all) result = _query.all(...insertValues);
                else result = _query.run(...insertValues);
            })();
        }

        _query.finalize();
        return result;
    }

    /**
     * @method QueryOBJ
     * @static
     * @param {({
     *         db: Database;
     *         query: string;
     *         insertValues?: any[];
     *         params?: any[]; // alias of insertValues
     *         transaction?: boolean;
     *         get?: boolean;
     *         all?: boolean;
     *         use?: "Query" | "Prepare";
     *     })} params
     * @return {Promise<any>}
     * @memberof SQL
     */
    public static async QueryOBJ(params: {
        db: Database;
        query: string;
        insertValues?: any[];
        params?: any[]; // alias of insertValues
        transaction?: boolean;
        get?: boolean;
        all?: boolean;
        use?: "Query" | "Prepare";
    }): Promise<any> {
        // if db has a host value, forward to pg
        if ((params.db as any).options)
            return await SQL.PostgresQueryOBJ(params as any);

        // sqlite
        if (params.use === "Prepare")
            return SQL.Prepare(
                params.db,
                params.query,
                params.insertValues || params.params,
                params.transaction,
                params.get,
                params.all
            );

        return SQL.Query(
            params.db,
            params.query,
            params.insertValues || params.params,
            params.transaction,
            params.get,
            params.all
        );
    }

    /**
     * @method PostgresQueryOBJ
     * @static
     * @param {({
     *         db: Pool;
     *         query: string;
     *         insertValues?: any[];
     *         params?: any[]; // alias of insertValues
     *         transaction?: boolean;
     *         get?: boolean;
     *         all?: boolean;
     *         use?: "Query" | "Prepare";
     *     })} params
     * @return {Promise<any>}
     * @memberof SQL
     */
    public static async PostgresQueryOBJ(params: {
        db: Pool;
        query: string;
        insertValues?: any[];
        params?: any[]; // alias of insertValues
        transaction?: boolean;
        get?: boolean;
        all?: boolean;
        use?: "Query" | "Prepare";
    }): Promise<any> {
        // postgres

        // replace question marks in query with $<num>
        let ParamNumber = 0;
        params.query = params.query.replaceAll("?", () => {
            ParamNumber++;
            return `$${ParamNumber}`;
        });

        // add semicolon
        params.query += `;`;

        // get client
        const client = await params.db.connect();

        // ...prepare and query are the same here!
        const res = await client.query(params.query, params.params);

        // release
        client.release();

        // determine return value
        if (!res.rows) res.rows = [];
        if (params.all) return res.rows;
        else if (params.get) return res.rows[0];
        else return res.fields;
    }
}
