/**
 * @file Handle Admin API endpoints
 * @name Admin.tsx
 * @license MIT
 */

import Honeybee, { Endpoint } from "honeybee";
import { Server } from "bun";

import { VerifyContentType, db, DefaultHeaders } from "./API";
import { Decrypt } from "../../db/helpers/Hash";
import _404Page from "../components/404";

import EntryDB from "../../db/EntryDB";

import { Login } from "../Admin";
import Pages from "../Pages";

/**
 * @export
 * @class APIDeletePaste
 * @implements {Endpoint}
 */
export class APIDeletePaste implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // this is the same code as API.DeletePaste, but it requires body.AdminPassword
        // NOTE: API.DeletePaste CAN take the admin password in the normal "password" field,
        //       and it will still work the same!!!
        // this endpoint is just use to redirect to /admin/login instead of /

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

        // delete paste
        const result = await db.DeletePaste(
            {
                CustomURL: body.CustomURL,
            },
            body.AdminPassword
        );

        // return
        return new Response(JSON.stringify(result), {
            status: 302,
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
                Location:
                    result[0] === true
                        ? // if successful, redirect to home
                          `/admin/login`
                        : // otherwise, show error message
                          `/?err=${encodeURIComponent(result[1])}&mode=edit&OldURL=${
                              result[2].CustomURL
                          }`,
            },
        });
    }
}

/**
 * @export
 * @class APIExport
 * @implements {Endpoint}
 */
export class APIExport implements Endpoint {
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

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get pastes
        const _export = await db.GetAllPastes(
            true,
            false,
            '"CustomURL" IS NOT NULL'
        );

        // decrypt encrypted pastes
        // if paste is encrypted, decrypt
        // ...otherwise the created paste will decrypt to an encrypted value!!!
        for (let paste of _export)
            if (paste.ViewPassword) {
                // get encryption information
                const enc = await db.GetEncryptionInfo(
                    paste.ViewPassword,
                    paste.CustomURL
                );

                // decrypt
                paste.Content = Decrypt(
                    paste.Content,
                    enc[1].key,
                    enc[1].iv,
                    enc[1].auth
                )!;
            } else continue;

        // return
        return new Response(JSON.stringify(_export), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="entry-${new Date().toISOString()}.json"`,
            },
        });
    }
}

/**
 * @export
 * @class APIImport
 * @implements {Endpoint}
 */
export class APIImport implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "multipart/form-data");

        if (
            WrongType &&
            !(request.headers.get("content-type") || "").includes(
                "multipart/form-data"
            )
        )
            return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;
        body.pastes = await (body.pastes as Blob).text();

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get pastes
        const output = await db.ImportPastes(JSON.parse(body.pastes) || []);

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APIImportRaw
 * @implements {Endpoint}
 */
export class APIImportRaw implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "application/json");

        if (
            WrongType &&
            !(request.headers.get("content-type") || "").includes("application/json")
        )
            return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get request body
        const body = (await request.json()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get pastes
        const output = await db.ImportPastes(body.pastes || []);

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APIImportLogsRaw
 * @implements {Endpoint}
 */
export class APIImportLogsRaw implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "application/json");

        if (
            WrongType &&
            !(request.headers.get("content-type") || "").includes("application/json")
        )
            return WrongType;

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // make sure logs are enabled
        if (!EntryDB.config.log)
            return new Response("Logs are disabled!", { status: 400 });

        // get request body
        const body = (await request.json()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get pastes
        const output = await EntryDB.Logs.ImportLogs(body.logs || []);

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APIMassDelete
 * @implements {Endpoint}
 */
export class APIMassDelete implements Endpoint {
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

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get pastes
        const output = await db.DeletePastes(
            JSON.parse(body.pastes),
            body.AdminPassword
        );

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APISQL
 * @implements {Endpoint}
 */
export class APISQL implements Endpoint {
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

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // run query
        const output = await db.DirectSQL(
            body.sql,
            body.get !== undefined,
            body.all !== undefined,
            body.AdminPassword
        );

        // return
        return new Response(JSON.stringify(output), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APIExportLogs
 * @implements {Endpoint}
 */
export class APIExportLogs implements Endpoint {
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

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get logs
        const _export = await EntryDB.Logs.QueryLogs('"ID" IS NOT NULL');

        // return
        return new Response(JSON.stringify(_export[2]), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="entry-logs-${new Date().toISOString()}.json"`,
            },
        });
    }
}

/**
 * @export
 * @class APIMassDeleteLogs
 * @implements {Endpoint}
 */
export class APIMassDeleteLogs implements Endpoint {
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

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // delete logs
        const outputs: any[] = [];

        // build outputs
        for (const id of JSON.parse(body.logs))
            outputs.push(await EntryDB.Logs.DeleteLog(id));

        // return
        return new Response(JSON.stringify(outputs), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class APIExportConfig
 * @implements {Endpoint}
 */
export class APIExportConfig implements Endpoint {
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

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // return
        return new Response(JSON.stringify(EntryDB.config), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="entry-config-${new Date().toISOString()}.json"`,
            },
        });
    }
}

/**
 * @export
 * @class APIGetUsers
 * @implements {Endpoint}
 */
export class APIGetUsers implements Endpoint {
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

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request, server);

        // get logs
        const _export = (
            await EntryDB.Logs.QueryLogs(
                "\"Type\" = 'session' AND \"Content\" LIKE '%;_with;%'"
            )
        )[2];

        // build userslist
        const UsersList: string[] = [];

        for (const log of _export) {
            const split = log.Content.split(";_with;")[1];
            if (split && !UsersList.includes(split)) UsersList.push(split);
        }

        // return
        return new Response(JSON.stringify([true, UsersList.length, UsersList]), {
            headers: {
                ...DefaultHeaders,
                "Content-Type": "application/json",
            },
        });
    }
}

// default export
export default {
    APIDeletePaste,
    APIExport,
    APIImport,
    APIImportRaw,
    APIImportLogsRaw,
    APIMassDelete,
    APISQL,
    APIExportLogs,
    APIMassDeleteLogs,
    APIExportConfig,
    APIGetUsers,
};
