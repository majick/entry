/**
 * @file Handle server class
 * @name Server.ts
 * @license MIT
 */

import { Server } from "bun";
import path from "node:path";
import fs from "node:fs";

import { contentType } from "mime-types";

// import endpoints
import _404Page from "./pages/components/404";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import API from "./pages/API";

/**
 * @function FormDataToJSON
 *
 * @export
 * @param {FormData} data
 * @return {{ [key: string]: any }}
 */
export function FormDataToJSON(data: FormData): { [key: string]: any } {
    let json: any = {};

    for (let entry of data.entries()) {
        json[entry[0]] = entry[1];
    }

    return json;
}

/**
 * @export
 * @class _Server
 */
export class _Server {
    public readonly port: number;
    public readonly server: Server;

    constructor(port: number) {
        this.port = port;

        // create server
        this.server = Bun.serve({
            port,
            async fetch(request: Request) {
                const url = new URL(request.url);

                // check endpoints
                if (request.method === "GET") {
                    if (url.pathname === "/") return new Home().request(request);
                    // serve static files
                    else if (fs.existsSync(path.join(import.meta.dir, url.pathname)))
                        return new Response(
                            await Bun.file(
                                path.join(import.meta.dir, url.pathname)
                            ).text(),
                            {
                                headers: {
                                    ...API.DefaultHeaders,
                                    "Content-Type":
                                        contentType(
                                            url.pathname.slice(
                                                1,
                                                url.pathname.length
                                            )
                                        ) || "text/plain",
                                },
                            }
                        );
                    else if (url.pathname === "/robots.txt")
                        return new Response("User-agent: *\nAllow: /\nDisallow:");
                    // admin
                    else if (
                        url.pathname === "/admin/login" ||
                        url.pathname === "/admin/login/"
                    )
                        return await new Admin.Login().request(request);
                    // api
                    else if (url.pathname === "/api/all")
                        return await new API.GetAllPastes().request(request);
                    // check if pathname is the url of a paste
                    else {
                        if (url.pathname.startsWith("/api/get/"))
                            // get paste record (application/json)
                            // will return 404 for us if not found
                            return await new API.GetPasteRecord().request(request);
                        else if (url.pathname.startsWith("/api/group/"))
                            // get all pastes in group (application/json)
                            return await new API.GetAllPastesInGroup().request(
                                request
                            );
                        else if (
                            url.pathname.startsWith("/group/") ||
                            url.pathname.startsWith("/group") // return pastes in No Group
                        )
                            // get all pastes in group (text/html)
                            return await new API.GetAllPastesInGroupPage().request(
                                request
                            );
                        // normal paste view (text/html)
                        // will return 404 for us if not found
                        else return await new API.GetPasteFromURL().request(request);
                    }
                } else if (request.method === "POST") {
                    // api endpoints
                    if (url.pathname === "/api/new")
                        // create new paste
                        return new API.CreatePaste().request(request);
                    else if (url.pathname === "/api/edit")
                        // edit existing paste
                        return new API.EditPaste().request(request);
                    else if (url.pathname === "/api/delete")
                        // delete existing paste
                        return new API.DeletePaste().request(request);
                    else if (url.pathname === "/api/decrypt")
                        // decrypt encrypted paste
                        return new API.DecryptPaste().request(request);
                    // admin endpoints
                    else if (url.pathname === "/admin/manage-pastes")
                        return await new Admin.ManagePastes().request(request);
                    else if (url.pathname === "/admin/export")
                        return await new Admin.ExportPastesPage().request(request);
                    else if (url.pathname === "/admin/api/delete")
                        return await new Admin.APIDeletePaste().request(request);
                    else if (url.pathname === "/admin/api/export")
                        return await new Admin.APIExport().request(request);
                    else if (url.pathname === "/admin/api/import")
                        return await new Admin.APIImport().request(request);
                    // view post
                    // normal paste view (text/html)
                    // will return 404 for us if not found
                    else return await new API.GetPasteFromURL().request(request);
                }

                return await new _404Page().request(request);
            },
        });

        // log
        console.log("\x1b[92m[entry] Started server on port:\x1b[0m", port);
    }
}

// default export
export default {
    Server: _Server,
};
