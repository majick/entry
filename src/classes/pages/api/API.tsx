/**
 * @file Handle API endpoints
 * @name API.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";
import { Server, SocketAddress } from "bun";
import punycode from "node:punycode";
import path from "node:path";
import fs from "node:fs";

// import components
import _404Page from "../components/404";
import Pages from "../Pages";

// create database
import { CreateHash, Decrypt } from "../../db/helpers/Hash";
import BaseParser from "../../db/helpers/BaseParser";

import type { Paste, PasteMetadata } from "../../db/objects/Paste";
import EntryDB from "../../db/EntryDB";

await EntryDB.GetConfig();
export const db = new EntryDB();

import pack from "../../../../package.json";
import { Config } from "../../..";

// ...
import { ParseMarkdown } from "../components/Markdown";
import SQL from "../../db/helpers/SQL";

// headers
export const DefaultHeaders = {
    "Cache-Control":
        // check "do not cache"
        process.env.DO_NOT_CACHE !== "true"
            ? // use normal cache
              "public, max-age=604800, must-revalidate"
            : // jk, we're still gonna cache... but not as long and not public
              "private, max-age=86400, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    Vary: "Accept-Encoding",
    "Content-Security-Policy":
        process.env.CONTENT_SECURITY_POLICY ||
        [
            "default-src 'self' blob:",
            "img-src * data:",
            "font-src *",
            "style-src 'unsafe-inline' 'self' blob: *",
            "script-src 'self' 'unsafe-inline' blob:",
            "object-src 'self' blob:",
            "upgrade-insecure-requests",
            "connect-src *",
        ].join("; "),
    "X-Entry-Version": pack.version,
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "same-origin",
};

export const PageHeaders: { [key: string]: string } = {
    ...DefaultHeaders,
    "Cache-Control": "no-cache",
};

/**
 * @function VerifyContentType
 *
 * @export
 * @param {Request} request
 * @param {string} expected
 * @return {(Response | undefined)}
 */
export function VerifyContentType(
    request: Request,
    expected: string
): Response | undefined {
    // verify content type
    if (!(request.headers.get("Content-Type") || "").startsWith(expected))
        return new Response(`Expected ${expected}`, {
            status: 406,
            headers: {
                ...DefaultHeaders,
                Accept: expected,
            },
        });

    // return undefined if it is fine
    return undefined;
}

/**
 * @function GetCookie
 *
 * @export
 * @param {string} cookie full cookie string
 * @param {string} key key to search for
 * @return {(string | undefined)}
 */
export function GetCookie(cookie: string, key: string): string | undefined {
    const value = cookie.split(`${key}=`)[1];
    if (!value) return undefined;
    return value.split(";")[0];
}

/**
 * @function Session
 * @description Manage session on request
 *
 * @export
 * @param {Request} request
 * @return {Promise<string>}
 */
export async function Session(request: Request): Promise<string> {
    const config = (await EntryDB.GetConfig()) as Config;
    if (!config.log || !config.log.events.includes("session")) return ""; // sessions are disabled

    // generate session if it doesn't exist
    let session = GetCookie(request.headers.get("Cookie") || "", "session-id");

    if (!session) {
        const UA = request.headers.get("User-Agent") || "?";

        // UA must start with "Mozilla/5.0" and must NOT start with "Mozilla/5.0 (compatible"
        // if something doesn't match these rules, it is likely a bot and shouldn't be given a session
        if (
            !UA.startsWith("Mozilla/5.0") ||
            UA.startsWith("Mozilla/5.0 (compatible") ||
            UA.includes("bot")
        )
            return (session = "");

        // create log
        const ses_log = await EntryDB.Logs.CreateLog({
            Content: UA,
            Type: "session",
        });

        if (ses_log[0] === false) return (session = ""); // failed to make session, set session nothing

        session = `session-id=${
            ses_log[2].ID // add newest token
        }; SameSite=Strict; Secure; Path=/; HostOnly=true; HttpOnly=true; Max-Age=${
            60 * 60 * 24 * 64
        }`;
    } else {
        // validate session
        const ses_log = await EntryDB.Logs.GetLog(session);

        // set token to expire if log no longer exists
        if (!ses_log[0] && !ses_log[2])
            session =
                "session-id=refresh; SameSite=Strict; Secure; Path=/; Max-Age=0";
        // otherwise, return nothing (no need to set cookie, it already exists)
        else session = "";
    }

    // return
    return session;
}

/**
 * @function GetAssociation
 *
 * @export
 * @param {Request} request
 * @return {Promise<[boolean, string]>}
 */
