/**
 * @file Handle network API
 * @name API.tsx
 * @license MIT
 */

import Honeybee, { Endpoint } from "honeybee";
import { EntryGlobal, DatabaseURL } from "..";

import PocketBase from "pocketbase";
import Auth from "./Auth";

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
        const res = await db.collection("auth").create({
            username: body.Username,
            password: body.Password,
            passwordConfirm: body.Password,
        });

        // return
        return new Response(JSON.stringify(res));
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
        const res = await db
            .collection("auth")
            .authWithPassword(body.Username, body.Password);

        // return
        return new Response(JSON.stringify(res));
    }
}

// default export
export default {
    SignUp,
    Login,
};
