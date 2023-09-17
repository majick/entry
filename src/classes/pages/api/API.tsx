/**
 * @file Handle API endpoints
 * @name API.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";

// import components
import _404Page from "../components/404";

// create database
import { CreateHash, Decrypt } from "../../db/helpers/Hash";
import BaseParser from "../../db/helpers/BaseParser";
import EntryDB, { Paste } from "../../db/EntryDB";
export const db = new EntryDB();

import pack from "../../../../package.json";
import { Config } from "../../..";

// ...
import { ParseMarkdown } from "../components/Markdown";

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
            "default-src 'self'",
            "img-src *",
            "font-src *",
            "style-src 'unsafe-inline' 'self'",
            "script-src 'self' 'unsafe-inline'",
            "upgrade-insecure-requests",
        ].join("; "),
    "X-Entry-Version": pack.version,
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "same-origin",
};

export const PageHeaders = {
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
    if (request.headers.get("Content-Type") !== expected)
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
        }; SameSite=Lax; Secure; Path=/; HostOnly=true; HttpOnly=true; Max-Age=${
            60 * 60 * 24 * 365
        }`;
    } else {
        // validate session
        const ses_log = await EntryDB.Logs.GetLog(session);

        // set token to expire if log no longer exists
        if (!ses_log[0])
            session = "session-id=refresh; SameSite=Lax; Secure; Path=/; Max-Age=0";
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
    UpdateOnly: boolean = false,
    SetAssociation?: string,
    Delete: boolean = false
): Promise<[boolean, string]> {
    const config = (await EntryDB.GetConfig()) as Config;
    if (!config.log || !config.log.events.includes("session"))
        return [false, "Sessions are disabled"];

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
                `${split[0]};_with;${SetAssociation}`
            );

            return [
                true,
                `associated=${SetAssociation}; SameSite=Lax; Secure; Path=/; HostOnly=true; HttpOnly=true; Max-Age=${
                    60 * 60 * 24 * 365
                }`,
            ];
        } else if (Delete) {
            // update log to remove association
            await EntryDB.Logs.UpdateLog(log[2].ID, split[0]);
            return [true, ""];
        }

        // ...
        if (split[1])
            if (association !== split[1])
                // if association exists, but does not match what is in the log... reset!!
                return [
                    true,
                    `associated=${
                        split[1]
                    }; SameSite=Lax; Secure; Path=/; HostOnly=true; HttpOnly=true; Max-Age=${
                        60 * 60 * 24 * 365
                    }`,
                ];
            // otherwise, return associated paste
            else return [true, split[1]];
        else if (association)
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
                            (await EntryDB.Logs.QueryLogs('Type = "session"'))[2]
                                .length - 1,
                        activeMonth: 0,
                        activeHalfyear: 0,
                    },
                    // this, however, we can supply
                    localPosts: (
                        await db.GetAllPastes(true, true, "CustomURL IS NOT NULL")
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
 * @class CreatePaste
 * @implements {Endpoint}
 */
