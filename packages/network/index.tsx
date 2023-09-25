/**
 * @file Example plugin
 * @name index.ts
 */

// ...
import type { EntryGlobalType } from "entry/src";
import type _404Page from "entry/src/classes/pages/components/404";

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
import Network from "./src/Network";
import API from "./src/API";

// return
export default {
    // POST /api/drone/
    "/api/drone/auth/signup": { Method: "POST", Page: API.SignUp },
    "/api/drone/auth/login": { Method: "POST", Page: API.Login },
    // GET /app/
    "/app": { Page: Network.Dashboard },
    "/app/login": { Page: Network.Login },
} as HoneybeeConfig["Pages"];
