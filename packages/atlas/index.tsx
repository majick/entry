/**
 * @file Example plugin
 * @name index.ts
 */

// ...
import type { EntryGlobalType } from "entry/src";

// import honeybee
import type { HoneybeeConfig } from "honeybee";

// create global
export const EntryGlobal = global as unknown as EntryGlobalType;
export const DatabaseURL =
    process.env.ENTRY_NETWORK_POCKETBASE_URL || "https://drone.sentrytwo.com";

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
                ...EntryGlobal.Headers.Default,
                Accept: expected,
            },
        });

    // return undefined if it is fine
    return undefined;
}

// ...imports
import Pages from "./src/Pages";
import API from "./src/API";

// return
export default {
    // POST /api/atlas/
    "/api/atlas/auth/signup": { Method: "POST", Page: API.SignUp },
    "/api/atlas/auth/login": { Method: "POST", Page: API.Login },
    "/api/atlas/auth/logout": { Method: "POST", Page: API.Logout },
    "/api/atlas/pastes/new": { Method: "POST", Page: API.CreatePaste },
    "/api/atlas/pastes/edit": { Method: "POST", Page: API.EditPaste },
    "/api/atlas/pastes/delete": { Method: "POST", Page: API.DeletePaste },
    // GET /app/
    "/app": { Page: Pages.Dashboard },
    "/a/": { Type: "begins", Page: Pages.PasteView },
    "/u/": { Type: "begins", Page: Pages.UserProfile },
    "/app/signup": { Page: Pages.SignUp },
    "/app/login": { Page: Pages.Login },
    // GET /api/atlas/
    "/api/atlas/pastes/get": { Type: "begins", Page: API.GetPaste },
} as HoneybeeConfig["Pages"];