export class CreatePaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as Paste;
        body.Content = decodeURIComponent(body.Content);

        if (body.CustomURL) body.CustomURL = body.CustomURL.toLowerCase();

        // make sure association is correct
        const Association = await GetAssociation(request);

        // load associated
        if (!Association[1].startsWith("associated") && !Association[0]) {
            // try to set association
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
                    true,
                    body.CustomURL
                );

                if (UpdateResult[0] === true) Association[1] = UpdateResult[1];
            }
        } else body.Associated = Association[1];

        // create paste
        const result = await db.CreatePaste(body);

        // return without redirect if content starts with _builder:
        if (result[0] === true && result[2].Content.startsWith("_builder:"))
            return new Response(JSON.stringify(result), { status: 200 });

        // if result[0] IS NOT TRUE, set association to nothing!!! this makes sure
        // people don't get associated with a paste that is already taken.,..
        if (result[0] !== true) Association[1] = "";

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
                                ? `/${result[2].CustomURL}?UnhashedEditPassword=${result[2].UnhashedEditPassword}&nobuilder=true`
                                : "/?msg=Paste reported!"
                            : `/paste/comments/${body.CommentOn}?msg=Comment posted!`
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
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        if (body.OldContent) body.OldContent = decodeURIComponent(body.OldContent);
        else body.OldContent = decodeURIComponent(body.NewContent);

        if (body.NewContent) body.NewContent = decodeURIComponent(body.NewContent);
        else body.NewContent = decodeURIComponent(body.OldContent);

        body.OldURL = body.OldURL.toLowerCase();
        if (body.NewURL) body.NewURL = body.NewURL.toLowerCase();

        // get paste
        const paste = await db.GetPasteFromURL(body.OldURL);
        if (!paste) return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request);

        if (
            Association[0] === true &&
            !Association[1].startsWith("association") &&
            paste.Metadata &&
            !paste.ViewPassword
        ) {
            // edit paste metadata (keep owner up-to-date)
            paste.Metadata.Owner = Association[1];

            // add to content
            body.NewContent += `_metadata:${BaseParser.stringify(paste.Metadata)}`;
        }

        // edit paste
        const result = await db.EditPaste(
            {
                Content: body.OldContent,
                EditPassword: body.OldEditPassword,
                CustomURL: body.OldURL,
                PubDate: 0,
                EditDate: 0,
                ViewPassword: (paste || { ViewPassword: "" }).ViewPassword,
            },
            {
                Content: body.NewContent,
                EditPassword: body.NewEditPassword || body.OldEditPassword,
                CustomURL: body.NewURL || body.OldURL,
                PubDate: (paste || { PubDate: 0 }).PubDate!,
                EditDate: new Date().getTime(),
                ViewPassword: (paste || { ViewPassword: "" }).ViewPassword,
            }
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json; charset=utf-8",
                Location:
                    result[0] === true
                        ? // if successful, redirect to paste
                          `/${result[2].CustomURL}`
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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;
        // body.password is automatically hashed in db.DeletePaste
        body.CustomURL = body.CustomURL.toLowerCase();

        // delete paste
        const result = await db.DeletePaste(
            {
                CustomURL: body.CustomURL,
            },
            body.EditPassword
        );

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
        return Decrypt(paste.Content, enc[1].key, enc[1].iv, enc[1].auth);
    }

    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

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
 * @class GetAllPastes
 * @implements {Endpoint}
 */
export class GetAllPastes implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // get pastes
        const pastes = await db.GetAllPastes();

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
 * @class GetAllPastesInGroup
 * @implements {Endpoint}
 */
export class GetAllPastesInGroup implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

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
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // get paste name
        const name = url.pathname.slice("/api/raw/".length, url.pathname.length);

        // return home if name === ""
        if (name === "") return new _404Page().request(request);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

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
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

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
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get paste name
        const name = url.pathname.slice("/api/html/".length, url.pathname.length);

        // return home if name === ""
        if (name === "") return new _404Page().request(request);

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "application/json");
        if (WrongType) return WrongType;

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return new _404Page().request(request);
        if (paste.HostServer) return new _404Page().request(request);

        // check association
        const association = await GetAssociation(request);

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

        // get comment log
        const CommentLog = (
            await EntryDB.Logs.QueryLogs(
                `Content = "${paste.CustomURL};${body.CommentURL}" OR Content LIKE "${paste.CustomURL};${body.CommentURL};%"`
            )
        )[2][0];

        if (!CommentLog) return new _404Page().request(request);

        // delete log and paste (this unlinks the comment)
        const result = [];

        result.push(await EntryDB.Logs.DeleteLog(CommentLog.ID));
        result.push(
            await db.DeletePaste(
                {
                    CustomURL: CommentLog.Content.split(";")[1],
                },
                EntryDB.config.admin // delete using admin password
            )
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Location: `/paste/comments/${paste.CustomURL}?edit=true&UnhashedEditPassword=${body.EditPassword}&msg=Comment deleted!`,
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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return new _404Page().request(request);
        if (paste.HostServer) return new _404Page().request(request); // can't post comments as a paste from another server... right now!

        // check edit password
        if (
            paste.EditPassword !== CreateHash(body.EditPassword) &&
            body.EditPassword !== EntryDB.config.admin
        )
            return new Response("Incorrect password", {
                status: 302,
                headers: {
                    Location: "/?err=Incorrect password",
                },
            });

        // generate association
        await GetAssociation(request, true, paste.CustomURL);

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
    public async request(request: Request): Promise<Response> {
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
        if (!paste) return new _404Page().request(request);
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
                    },
                }
            );

        // remove association from session
        await GetAssociation(request, false, "", true);

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

// default export
export default {
    DefaultHeaders,
    VerifyContentType,
    Session,
    WellKnown,
    RobotsTXT,
    CreatePaste,
    GetPasteRecord,
    EditPaste,
    DeletePaste,
    DecryptPaste,
    GetAllPastes,
    GetAllPastesInGroup,
    GetRawPaste,
    PasteExists,
    RenderMarkdown,
    GetPasteHTML,
    JSONAPI,
    DeleteComment,
    PasteLogin,
    PasteLogout,
};