export async function GetAssociation(
    request: Request,
    ip: SocketAddress | null,
    UpdateOnly: boolean = false,
    SetAssociation?: string,
    Delete: boolean = false
): Promise<[boolean, string]> {
    const config = (await EntryDB.GetConfig()) as Config;
    if (!config.log || !config.log.events.includes("session"))
        return [false, "Sessions are disabled"];

    // encode SetAssociation with punycode
    if (SetAssociation) SetAssociation = punycode.toASCII(SetAssociation);

    // get session
    const session = GetCookie(request.headers.get("Cookie") || "", "session-id");
    const association = GetCookie(request.headers.get("Cookie") || "", "associated");

    // make sure session exists
    if (!session) return [false, "Session does not exist"];
    else {
        // try to get session log
        const log = await EntryDB.Logs.GetLog(session);
        if (!log[0] || !log[2]) return [false, "Failed to get session log"];

        // check if session has an association
        const split = log[2].Content.split(";_with;");

        // update only...
        if (UpdateOnly) {
            // update log
            await EntryDB.Logs.UpdateLog(
                log[2].ID,
                `${log[2].Content.split(";_")[0]}${
                    ip !== null ? `;_ip;${ip.address}` : ""
                };_with;${SetAssociation}`
            );

            return [
                true,
                `associated=${SetAssociation}; SameSite=Strict; Secure; Path=/; HostOnly=true; HttpOnly=true; Max-Age=${
                    60 * 60 * 24 * 365
                }`,
            ];
        } else if (Delete) {
            // update log to remove association
            await EntryDB.Logs.UpdateLog(log[2].ID, log[2].Content.split(";_")[0]);
            return [true, ""];
        }

        // ...
        if (split[1])
            if (association !== split[1])
                // if association exists, but does not match what is in the log... reset!!
                return [
                    true,
                    `associated=${punycode.toASCII(
                        split[1]
                    )}; SameSite=Strict; Secure; Path=/; HostOnly=true; HttpOnly=true; Max-Age=${
                        60 * 60 * 24 * 365
                    }`,
                ];
            // otherwise, return associated paste
            else return [true, punycode.toASCII(split[1])];
        else if (association)
            // remove association if session does not have an association
            return [
                true,
                `associated=refresh; SameSite=Lax; Secure; Path=/; Max-Age=0`,
            ];
    }

    // default return
    return [false, ""];
}

/**
 * @export
 * @class WellKnown
 * @implements {Endpoint}
 */
export class WellKnown implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        function ReturnJSON(json: { [key: string]: any }): Response {
            return new Response(JSON.stringify(json), {
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }

        // nodeinfo
        if (url.pathname === "/.well-known/nodeinfo")
            return ReturnJSON({
                links: [
                    {
                        rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
                        href: `${url.origin}/.well-known/nodeinfo/2.0`,
                    },
                ],
            });
        else if (url.pathname === "/.well-known/nodeinfo/2.0")
            return ReturnJSON({
                version: "2.0",
                software: {
                    name: "entry",
                    version: pack.version,
                },
                protocols: ["entry"],
                services: {
                    outbound: [],
                    inbound: [],
                },
                usage: {
                    users: {
                        // we're going to use total to display number of sessions...
                        total:
                            (EntryDB.Logs &&
                                (
                                    await EntryDB.Logs.QueryLogs(
                                        "\"Type\" = 'session'"
                                    )
                                )[2].length - 1) ||
                            0,
                        activeMonth: 0,
                        activeHalfyear: 0,
                    },
                    // this, however, we can supply
                    localPosts: (
                        await db.GetAllPastes(true, true, '"CustomURL" IS NOT NULL')
                    ).length,
                },
                openRegistrations: false, // there is no registration at all
                metadata: {},
            });

        // default
        return new _404Page().request(request);
    }
}

/**
 * @export
 * @class RobotsTXT
 * @implements {Endpoint}
 */
export class RobotsTXT implements Endpoint {
    async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // check if this is from a wildcard match
        if (
            EntryDB.config.app &&
            EntryDB.config.app.wildcard &&
            EntryDB.config.app.hostname
        ) {
            const subdomain = url.hostname.split(
                `.${EntryDB.config.app.hostname}`
            )[0];

            const IsFromWildcard =
                subdomain &&
                subdomain !== EntryDB.config.app.hostname &&
                subdomain !== "www";

            // return disallow all if from wildcard
            if (IsFromWildcard)
                return new Response(`User-agent: *\nDisallow: /`, {
                    headers: {
                        "Content-Type": "text/plain",
                    },
                });
        }

        // return
        return new Response(
            `User-agent: *\nAllow: /\nDisallow: /api${[
                "",
                "/admin",
                "/paste",
                "/*?",
            ].join("\nDisallow: ")}`,
            {
                headers: {
                    "Content-Type": "text/plain",
                },
            }
        );
    }
}

/**
 * @export
 * @class Favicon
 * @implements {Endpoint}
 */
export class Favicon implements Endpoint {
    async request(request: Request): Promise<Response> {
        if (!EntryDB.config.app || !EntryDB.config.app.favicon)
            return new _404Page().request(request);

        // return
        return new Response(Bun.file(EntryDB.config.app.favicon));
    }
}

