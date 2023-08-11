/**
 * @file Start Entry server
 * @name index.ts
 * @license MIT
 */

import path from "node:path";

// init EntryDB
import EntryDB from "./classes/db/EntryDB";
await EntryDB.CreateExpiry();

// includes
import "./classes/pages/assets/style.css";

// ...
export type Config = {
    port: number;
    name: string;
    admin: string;
    app?: {
        info?: string;
        footer?: {
            rows: Array<{
                [key: string]: string;
            }>;
        };
    };
};

// check if database is new or config file does not exist
if (EntryDB.isNew || !(await EntryDB.GetConfig())) {
    // run setup
    function div() {
        // create divider
        console.log(`\x1b[91m${"-".repeat(25)}\x1b[0m`);
    }

    function required(message: string, name: string): string {
        // the "name" parameter is the name of the (possible) env variable

        // check for env variable
        if (process.env[name.toUpperCase()]) return process.env[name.toUpperCase()]!;

        // run prompt
        const answer = prompt(`${message} \x1b[91m(required)\x1b[0m:`);
        if (!answer) return required(message, name);
        else return answer;
    }

    function optional(message: string, _default: any, name: string) {
        // the "name" parameter is the name of the (possible) env variable

        // check for env variable
        if (process.env[name.toUpperCase()]) return process.env[name.toUpperCase()]!;

        // run prompt
        const answer = prompt(`${message} \x1b[93m(default: ${_default})\x1b[0m:`);

        return answer || _default;
    }

    // ...start
    let config: Partial<Config> = {};

    div();
    console.log("\x1b[94mEntry Setup\x1b[0m");
    div();

    config.port = parseInt(optional("\x1b[92mEnter port\x1b[0m", 8080, "PORT"));
    config.name = optional("\x1b[92mEnter application name\x1b[0m", "Entry", "NAME");
    config.admin = required("\x1b[92mEnter admin password\x1b[0m", "ADMIN_PASSWORD");

    div();

    // save file
    await Bun.write(
        path.resolve(EntryDB.DataDirectory, "config.json"),
        JSON.stringify(config, undefined, 4)
    );

    await EntryDB.GetConfig();

    // exit
    console.log(
        "\x1b[92m[exit]\x1b[0m Please restart the Entry server, this is to prevent bugs relating to how fast the disk writes the config file."
    );

    process.exit(0);
}

// create server
import Honeybee, { HoneybeeConfig } from "honeybee";

// ...import endpoints
import { _404Page } from "./classes/pages/components/404";
import Admin from "./classes/pages/Admin";
import API from "./classes/pages/API";

// ...create config
const config: HoneybeeConfig = {
    Port: (await EntryDB.GetConfig())!.port || 8080,
    AssetsDir: import.meta.dir,
    NotFoundPage: _404Page(),
    Pages: {
        // GET group
        "/group/": { Type: "begins", Page: API.GetAllPastesInGroupPage },
        // GET admin
        "/admin": { Page: Admin.Login },
        "/admin/": { Page: Admin.Login },
        "/admin/login": { Page: Admin.Login },
        "/admin/login/": { Page: Admin.Login },
        // GET api
        "/api/all": { Page: API.GetAllPastes },
        "/api/get": { Type: "begins", Page: API.GetPasteRecord },
        "/api/group": { Type: "begins", Page: API.GetAllPastesInGroup },
        "/api/raw": { Type: "begins", Page: API.GetRawPaste },
        "/api/html": { Type: "begins", Page: API.GetPasteHTML },
        // POST admin
        "/admin/manage-pastes": { Method: "POST", Page: Admin.ManagePastes },
        "/admin/export": { Method: "POST", Page: Admin.ExportPastesPage },
        "/admin/api/delete": { Method: "POST", Page: Admin.APIDeletePaste },
        "/admin/api/export": { Method: "POST", Page: Admin.APIExport },
        "/admin/api/import": { Method: "POST", Page: Admin.APIImport },
        "/admin/api/mass-delete": { Method: "POST", Page: Admin.APIMassDelete },
        "/admin/api/sql": { Method: "POST", Page: Admin.APISQL },
        // POST api
        "/api/new": { Method: "POST", Page: API.CreatePaste },
        "/api/edit": { Method: "POST", Page: API.EditPaste },
        "/api/delete": { Method: "POST", Page: API.DeletePaste },
        "/api/decrypt": { Method: "POST", Page: API.DecryptPaste },
        "/api/markdown": { Method: "POST", Page: API.RenderMarkdown },
        // GET root
        "/.well-known": { Type: "begins", Page: API.WellKnown },
        "/": {
            // return paste view, will return homepage if no paste is provided
            // at the end so it tests this last because everything starts with /, which means
            // everything will get matched by this if it doesn't come before it
            Type: "begins",
            Page: API.GetPasteFromURL,
        },
        // POST root
        "/paste/dec/": { Method: "POST", Type: "begins", Page: API.GetPasteFromURL },
    },
};

// ...start server
new Honeybee(config);
console.log("\x1b[92m[entry] Started server on port:\x1b[0m", config.Port);
