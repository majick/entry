/**
 * @file Handle Admin API endpoints
 * @name Admin.tsx
 * @license MIT
 */

import Honeybee, { Endpoint } from "honeybee";

import { VerifyContentType, db, DefaultHeaders } from "./API";
import { Decrypt } from "../../db/helpers/Hash";
import EntryDB from "../../db/EntryDB";

import { Login } from "../Admin";

/**
 * @export
 * @class APIDeletePaste
 * @implements {Endpoint}
 */
export class APIDeletePaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request);

        // get pastes
        const _export = await db.GetAllPastes(true, false, "CustomURL IS NOT NULL");

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(request, "multipart/form-data");

        if (
            WrongType &&
            !(request.headers.get("content-type") || "").includes(
                "multipart/form-data"
            )
        )
            return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;
        body.pastes = await (body.pastes as Blob).text();

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request);

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
 * @class APIMassDelete
 * @implements {Endpoint}
 */
export class APIMassDelete implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request);

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request);

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request);

        // get logs
        const _export = await EntryDB.Logs.QueryLogs("ID IS NOT NULL");

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request);

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
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get request body
        const body = Honeybee.FormDataToJSON(await request.formData()) as any;

        // validate password
        if (!body.AdminPassword || body.AdminPassword !== EntryDB.config.admin)
            return new Login().request(request);

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

// default export
export default {
    APIDeletePaste,
    APIExport,
    APIImport,
    APIMassDelete,
    APISQL,
    APIExportLogs,
    APIMassDeleteLogs,
    APIExportConfig,
};