/**
 * @export
 * @class WSAS
 * @implements {Endpoint}
 */
export class WSAS implements Endpoint {
    async request(request: Request, server: Server): Promise<Response> {
        const success = server.upgrade(request);

        return success
            ? new Response("Upgraded")
            : new Response("WebSocket upgrade error", { status: 400 });
    }
}

let HashStore: { [key: string]: string } = {}; // store file hashes BY PATH
let DistHashStore: { [key: string]: string } = {}; // store distribution file hashes BY PATH

/**
 * @export
 * @class HashList
 * @implements {Endpoint}
 */
export class HashList implements Endpoint {
    public async request(
        request: Request,
        server?: Server | undefined
    ): Promise<Response> {
        const url = new URL(request.url);
        const dir =
            url.searchParams.get("t") !== "dist"
                ? process.env.IMPORT_DIR!
                : process.env.DIST_DIR || process.env.IMPORT_DIR!;

        const Store =
            url.searchParams.get("t") !== "dist" ? HashStore : DistHashStore;

        // fill hashes for all files (if they don't already exist)
        async function ReadDir(dir: string) {
            for (let file of fs.readdirSync(dir)) {
                if (Store[file]) continue;

                // check if file is a directory
                if (fs.lstatSync(path.resolve(dir, file)).isDirectory()) {
                    await ReadDir(path.resolve(dir, file));
                    continue;
                }

                // ...read hash
                const hash = CreateHash(
                    await Bun.file(path.resolve(dir, file)).text()
                );

                // ...store hash
                if (dir.endsWith("components")) file = `components/${file}`;
                if (!Store[file]) Store[file] = hash;
            }
        }

        ReadDir(dir);

        // return
        return new Response(JSON.stringify(Store, undefined, 4), {
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class Distribution
 * @implements {Endpoint}
 */
export class Distribution implements Endpoint {
    public async request(
        request: Request,
        server?: Server | undefined
    ): Promise<Response> {
        const url = new URL(request.url);

        const FilePath = path.resolve(
            process.env.DIST_DIR || process.env.IMPORT_DIR!,
            url.pathname.split("/api/dist/")[1]
        );

        const ContentType = contentType(path.extname(FilePath));

        if (fs.existsSync(FilePath))
            return new Response(await Bun.file(FilePath).arrayBuffer(), {
                headers: {
                    "Content-Type": ContentType || "application/octet-stream",
                },
            });

        return new _404Page().request(request);
    }
}

/**
 * @export
 * @class CreatePaste
 * @implements {Endpoint}
 */
export class CreatePaste implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const _ip = server !== undefined ? server.requestIP(request) : null;

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as Paste;
        body.Content = decodeURIComponent(body.Content);

        if (body.CustomURL) body.CustomURL = body.CustomURL.toLowerCase();

        // make sure association is correct
        const Association = await GetAssociation(request, null);

        // load associated
        if (!Association[1].startsWith("associated=refresh"))
            body.Associated = Association[1];

        // if servers requires an association, make sure we have one
        if (
            EntryDB.config.app &&
            EntryDB.config.app.association_required === true &&
            !body.Associated
        )
            return new Response("Association required!", {
                status: 302,
                headers: {
                    Location:
                        "/?err=This server requires a paste association to create new pastes",
                    "X-Entry-Error":
                        "This server requires a paste association to create new pastes",
                },
            });

        // create paste
        const result = await db.CreatePaste(body);

        // add CommentOn and ReportOn if content starts with _builder:
        if (result[0] === true && result[2].Content.startsWith("_builder:")) {
            body.CommentOn = "";
            body.ReportOn = "";
        }

        // add association to session
        if (
            // can't (shouldn't) set association with a comment
            !body.CommentOn &&
            !body.ReportOn &&
            // make sure auto_tag is enabled
            (!EntryDB.config.app || EntryDB.config.app.auto_tag !== false)
        ) {
            // update association with this paste
            const UpdateResult = await GetAssociation(
                request,
                _ip,
                true,
                body.CustomURL
            );

            if (UpdateResult[0] === true) Association[1] = UpdateResult[1];

            // update curiosity
            if (EntryDB.config.app && EntryDB.config.app.curiosity)
                await fetch(
                    `${EntryDB.config.app.curiosity.host}/api/profiles/create?c=json`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            APIKey: EntryDB.config.app.curiosity.api_key,
                            ID: body.CustomURL,
                            Type: "entry_paste_user",
                        }),
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
        }

        // if result[0] IS NOT TRUE, set association to nothing!!! this makes sure
        // people don't get associated with a paste that is already taken...
        if (result[0] !== true) {
            Association[1] = ""; // clear association

            // remove from session
            GetAssociation(request, _ip, false, undefined, true);
        }

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json; charset=utf-8",
                Location:
                    result[0] === true
                        ? // if successful, redirect to paste
                          body.CommentOn === ""
                            ? body.ReportOn === ""
                                ? `/${
                                      result[2].CustomURL
                                  }?UnhashedEditPassword=${punycode.toASCII(
                                      result[2].UnhashedEditPassword!
                                  )}`
                                : "/?msg=Paste reported!"
                            : `/c/${body.CommentOn}?msg=Comment posted!`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(result[1])}`,
                "X-Entry-Error": result[1],
                "Set-Cookie": Association[1],
            },
        });
    }
}

/**
 * @export
 * @class GetPasteRecord
 * @implements {Endpoint}
 */
export class GetPasteRecord implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste

        let paste = (await db.GetPasteFromURL(
            url.pathname.slice("/api/get/".length, url.pathname.length)
        )) as Paste;

        if (paste) paste = db.CleanPaste(paste); // <- this is VERY important, we don't want to send passwords back!!!

        // return
        return new Response(JSON.stringify(paste || { Content: "404: Not Found" }), {
            status: paste ? 200 : 404,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }
}

/**
 * @export
 * @class EditPaste
 * @implements {Endpoint}
 */
export class EditPaste implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const _ip = server !== undefined ? server.requestIP(request) : null;
        const url = new URL(request.url);

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        if (body.OldContent) body.OldContent = decodeURIComponent(body.OldContent);
        else body.OldContent = decodeURIComponent(body.Content);

        if (body.Content) body.Content = decodeURIComponent(body.Content);
        else body.Content = decodeURIComponent(body.OldContent);

        body.OldURL = body.OldURL.toLowerCase();
        if (body.NewURL) body.NewURL = body.NewURL.toLowerCase();

        // get paste
        const paste = await db.GetPasteFromURL(body.OldURL);
        if (!paste) return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);

        // check NewEditPassword length
        if (
            // if NewEditPassword is less than the expected length, set it to the old edit password
            body.NewEditPassword.length < EntryDB.MinPasswordLength &&
            // verify this supplied EditPassword
            CreateHash(body.EditPassword) === paste.EditPassword
        )
            body.NewEditPassword = body.EditPassword;

        // add metadata to content
        if (paste.Metadata)
            body.Content += `_metadata:${BaseParser.stringify(paste.Metadata)}`;

        // edit paste
        const result = await db.EditPaste(
            {
                Content: body.OldContent,
                EditPassword: body.EditPassword ? body.EditPassword : undefined,
                CustomURL: body.OldURL,
                PubDate: 0,
                EditDate: 0,
                ViewPassword: (paste || { ViewPassword: "" }).ViewPassword,
                Associated: Association[0] ? Association[1] : undefined,
            },
            {
                Content: body.Content,
                EditPassword: body.NewEditPassword
                    ? body.NewEditPassword
                    : body.EditPassword,
                CustomURL: body.NewURL || body.OldURL,
                PubDate: (paste || { PubDate: 0 }).PubDate!,
                EditDate: new Date().getTime(),
                ViewPassword: (paste || { ViewPassword: "" }).ViewPassword,
            },
            false,
            url.searchParams.get("draft") === "true"
        );

        // remove association from all associated sessions if the password has changed
        if (
            body.NewEditPassword &&
            body.NewEditPassword !== body.EditPassword &&
            result[0]
        ) {
            const Sessions = await EntryDB.Logs.QueryLogs(
                `"Type" = \'session\' AND \"Content\" LIKE \'%;_with;${paste.CustomURL}\'`
            );

