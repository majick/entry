/**
 * @file Handle network API
 * @name API.tsx
 * @license MIT
 */

import Honeybee, { Endpoint } from "honeybee";
import { EntryGlobal, DatabaseURL } from "..";

import PocketBase from "pocketbase";
import Auth from "./helpers/Auth";

/**
 * @export
 * @class SignUp
 * @implements {Endpoint}
 */
export class SignUp implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = EntryGlobal.Helpers.VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get body
        const body = Honeybee.FormDataToJSON(await request.formData());
        if (!body.Username || !body.Password)
            return new EntryGlobal._404Page().request(request);

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // try to restore from cookie
        const token = await Auth.LoginFromCookie(request, db);

        // make sure no token was returned (no account already)
        if (token !== "") return new EntryGlobal._404Page().request(request);

        // login
        try {
            const res = await db.collection("users").create({
                username: body.Username,
                password: body.Password,
                passwordConfirm: body.Password,
            });

            // login
            await db
                .collection("users")
                .authWithPassword(body.Username, body.Password);

            // return
            return new Response(JSON.stringify(res), {
                status: 301,
                headers: {
                    Location: "/app",
                    "Set-Cookie": db.authStore.exportToCookie(),
                },
            });
        } catch (err: any) {
            // return error
            return new Response(err, {
                status: 301,
                headers: {
                    Location: `/app/signup?err=${encodeURIComponent(err)}`,
                },
            });
        }
    }
}

/**
 * @export
 * @class Login
 * @implements {Endpoint}
 */
export class Login implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = EntryGlobal.Helpers.VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get body
        const body = Honeybee.FormDataToJSON(await request.formData());
        if (!body.Username || !body.Password)
            return new EntryGlobal._404Page().request(request);

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // try to restore from cookie
        const token = await Auth.LoginFromCookie(request, db);

        // make sure no token was returned (no account already)
        if (token !== "") return new EntryGlobal._404Page().request(request);

        // login
        try {
            const res = await db
                .collection("users")
                .authWithPassword(body.Username, body.Password);

            if (!res.token) return new EntryGlobal._404Page().request(request);

            // return
            return new Response(JSON.stringify(res), {
                status: 301,
                headers: {
                    Location: "/app",
                    "Set-Cookie": db.authStore.exportToCookie(),
                },
            });
        } catch (err: any) {
            // return error
            return new Response(err, {
                status: 301,
                headers: {
                    Location: `/app/login?err=${encodeURIComponent(err)}`,
                },
            });
        }
    }
}

/**
 * @export
 * @class Logout
 * @implements {Endpoint}
 */
export class Logout implements Endpoint {
    public async request(request: Request): Promise<Response> {
        // verify content type
        const WrongType = EntryGlobal.Helpers.VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // try to restore from cookie
        const token = await Auth.LoginFromCookie(request, db);

        // make sure token was provided (already in account)
        if (token === "") return new EntryGlobal._404Page().request(request);

        // logout
        db.authStore.clear();

        // return
        return new Response("Removed authentication state.", {
            status: 301,
            headers: {
                Location: "/app",
                "Set-Cookie": db.authStore.exportToCookie(),
            },
        });
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
        const WrongType = EntryGlobal.Helpers.VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get body
        const body = Honeybee.FormDataToJSON(await request.formData());
        if (!body.CustomURL || !body.EditPassword || !body.Content)
            return new EntryGlobal._404Page().request(request);

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // try to restore from cookie
        const token = await Auth.LoginFromCookie(request, db);

        // make sure token was provided (already in account)
        if (token === "") return new EntryGlobal._404Page().request(request);

        // create paste
        try {
            const res = await db.collection("pastes").create({
                CustomURL: decodeURIComponent(body.CustomURL),
                EditPassword: await Bun.password.hash(
                    decodeURIComponent(body.EditPassword),
                    "bcrypt"
                ),
                Content: decodeURIComponent(body.Content),
                Owner: db.authStore.model!.id,
            });

            // return
            return new Response(JSON.stringify(res), {
                status: 301,
                headers: {
                    Location: `/a/${body.CustomURL}`,
                },
            });
        } catch (err: any) {
            // return error
            return new Response(err, {
                status: 301,
                headers: {
                    Location: `/app?err=${encodeURIComponent(err)}`,
                },
            });
        }
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
        const WrongType = EntryGlobal.Helpers.VerifyContentType(
            request,
            "application/x-www-form-urlencoded"
        );

        if (WrongType) return WrongType;

        // get body
        const body = Honeybee.FormDataToJSON(await request.formData());
        if (!body.CustomURL || !body.EditPassword || !body.Content)
            return new EntryGlobal._404Page().request(request);

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // try to restore from cookie
        const token = await Auth.LoginFromCookie(request, db);

        // make sure token was provided (already in account)
        if (token === "") return new EntryGlobal._404Page().request(request);

        // edit paste
        try {
            // get paste
            const result = await db
                .collection("pastes")
                .getFirstListItem(`CustomURL="${body.CustomURL}"`);

            // verify password
            if (
                !(await Bun.password.verify(
                    body.EditPassword,
                    result.EditPassword,
                    "bcrypt"
                ))
            )
                throw new Error("Invalid password!");

            // update
            const res = await db.collection("pastes").update(result.id, {
                // use changed versions instead if they exist
                CustomURL:
                    body.NewCustomURL !== ""
                        ? decodeURIComponent(body.NewCustomURL)
                        : result.CustomURL,
                EditPassword:
                    body.NewEditPassword !== ""
                        ? await Bun.password.hash(
                              decodeURIComponent(body.NewEditPassword),
                              "bcrypt"
                          )
                        : result.EditPassword,
                Content: decodeURIComponent(body.Content), // content is always going to be the changed version
            });

            // return
            return new Response(JSON.stringify(res), {
                status: 301,
                headers: {
                    Location: `/a/${
                        body.NewCustomURL !== ""
                            ? body.NewCustomURL
                            : result.CustomURL
                    }`,
                },
            });
        } catch (err: any) {
            // return error
            return new Response(err, {
                status: 301,
                headers: {
                    Location: `/app?mode=edit&OldURL=${
                        body.CustomURL
                    }&err=${encodeURIComponent(err)}`,
                },
            });
        }
    }
}

/**
 * @export
 * @class GetPaste
 * @implements {Endpoint}
 */
export class GetPaste implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // get name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("api/atlas/pastes/get/"))
            name = name.split("api/atlas/pastes/get/")[1];

        // connect to db
        const db = new PocketBase(DatabaseURL);

        // edit paste
        try {
            // get paste
            const res = await db
                .collection("pastes")
                .getFirstListItem(`CustomURL="${name}"`);

            // clean result
            res.EditPassword = "";

            // return
            return new Response(JSON.stringify(res), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            });
        } catch (err: any) {
            // return error
            return new EntryGlobal._404Page().request(request);
        }
    }
}

// default export
export default {
    // auth
    SignUp,
    Login,
    Logout,
    // pastes
    CreatePaste,
    EditPaste,
    GetPaste,
};
