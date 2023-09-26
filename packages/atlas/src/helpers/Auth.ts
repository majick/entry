/**
 * @file Handle auth
 * @name Auth.ts
 * @license MIT
 */

import PocketBase from "pocketbase";

/**
 * @function LoginFromCookie
 *
 * @export
 * @param {Request} request
 * @param {PocketBase} db
 * @param [SkipVerify=false]
 * @return {Promise<string>}
 */
export async function LoginFromCookie(
    request: Request,
    db: PocketBase,
    SkipVerify: boolean = false
): Promise<string> {
    // try to restore from cookie
    db.authStore.loadFromCookie(request.headers.get("Cookie") || "");

    // validate
    if (!SkipVerify)
        try {
            if (db.authStore.isValid) db.collection("users").authRefresh();
        } catch {
            db.authStore.clear();
        }

    // return
    return db.authStore.token || "";
}

// default export
export default {
    LoginFromCookie,
};
