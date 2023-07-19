/**
 * @file SQL helper
 * @name SQL.ts
 * @license MIT
 */

import { Database } from "bun:sqlite";
import path from "node:path";
import fs from "node:fs";

/**
 * @export
 * @class SQL
 */
export default class SQL {
    /**
     * @static
     * @param {string} name
     * @param {string} data
     * @return {[Database, boolean]}
     * @memberof SQL
     */
    public static CreateDB(name: string, data: string): [Database, boolean] {
        console.log(data)
        if (!fs.existsSync(data))
            // create data directory
            fs.mkdirSync(data, { recursive: true });

        const needToCreate = !fs.existsSync(path.join(data, `${name}.sqlite`));

        // see: https://bun.sh/docs/api/sqlite
        const db = new Database(path.join(data, `${name}.sqlite`), {
            create: true,
        });

        // return
        return [db, needToCreate]; // needToCreate tells us if we need to create tables
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
}
