/**
 * @file Start Bundles server
 * @name index.ts
 * @license MIT
 */

import path from "node:path";
import fs from "node:fs";

// ...BundlesDB
import BundlesDB from "./classes/db/BundlesDB";
import type { LogEvent } from "./classes/db/objects/Log";

import API from "./classes/pages/api/API";

// create global (for plugins)
import Footer, { InitFooterExtras } from "./classes/pages/components/site/Footer";
import PublishModals from "./classes/pages/components/site/modals/PublishModals";
import { ParseMarkdown } from "./classes/pages/components/Markdown";
import TopNav from "./classes/pages/components/site/TopNav";
import { Modal } from "fusion";

export type BundlesGlobalType = {
    DistDirectory: string;
    BundlesDB: typeof BundlesDB;
    Config: Config;
    Footer: typeof Footer; // needed for client theme
    TopNav: typeof TopNav;
    Modal: typeof Modal;
    _404Page: typeof _404;
    ParseMarkdown: typeof ParseMarkdown;
    Headers: {
        Default: typeof API.DefaultHeaders;
        Page: typeof API.PageHeaders;
    };
    Helpers: {
        VerifyContentType: typeof API.VerifyContentType;
    };
    Modals: {
        PublishModals: typeof PublishModals;
    };
    API: typeof API;
};

(globalThis as any).DistDirectory = process.env.IMPORT_DIR!;
(globalThis as any).Config = BundlesDB.config;
(globalThis as any).Footer = Footer;
(globalThis as any).TopNav = TopNav;
(globalThis as any).Modal = Modal;
(globalThis as any)._404Page = _404;
(globalThis as any).ParseMarkdown = ParseMarkdown;

(globalThis as any).Headers = {
    Default: API.DefaultHeaders,
    Page: API.PageHeaders,
};

(globalThis as any).Helpers = {
    VerifyContentType: API.VerifyContentType,
};

(globalThis as any).Modals = {
    PublishModals: PublishModals,
};

(globalThis as any).BundlesDB = BundlesDB;
(globalThis as any).API = API;

// includes
import "./classes/pages/assets/css/style.css";

// ...
export type Config = {
    port: number;
    name: string;
    tagline?: string;
    admin: string;
    data: string;
    config: string;
    plugin_file?: string;
    allow_access_from?: string[];
    env?: "production" | "development";
    do_not_cache?: boolean;
    app?: {
        how?: string;
        enable_search?: boolean; // true default
        enable_private_pastes?: boolean; // true default
        enable_groups?: boolean; // true default
        enable_expiry?: boolean; // true default
        enable_builder?: boolean; // true default
        enable_paste_settings?: boolean; // true default
        enable_comments?: boolean; // false default
        enable_versioning?: boolean; // false default
        enable_claim?: boolean; // false default, allows users to "repossess" unused URLs
        association_required?: boolean; // requires an association to create pastes
        auto_tag?: boolean;
        favicon?: string;
        wildcard?: boolean; // https://sntry.cc/what#wildcard-domains
        hostname?: string; // https://sntry.cc/what#wildcard-domains
        curiosity?: {
            // https://codeberg.org/hkau/curiosity/src/branch/master/README.md
            api_key: string; // needed to create profiles from server
            host: string; // needed to connect client drone script
        };
        footer?: {
            info?: string;
            show_name_on_all_pages?: boolean;
            rows: Array<{
                [key: string]: string;
            }>;
        };
        media?: {
            enabled: boolean; // note: why would this even be false?
            max_size: number; // default 52428800 (50 MB)
        };
    };
    log: {
        clear_on_start: boolean;
        events: LogEvent[];
    };
    pg?: {
        host: string;
        user: string;
        password: string;
        database: string;
        logdb?: boolean;
        max_clients?: number;
    };
};

// ...
process.env.IMPORT_DIR! =
    import.meta.dir ||
    process.env.EXECUTABLE_STATIC_DIR ||
    path.dirname(process.execPath);

if (!fs.existsSync(process.env.IMPORT_DIR))
    fs.mkdirSync(process.env.IMPORT_DIR, { recursive: true });

// check if database is new or config file does not exist
if (!(await BundlesDB.GetConfig())) {
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
    console.log("\x1b[94mBundles Setup\x1b[0m");
    div();

    config.port = parseInt(optional("\x1b[92mEnter port\x1b[0m", 8080, "PORT"));
    config.name = optional(
        "\x1b[92mEnter application name\x1b[0m",
        "Bundles",
        "NAME"
    );

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

    // prefill extra values
    config.app = {
        auto_tag: false,
    };

    config.log = { clear_on_start: true, events: [] };

    // save file
    await Bun.write(BundlesDB.ConfigLocation, JSON.stringify(config, undefined, 4));
    await BundlesDB.GetConfig();

    // exit
    console.log(
        "\x1b[92m[exit]\x1b[0m Please restart the Bundles server, this is to prevent bugs relating to how fast the disk writes the config file."
    );

    process.exit(0);
}

// create server
import Honeybee, { HoneybeeConfig } from "honeybee";

// ...import endpoints
import _404, { _404Page } from "./classes/pages/components/404";
import Builder from "./classes/pages/components/builder";
import AdminAPI from "./classes/pages/api/AdminAPI";
import Repos from "./classes/pages/repos/Repos";
import Admin from "./classes/pages/Admin";
import Pages from "./classes/pages/Pages";

// get plugins
export let plugins: HoneybeeConfig["Pages"] = {};
await BundlesDB.GetConfig();

