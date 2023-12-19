/**
 * @file Handle Bundles API
 * @name index.ts
 * @license MIT
 */

export type APIResponse = {
    success: boolean;
    redirect: string;
    result?: [boolean, string, any];
};

/**
 * @export
 * @class Bundles
 */
export class Bundles {
    private server: string;

    /**
     * Creates an instance of Bundles.
     * @param {string} [server="https://sentrytwo.com"]
     * @memberof Bundles
     */
    constructor(server: string = "https://sentrytwo.com") {
        this.server = server;
    }

    // POST

    /**
     * @method NewPaste
     *
     * @param {{
     *         Content: string;
     *         CustomURL: string;
     *         EditPassword: string;
     *         IsEditable?: boolean;
     *         ViewPassword?: string;
     *         ExpireOn?: string;
     *         GroupName?: string; // required if GroupSumbmitPassword is provided
     *         GroupSumbmitPassword?: string; // required if GroupName is provided
     *     }} props
     * @return {Promise<APIResponse>}
     * @memberof Bundles
     */
    public async NewPaste(props: {
        Content: string;
        CustomURL: string;
        EditPassword: string;
        IsEditable?: boolean;
        ViewPassword?: string;
        ExpireOn?: string;
        GroupName?: string; // required if GroupSumbmitPassword is provided
        GroupSumbmitPassword?: string; // required if GroupName is provided
    }): Promise<APIResponse> {
        // fetch
        const res = await fetch(`${this.server}/api/json/new`, {
            method: "POST",
            body: JSON.stringify(props),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // return
        return await res.json();
    }

    /**
     * @method EditPaste
     *
     * @param {{
     *         Content: string;
     *         CustomURL: string;
     *         EditPassword: string;
     *         NewEditPassword?: string;
     *         NewCustomURL?: string;
     *     }} props
     * @return {Promise<APIResponse>} success, message
     * @memberof Bundles
     */
    public async EditPaste(props: {
        Content: string;
        CustomURL: string;
        EditPassword: string;
        NewEditPassword?: string;
        NewCustomURL?: string;
    }): Promise<APIResponse> {
        // fetch
        const res = await fetch(`${this.server}/api/json/edit`, {
            method: "POST",
            body: JSON.stringify({
                OldURL: props.CustomURL,
                EditPassword: props.EditPassword,
                Content: props.Content,
                NewEditPassword: props.NewEditPassword,
                NewURL: props.NewCustomURL,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // return
        return await res.json();
    }

    /**
     * @method DeletePaste
     *
     * @param {{
     *         CustomURL: string;
     *         EditPassword: string;
     *     }} props
     * @return {Promise<APIResponse>}
     * @memberof Bundles
     */
    public async DeletePaste(props: {
        CustomURL: string;
        EditPassword: string;
    }): Promise<APIResponse> {
        // fetch
        const res = await fetch(`${this.server}/api/json/delete`, {
            method: "POST",
            body: JSON.stringify(props),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // return
        return await res.json();
    }

    /**
     * @method DecryptPaste
     *
     * @param {{
     *         CustomURL: string;
     *         ViewPassword: string;
     *     }} props
     * @return {Promise<string>}
     * @memberof Bundles
     */
    public async DecryptPaste(props: {
        CustomURL: string;
        ViewPassword: string;
    }): Promise<string> {
        // fetch
        const res = await fetch(`${this.server}/api/json/decrypt`, {
            method: "POST",
            body: JSON.stringify(props),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // return
        return await res.text();
    }

    // GET

    /**
     * @method GetPaste
     *
     * @param {string} CustomURL
     * @return {(Promise<{[key: string]: any} | undefined>)}
     * @memberof Bundles
     */
    public async GetPaste(
        CustomURL: string
    ): Promise<{ [key: string]: any } | undefined> {
        // attempt to get paste
        const res = await fetch(`${this.server}/api/get/${CustomURL}`);

        // make sure paste exists
        if (res.status === 404) return undefined;

        // return
        return await res.json();
    }
}

// default export
export default Bundles;