            if (Sessions[2])
                // remove association
                for (const session of Sessions[2])
                    await EntryDB.Logs.UpdateLog(
                        session.ID,
                        session.Content.split(";_")[0]
                    );
        }

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json; charset=utf-8",
                Location:
                    result[0] === true
                        ? // if successful, redirect to paste
                          `/${result[2].CustomURL}${
                              url.searchParams.get("draft") === "true"
                                  ? "?r=latest"
                                  : ""
                          }`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(result[1])}&mode=edit&OldURL=${
                              result[2].CustomURL
                          }`,
                "X-Entry-Error": result[1],
            },
        });
    }
}

/**
 * @export
 * @class DeletePaste
 * @implements {Endpoint}
 */
export class DeletePaste implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;
        // body.password is automatically hashed in db.DeletePaste
        body.CustomURL = body.CustomURL.toLowerCase();

        // delete paste

        const result = await db.DeletePaste(
            {
                CustomURL: body.CustomURL,
            },
            punycode.toASCII(body.EditPassword)
        );

        // remove association from all associated sessions if the password has changed
        if (body.NewEditPassword && result[0]) {
            const Sessions = await EntryDB.Logs.QueryLogs(
                `"Type" = \'session\' AND \"Content\" LIKE \'%;_with;${body.CustomURL}\'`
            );

            if (Sessions[2])
                // remove association
                for (const session of Sessions[2])
                    await EntryDB.Logs.UpdateLog(
                        session.ID,
                        session.Content.split(";_")[0]
                    );
        }

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json; charset=utf-8",
                Location:
                    result[0] === true
                        ? // if successful, redirect to home
                          `/?msg=${encodeURIComponent(result[1])}`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(result[1])}&mode=edit&OldURL=${
                              result[2].CustomURL
                          }`,
                "X-Entry-Error": result[1],
            },
        });
    }
}

/**
 * @function DecryptPaste
 *
 * @export
 * @class DecryptPaste
 * @implements {Endpoint}
 */
export class DecryptPaste implements Endpoint {
    public async GetDecrypted(body: Partial<Paste>): Promise<string | undefined> {
        if (!body.CustomURL) return undefined;

        // get paste

        const paste = (await db.GetPasteFromURL(body.CustomURL)) as Paste;
        if (!paste) return undefined;

        // get encryption information
        const enc = await db.GetEncryptionInfo(
            CreateHash(body.ViewPassword || ""),
            body.CustomURL
        );

        if (!enc[0]) return undefined;

        // decrypt and return
        return Decrypt(
            paste.Content.split("_metadata:")[0],
            enc[1].key,
            enc[1].iv,
            enc[1].auth
        );
    }

    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as Paste;

        // get decrypted
        const decrypted = await this.GetDecrypted(body);
        if (!decrypted)
            return new Response("Failed to decrypt", {
                status: 400,
                headers: {
                    "X-Entry-Error": "Failed to decrypt",
                },
            });

        // return
        return new Response(decrypted);
    }
}

/**
 * @export
 * @class GetAllPastesInGroup
 * @implements {Endpoint}
 */
export class GetAllPastesInGroup implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get pastes
        const pastes = await db.GetAllPastesInGroup(
            // if no group is provided this will return all pastes with no group
            url.pathname.slice("/api/group/".length, url.pathname.length) || ""
        );

        // return
        return new Response(JSON.stringify(pastes), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json; charset=utf-8",
            },
        });
    }
}

/**
 * @export
 * @class GetRawPaste
 * @implements {Endpoint}
 */
export class GetRawPaste implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        const name = url.pathname.slice("/api/raw/".length, url.pathname.length);

        // return home if name === ""
        if (name === "") return new _404Page().request(request);

        // attempt to get paste

        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);

        // check PrivateSource value
        if (
            result.Metadata &&
            result.Metadata.PrivateSource === true &&
            result.Metadata.Owner &&
            result.Metadata.Owner !== Association[1]
        )
            return new _404Page().request(request);

        // return
        return new Response(result!.Content, {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "X-Paste-PubDate": result.PubDate.toString(),
                "X-Paste-EditDate": result.EditDate.toString(),
                "X-Paste-GroupName": result.GroupName || "",
                "X-Frame-Options": "",
            },
        });
    }
}

/**
 * @export
 * @class PasteExists
 * @implements {Endpoint}
 */
export class PasteExists implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        const name = url.pathname.slice("/api/exists/".length, url.pathname.length);

        // return home if name === ""
        if (name === "") return new _404Page().request(request);

        // attempt to get paste

        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result)
            return new Response("false", {
                status: 200,
            });

        // return
        return new Response("true", {
            status: 200,
        });
    }
}

/**
 * @export
 * @class RenderMarkdown
 * @implements {Endpoint}
 */
export class RenderMarkdown implements Endpoint {
    public static async Render(body: string, toc: boolean = false): Promise<string> {
        return toc !== true
            ? // only render markdown
              await ParseMarkdown(body)
            : // only render toc
              (await ParseMarkdown(`[TOC]\n{{@TABLE_OF_CONTENTS}}\n${body}`)).split(
                  "{{@TABLE_OF_CONTENTS}}"
              )[0];
    }

    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "text/markdown");
        if (WrongType) return WrongType;

        // get url
        const url = new URL(request.url);

        // get request body
        const body = await request.text();

        // render
        const rendered = await RenderMarkdown.Render(
            body,
            url.searchParams.get("toc") === "true"
        );

        // return
        return new Response(rendered, {
            status: 200,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "text/html; charset=utf-8",
                "X-Frame-Options": "",
            },
        });
    }
}

/**
 * @export
 * @class GetPasteHTML
 * @implements {Endpoint}
 */
export class GetPasteHTML implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        const name = url.pathname.slice("/api/html/".length, url.pathname.length);

        // return home if name === ""
        if (name === "") return new _404Page().request(request);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);

        // check PrivateSource value
        if (
            result.Metadata &&
            result.Metadata.PrivateSource === true &&
            result.Metadata.Owner &&
            result.Metadata.Owner !== Association[1]
        )
            return new _404Page().request(request);

        // render
        const rendered = Renderer.Render(
            <>
                <div
                    id={"editor-tab-preview"}
                    dangerouslySetInnerHTML={{
                        __html: await ParseMarkdown(result.Content),
                    }}
                />

                <script
                    type="module"
                    dangerouslySetInnerHTML={{
                        __html: `import fix from "/ClientFixMarkdown.js"; fix();`,
                    }}
                />
            </>,
            <>
                <title>{result.CustomURL}</title>
                <link rel="icon" href="/favicon" />
            </>
        );

        // return
        return new Response(rendered, {
            status: 200,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "text/html; charset=utf-8",
                "X-Frame-Options": "",
            },
        });
    }
}

/**
 * @export
 * @class JSONAPI
 * @description Forward API requests from JSON to formdata
 * @implements {Endpoint}
 */
export class JSONAPI implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "application/json");
        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get url
        const url = new URL(request.url);

        // create formdata body
        let body: string[] = [];

        // ...fill formdata body
        for (const [key, value] of Object.entries(await request.json()))
            body.push(`${key}=${value}`);

        // forward request
        const res = await db.ForwardRequest(
            url.host,
            url.pathname.substring("/api/json/".length),
            body,
            request.method,
            url.protocol.includes("https")
        );

        // return
        return res[1];
    }
}

/**
 * @export
 * @class DeleteComment
 * @implements {Endpoint}
 */
export class DeleteComment implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return new _404Page().request(request);
        if (paste.HostServer) return new _404Page().request(request);

        // check association
        const association = await GetAssociation(request, null);

        if (!association[0])
            return new Response("You must be associated with a paste to do this", {
                status: 401,
            });

        if (
            // if paste does not have metadata OR we're not the paste owner, say we can'do that
            !paste.Metadata ||
            (paste.Metadata && association[1] !== paste.Metadata.Owner)
        )
            return new Response(
                "Cannot delete comments on a paste you're not associated with! Please change your paste association.",
                { status: 401 }
            );

        // make sure paste isn't locked
        if (paste.Metadata && paste.Metadata.Locked)
            return new Response(
                "Cannot delete comments while your paste is locked."
            );

        // delete paste
        const result = await db.DeletePaste(
            {
                CustomURL: body.CommentURL,
            },
            EntryDB.config.admin // delete using admin password
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Location: `/c/${paste.CustomURL}?edit=true&UnhashedEditPassword=${body.EditPassword}&msg=Comment deleted!`,
                "Set-Cookie": association[1].startsWith("associated")
                    ? association[1]
                    : "",
            },
        });
    }
}

/**
 * @export
 * @class PasteLogin
 * @implements {Endpoint}
 */
export class PasteLogin implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const _ip = server !== undefined ? server.requestIP(request) : null;

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return new _404Page().request(request);
        if (paste.HostServer) return new _404Page().request(request);

        // check edit password
        if (
            paste.EditPassword !== CreateHash(body.EditPassword) &&
            body.EditPassword !== EntryDB.config.admin
        )
            return new Response("Incorrect password", {
                status: 302,
                headers: {
                    Location: "/?err=Incorrect password",
                    "X-Entry-Error": "Incorrect password",
                },
            });

        // generate association
        await GetAssociation(request, _ip, true, body.CustomURL);

        // create profile
        if (EntryDB.config.app && EntryDB.config.app.curiosity)
            await fetch(
                `${EntryDB.config.app.curiosity.host}/api/profiles/create?c=json`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        APIKey: EntryDB.config.app.curiosity.api_key,
                        ID: body.CustomURL,
                        Type: "entry_paste_user",
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

        // return
        return new Response(paste.CustomURL, {
            status: 302,
            headers: {
                Location: `/?msg=Associated as ${encodeURIComponent(
                    paste.CustomURL || ""
                )}`,
                "Set-Cookie": `associated=${
                    paste.CustomURL
                }; SameSite=Lax; Secure; Path=/; HostOnly=true; HttpOnly=true; Max-Age=${
                    60 * 60 * 24 * 365
                }`,
            },
        });
    }
}

/**
 * @export
 * @class PasteLogout
 * @implements {Endpoint}
 */
export class PasteLogout implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // get customurl
        const CustomURL = GetCookie(
            request.headers.get("Cookie")! || "",
            "associated"
        );

        if (!CustomURL)
            return new Response("You must be associated with a paste to do this", {
                status: 401,
            });

        // get paste
        const paste = await db.GetPasteFromURL(CustomURL);

        // if paste doesn't exist, remove association (skip all checks)
        if (!paste) {
            // remove association from session
            await GetAssociation(request, null, false, "", true);

            // return
            return new Response(CustomURL, {
                status: 302,
                headers: {
                    Location: `/?msg=Removed association with ${encodeURIComponent(
                        CustomURL
                    )}`,
                    "Set-Cookie": `associated=refresh; SameSite=Lax; Secure; Path=/; Max-Age=0`,
                },
            });
        }

        // ...
        if (paste.HostServer) return new _404Page().request(request); // can't post comments as a paste from another server... right now!

        // make sure paste isn't locked
        if (paste.Metadata && paste.Metadata.Locked === true)
            return new Response(
                "Cannot remove association with this paste while it is locked.",
                {
                    status: 302,
                    headers: {
                        Location:
                            "/?err=Cannot remove association with this paste while it is locked.",
                        "X-Entry-Erorr":
                            "Cannot remove association with this paste while it is locked.",
                    },
                }
            );

        // remove association from session
        await GetAssociation(request, null, false, "", true);

        // delete profile
        if (EntryDB.config.app && EntryDB.config.app.curiosity)
            await fetch(
                `${EntryDB.config.app.curiosity.host}/api/profiles/delete?c=json`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        APIKey: EntryDB.config.app.curiosity.api_key,
                        ID: paste.CustomURL,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

        // return
        return new Response(paste.CustomURL, {
            status: 302,
            headers: {
                Location: `/?msg=Removed association with ${encodeURIComponent(
                    paste.CustomURL || ""
                )}`,
                "Set-Cookie": `associated=refresh; SameSite=Lax; Secure; Path=/; Max-Age=0`,
            },
        });
    }
}

/**
 * @export
 * @class APIEditMetadata
 * @implements {Endpoint}
 */
export class EditMetadata implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        if (!body.Metadata) return new Response("You changed nothing!");

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL, false, true); // do not fetch from cache!
        if (!paste) return new _404Page().request(request);

        // get association
        const _ip = server !== undefined ? server.requestIP(request) : null;
        const Association = await GetAssociation(request, _ip);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // validate password
        const admin =
            CreateHash(body.EditPassword) === CreateHash(EntryDB.config.admin);

        if (
            // if we used the wrong password
            paste.EditPassword !== CreateHash(body.EditPassword) &&
            // ...and we're not using the admin password
            !admin &&
            // ...and we're not the owner of the paste
            (!Association[0] ||
                !paste.Metadata ||
                Association[1] !== paste.Metadata!.Owner)
        )
            return new Response("Invalid password", {
                status: 302,
                headers: {
                    Location: "/?err=Cannot edit metadata: Invalid password!",
                    "X-Entry-Error": "Cannot edit metadata: Invalid password!",
                },
            });

        // make sure paste isn't locked... as long EditPassword isn't the edit password!
        if (!admin && paste.Metadata && paste.Metadata.Locked === true)
            return new Response("Invalid password", {
                status: 302,
                headers: {
                    Location: "/?err=Cannot edit metadata: Paste is locked",
                    "X-Entry-Error": "Cannot edit metadata: Paste is locked",
                },
            });

        // unpack metadata
        const Unpacked = BaseParser.parse(body.Metadata) as PasteMetadata;

        // if !admin, force some values to be kept the way they are
        if (!admin && paste.Metadata) {
            // these are the only values that will actually be updated!
            paste.Metadata.Owner = Unpacked.Owner;
            paste.Metadata.ShowViewCount = Unpacked.ShowViewCount;
            paste.Metadata.ShowOwnerEnabled = Unpacked.ShowOwnerEnabled;
            paste.Metadata.Favicon = Unpacked.Favicon;
            paste.Metadata.Title = Unpacked.Title;
            paste.Metadata.Description = Unpacked.Description;
            paste.Metadata.EmbedColor = Unpacked.EmbedColor;
            paste.Metadata.EmbedImage = Unpacked.EmbedImage;
            paste.Metadata.PrivateSource = Unpacked.PrivateSource;
            paste.Metadata.SocialIcon = Unpacked.SocialIcon;

            if (Unpacked.Comments)
                if (!paste.Metadata.Comments)
                    paste.Metadata.Comments = Unpacked.Comments;
                else {
                    paste.Metadata.Comments.Enabled = Unpacked.Comments!.Enabled;
                    paste.Metadata.Comments.Filter = Unpacked.Comments!.Filter;
                }
        } else paste.Metadata = Unpacked;

        // update metadata
        paste.Content = paste.Content!.split("_metadata:")[0];
        paste.Content += `_metadata:${BaseParser.stringify(paste.Metadata!)}`;

        // update paste
        await SQL.QueryOBJ({
            db: db.db,
            query: 'UPDATE "Pastes" SET "Content" = ? WHERE "CustomURL" = ?',
            params: [paste.Content, paste.CustomURL],
            use: "Prepare",
        });

        // return
        return new Response(JSON.stringify(paste.Metadata), {
            status: 302,
            headers: {
                "Content-Type": "application/json",
                Location: "/?msg=Metadata updated!",
            },
        });
    }
}

/**
 * @export
 * @class GetPasteComments
 * @implements {Endpoint}
 */
export class GetPasteComments implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice("/api/comments/".length, url.pathname.length);

        // get offset
        const OFFSET = parseInt(search.get("offset") || "0");

        // get comments
        const comments = await db.GetPasteComments(name, OFFSET);

        // return
        return new Response(JSON.stringify(comments), {
            status: comments[0] ? 200 : 400,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class UpdateCustomDomain
 * @implements {Endpoint}
 */
export class UpdateCustomDomain implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        if (
            !EntryDB.config.log ||
            !EntryDB.config.log.events.includes("custom_domain")
        )
            return new _404Page().request(request);

        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // verify body
        if (!body.CustomURL || !body.Domain || !body.EditPassword)
            return new _404Page().request(request);

        // if domain is server hostname, return (that's no good!)
        if (
            EntryDB.config.app &&
            EntryDB.config.app.hostname &&
            body.Domain === EntryDB.config.app.hostname
        )
            return new _404Page().request(request);

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return new _404Page().request(request);
        if (paste.HostServer) return new _404Page().request(request);

        // validate password
        const admin =
            CreateHash(body.EditPassword) === CreateHash(EntryDB.config.admin);

        if (paste.EditPassword !== CreateHash(body.EditPassword) && !admin)
            return new Response("Invalid password", {
                status: 302,
                headers: {
                    Location: "/?err=Cannot update domain link: Invalid password!",
                    "X-Entry-Error": "Cannot update domain link: Invalid password!",
                },
            });

        // check association
        const association = await GetAssociation(request, null);

        if (!association[0])
            return new Response("You must be associated with a paste to do this", {
                status: 401,
            });

        if (
            // if paste does not have metadata OR we're not the paste owner, say we can'do that
            !paste.Metadata ||
            (paste.Metadata && association[1] !== paste.Metadata.Owner)
        )
            return new Response(
                "Cannot edit the custom domain of a paste you're not associated with! Please change your paste association.",
                { status: 401 }
            );

        // make sure a log with that domain doesn't already exist
        const DomainLog = (
            await EntryDB.Logs.QueryLogs(
                `"Type" = \'custom_domain\' AND \"Content\" LIKE \'%;${body.Domain}\'`
            )
        )[2][0];

        if (DomainLog)
            return new Response(body.Domain, {
                status: 302,
                headers: {
                    Location: "/?err=This domain is already in use",
                    "X-Entry-Error": "This domain is already in use",
                },
            });

        // get log
        const CustomDomainLog = (
            await EntryDB.Logs.QueryLogs(
                `"Type" = \'custom_domain\' AND \"Content\" LIKE \'${paste.CustomURL};%\'`
            )
        )[2][0];

        if (!CustomDomainLog) {
            // create log
            await EntryDB.Logs.CreateLog({
                Type: "custom_domain",
                Content: `${paste.CustomURL};${body.Domain}`,
            });

            // return
            return new Response(body.Domain, {
                status: 302,
                headers: {
                    Location: "/?msg=Added domain link!",
                },
            });
        }

        // update log
        await EntryDB.Logs.UpdateLog(
            CustomDomainLog.ID,
            `${paste.CustomURL};${body.Domain}`
        );

        // return
        return new Response(body.Domain, {
            status: 302,
            headers: {
                Location: "/?msg=Updated domain link!",
            },
        });
    }
}

