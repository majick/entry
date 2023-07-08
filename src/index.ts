/**
 * @file Start Entry server
 * @name index.ts
 * @license MIT
 */

import { _Server } from "./classes/Server";
import EntryDB from "./classes/db/EntryDB";

import path from "node:path";

export type Config = {
    port: number;
    name: string;
    admin: string;
};

// check if database is new or config file does not exist
if (EntryDB.isNew || !(await EntryDB.GetConfig())) {
    // run setup
    function div() {
        // create divider
        console.log(`\x1b[91m${"-".repeat(25)}\x1b[0m`);
    }

    function required(message: string): string {
        const answer = prompt(`${message} \x1b[91m(required)\x1b[0m:`);
        if (!answer) return required(message);
        else return answer;
    }

    function optional(message: string, _default: any) {
        const answer = prompt(`${message} \x1b[93m(default: ${_default})\x1b[0m:`);

        return answer || _default;
    }

    // ...start
    let config: Partial<Config> = {};

    div();
    console.log("\x1b[94mEntry Setup\x1b[0m");
    div();

    config.port = parseInt(optional("\x1b[92mEnter port\x1b[0m", 8080));
    config.name = optional("\x1b[92mEnter application name\x1b[0m", "Entry");
    config.admin = required("\x1b[92mEnter admin password\x1b[0m");

    div();

    // save file
    await Bun.write(
        path.resolve(EntryDB.DataDirectory, "config.json"),
        JSON.stringify(config, undefined, 4)
    );
}

// create server
new _Server((await EntryDB.GetConfig())!.port || 8080);
