/**
 * @file Start Entry server
 * @name index.ts
 * @license MIT
 */

// ...EntryDB
import EntryDB from "./classes/db/EntryDB";
import type { LogEvent } from "./classes/db/LogDB";

// create global
import Footer, { InitFooterExtras } from "./classes/pages/components/Footer";

(global as any).EntryDB = EntryDB;
(global as any).Footer = Footer;

// includes
import "./classes/pages/assets/style.css";

// ...
export type Config = {
    port: number;
    name: string;
    admin: string;
    data: string;
    config: string;
    plugin_file?: string;
    env?: "production" | "development";
    app?: {
        info?: string;
        enable_search?: boolean;
        enable_private_pastes?: boolean;
        enable_groups?: boolean;
        enable_expiry?: boolean;
        enable_not_editable_pastes?: boolean;
        enable_builder?: boolean;
        auto_tag?: boolean;
        footer?: {
            show_name_on_all_pages?: boolean;
            rows: Array<{
                [key: string]: string;
            }>;
        };
    };
    log?: {
        clear_on_start: boolean;
        events: LogEvent[];
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

    config.data = optional(
        "\x1b[92mEnter data location\x1b[0m",
        ":cwd/data",
        "DATA_LOCATION"
    );

    config.config = optional(
        "\x1b[92mEnter config location\x1b[0m",
        ":cwd/data/config.json",
        "CONFIG_LOCATION"
    );

    config.admin = required("\x1b[92mEnter admin password\x1b[0m", "ADMIN_PASSWORD");

    div();

    // save file
    await Bun.write(EntryDB.ConfigLocation, JSON.stringify(config, undefined, 4));
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
import Builder from "./classes/pages/components/builder";
import AdminAPI from "./classes/pages/api/AdminAPI";
import Admin from "./classes/pages/Admin";
import Pages from "./classes/pages/Pages";
import API from "./classes/pages/api/API";

// get plugins
export let plugins: HoneybeeConfig["Pages"] = {};
await EntryDB.GetConfig();

if (EntryDB.config.plugin_file) {
    const Path = EntryDB.config.plugin_file.replace(":cwd", process.cwd());

    // if file exists, import file and get default return value
    if (await Bun.file(Path).exists()) {
        const PluginsList: { default: Array<HoneybeeConfig["Pages"]> } =
            await import(Path);

        // load plugin pages
        for (const Plugin of PluginsList.default)
            plugins = { ...plugins, ...Plugin };
    }
}

await InitFooterExtras(plugins); // load footer pages to the footer

// ...create config
const config: HoneybeeConfig = {
    Port: EntryDB.config.port || 8080,
    AssetsDir: import.meta.dir,
    NotFoundPage: _404Page(),
    Pages: {
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
        "/api/exists": { Type: "begins", Page: API.PasteExists },
        "/api/html": { Type: "begins", Page: API.GetPasteHTML },
        // POST admin
        "/admin/manage-pastes": { Method: "POST", Page: Admin.ManagePastes },
        "/admin/export": { Method: "POST", Page: Admin.ExportPastesPage },
        "/admin/logs": { Method: "POST", Page: Admin.LogsPage },
        "/admin/logs/reports": { Method: "POST", Page: Admin.ManageReports },
        "/admin/logs/report/": {
            Type: "begins",
            Method: "POST",
            Page: Admin.ViewReport,
        },
        "/admin/plugins": { Method: "POST", Page: Admin.PluginsPage },
        "/admin/api/delete": { Method: "POST", Page: AdminAPI.APIDeletePaste },
        "/admin/api/export": { Method: "POST", Page: AdminAPI.APIExport },
        "/admin/api/import": { Method: "POST", Page: AdminAPI.APIImport },
        "/admin/api/mass-delete": { Method: "POST", Page: AdminAPI.APIMassDelete },
        "/admin/api/sql": { Method: "POST", Page: AdminAPI.APISQL },
        "/admin/api/logs/export": { Method: "POST", Page: AdminAPI.APIExportLogs },
        "/admin/api/logs/mass-delete": {
            Method: "POST",
            Page: AdminAPI.APIMassDeleteLogs,
        },
        "/admin/api/config.json": {
            Method: "POST",
            Page: AdminAPI.APIExportConfig,
        },
        // POST api
        "/api/new": { Method: "POST", Page: API.CreatePaste },
        "/api/edit": { Method: "POST", Page: API.EditPaste },
        "/api/delete": { Method: "POST", Page: API.DeletePaste },
        "/api/decrypt": { Method: "POST", Page: API.DecryptPaste },
        "/api/markdown": { Method: "POST", Page: API.RenderMarkdown },
        "/api/comments/delete": {
            Type: "begins",
            Method: "POST",
            Page: API.DeleteComment,
        },
        "/api/associate": { Method: "POST", Page: API.PasteLogin },
        "/api/disassociate": { Method: "POST", Page: API.PasteLogout },
        "/api/json": { Type: "begins", Method: "POST", Page: API.JSONAPI },
        // GET search
        "/search": { Page: Pages.PastesSearch },
        // (any) plugins
        ...plugins,
        // GET root
        "/.well-known": { Type: "begins", Page: API.WellKnown },
        "/paste/doc/": { Type: "begins", Page: Pages.PasteDocView },
        "/paste/comments/": { Type: "begins", Page: Pages.PasteCommentsPage },
        "/paste/builder": { Page: Builder },
        "/robots.txt": { Page: API.RobotsTXT },
        "/": {
            // return paste view, will return homepage if no paste is provided
            // at the end so it tests this last because everything starts with /, which means
            // everything will get matched by this if it doesn't come before it
            Type: "begins",
            Page: Pages.GetPasteFromURL,
        },
        // POST root
        "/paste/dec/": {
            Method: "POST",
            Type: "begins",
            Page: Pages.GetPasteFromURL,
        },
    },
};

// ...start server
new Honeybee(config);
console.log("\x1b[92m[entry] Started server on port:\x1b[0m", config.Port);

// gc interval
setInterval(() => {
    Bun.gc(true);
}, 1000 * 60); // every minute