/**
 * @export
 * @class GetSocialProfile
 * @implements {Endpoint}
 */
export class GetSocialProfile implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(
            "/api/social/get/".length,
            url.pathname.length
        );
        if (!name || !EntryDB.config.app || !EntryDB.config.app.curiosity)
            return new _404Page().request(request);

        // fetch
        const res = await fetch(
            `${EntryDB.config.app.curiosity.host}/api/profiles/get?c=json`,
            {
                method: "POST",
                body: JSON.stringify({
                    APIKey: EntryDB.config.app.curiosity.api_key,
                    ID: name,
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        // return
        return new Response(await res.json(), {
            status: res.status,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}

// ...
import { GetFile, ListFiles, UploadFile, DeleteFile } from "../repos/Media";
import { contentType } from "mime-types";

// default export
export default {
    db,
    DefaultHeaders,
    PageHeaders,
    GetAssociation,
    VerifyContentType,
    Session,
    WellKnown,
    RobotsTXT,
    Favicon,
    WSAS,
    HashList,
    Distribution,
    CreatePaste, // supports cloud routing
    GetPasteRecord, // supports cloud routing
    EditPaste, // supports cloud routing
    DeletePaste, // supports cloud routing
    DecryptPaste, // supports cloud routing
    GetAllPastesInGroup, // supports cloud routing
    GetRawPaste, // supports cloud routing
    PasteExists, // supports cloud routing
    RenderMarkdown,
    GetPasteHTML, // supports cloud routing
    JSONAPI, // supports cloud routing
    DeleteComment, // supports cloud routing
    PasteLogin, // supports cloud routing
    PasteLogout, // supports cloud routing
    EditMetadata, // supports cloud routing
    GetPasteComments, // supports cloud routing
    GetFile, // supports cloud routing
    ListFiles, // supports cloud routing
    UploadFile, // supports cloud routing
    DeleteFile, // supports cloud routing
    UpdateCustomDomain, // supports cloud routing
    GetSocialProfile, // supports cloud routing
};