if (BundlesDB.config.plugin_file) {
    const Path = BundlesDB.config.plugin_file.replace(":cwd", process.cwd());

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
export const ServerConfig: HoneybeeConfig = {
    Port:
        process.env.FORCE_PORT !== undefined
            ? parseInt(process.env.FORCE_PORT)
            : BundlesDB.config.port || 8080,
    AssetsDir: process.env.IMPORT_DIR!,
    NotFoundPage: _404Page({}),
    maxRequestBodySize: parseFloat(process.env.MAX_BODY_SIZE || "52428800"),
    Pages: {
        // GET admin
        "/admin": { Page: Admin.Login },
        "/admin/": { Page: Admin.Login },
        "/admin/login": { Page: Admin.Login },
        "/admin/login/": { Page: Admin.Login },

        // GET api
        "/api/ip": { Page: API.WhatIsMyIP },

        // ...pastes
        "/api/get": { Type: "begins", Page: API.GetPasteRecord },
        "/api/group": { Type: "begins", Page: API.GetAllPastesInGroup },
        "/api/owner": { Type: "begins", Page: API.GetAllPastesOwnedByPaste },
        "/api/raw": { Type: "begins", Page: API.GetRawPaste },
        "/api/exists": { Type: "begins", Page: API.PasteExists },
        "/api/html": { Type: "begins", Page: API.GetPasteHTML },
        // ...comments
        "/api/comments": { Type: "begins", Page: API.GetPasteComments },
        // ...media
        "/api/media/file/": { Type: "begins", Page: Pages.InspectMedia }, // alias of /f
        // ...social
        "/api/social/get/": { Type: "begins", Page: API.GetSocialProfile },
        // ...dist
        "/api/hashes": { Page: API.HashList },
        "/api/dist/": { Type: "begins", Page: API.Distribution },

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
        "/admin/metadata": { Method: "POST", Page: Admin.MetadataEditor },
        "/admin/plugins": { Method: "POST", Page: Admin.PluginsPage },
        "/admin/api/delete": { Method: "POST", Page: AdminAPI.APIDeletePaste },
        "/admin/api/export": { Method: "POST", Page: AdminAPI.APIExport },
        "/admin/api/import": { Method: "POST", Page: AdminAPI.APIImport },
        "/admin/api/import/json": { Method: "POST", Page: AdminAPI.APIImportRaw },
        "/admin/api/logs/import/json": {
            Method: "POST",
            Page: AdminAPI.APIImportLogsRaw,
        },
        "/admin/api/mass-delete": { Method: "POST", Page: AdminAPI.APIMassDelete },
        "/admin/api/sql": { Method: "POST", Page: AdminAPI.APISQL },
        "/admin/api/logs/export": { Method: "POST", Page: AdminAPI.APIExportLogs },
        "/admin/api/logs/users": { Method: "POST", Page: AdminAPI.APIGetUsers },
        "/admin/api/logs/mass-delete": {
            Method: "POST",
            Page: AdminAPI.APIMassDeleteLogs,
        },
        "/admin/api/config.json": {
            Method: "POST",
            Page: AdminAPI.APIExportConfig,
        },

        // POST api

        // ...pastes
        "/api/new": { Method: "POST", Page: API.CreatePaste },
        "/api/edit": { Method: "POST", Page: API.EditPaste },
        "/api/delete": { Method: "POST", Page: API.DeletePaste },
        "/api/decrypt": { Method: "POST", Page: API.DecryptPaste },
        // ...comments
        "/api/comments/delete": {
            Type: "begins",
            Method: "POST",
            Page: API.DeleteComment,
        },
        // ...login
        "/api/associate": { Method: "POST", Page: API.PasteLogin },
        "/api/disassociate": { Method: "POST", Page: API.PasteLogout },
        // ...metadata
        "/api/metadata": { Method: "POST", Page: API.EditMetadata },
        // ...media
        "/api/media/upload": { Method: "POST", Page: API.UploadFile },
        "/api/media/delete": { Method: "POST", Page: API.DeleteFile },
        // ...misc
        "/api/markdown": { Method: "POST", Page: API.RenderMarkdown },
        "/api/domain": { Method: "POST", Page: API.UpdateCustomDomain },
        "/api/claim": { Type: "begins", Method: "POST", Page: API.CreateURLClaim },
        "/api/json": { Type: "begins", Method: "POST", Page: API.JSONAPI },

        // GET search
        "/search": { Page: Pages.PastesSearch },

        // (any) plugins
        ...plugins,

        // GET user
        "/paste/settings": { Type: "begins", Page: Pages.UserSettings }, // alias of /s
        "/s": { Type: "begins", Page: Pages.UserSettings },
        "/paste/media/": { Type: "begins", Page: Pages.ViewPasteMedia },
        "/f/": { Type: "begins", Page: Pages.InspectMedia }, // view file
        "/paste/notifications": { Page: Pages.Notifications },

        // GET builder
        "/paste/builder": { Page: Builder.Builder },

        // GET repos
        "/c/": { Type: "begins", Page: Pages.PasteCommentsPage },
        "/r/diff/": { Type: "begins", Page: Repos.DiffView },
        "/r/rev/": { Type: "begins", Page: Repos.RevisionsList },
        "/r/": { Type: "begins", Page: Repos.RepoView },

        // GET root
        "/paste/doc/": { Type: "begins", Page: Pages.PasteDocView },
        "/paste/comments/": { Type: "begins", Page: Pages.PasteCommentsPage }, // alias of /c/
        "/robots.txt": { Page: API.RobotsTXT },
        "/favicon": { Page: API.Favicon },
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
const server = new Honeybee(ServerConfig);
console.log(
    "\x1b[30;42m info \x1b[0m Started server at:\x1b[93m",
    (
        server.server.url ||
        new URL(`http://${server.server.hostname}:${server.server.port}`)
    ).href,
    "\x1b[0m"
);

// gc interval
setInterval(() => {
    Bun.gc(false);
}, 1000 * 60); // every minute
