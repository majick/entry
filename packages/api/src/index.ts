/**
 * @file Handle Entry API
 * @name index.ts
 * @license MIT
 */

/**
 * @export
 * @class Entry
 */
export class Entry {
    private server: string;

    /**
     * Creates an instance of Entry.
     * @param {string} [server="https://sentrytwo.com"]
     * @memberof Entry
     */
    constructor(server: string = "https://sentrytwo.com") {
        this.server = server;
    }

    /**
     * @method GetInfo
     * @description Get general information about the Entry server
     *
     * @return {Promise<{ [key: string]: any }>} In the [nodeinfo 2.0](https://nodeinfo.diaspora.software/docson/index.html#/ns/schema/2.0#$$expand) spec
     * @memberof Entry
     */
    public async GetInfo(): Promise<{ [key: string]: any }> {
        return await (await fetch(`${this.server}/.well-known/nodeinfo/2.0`)).json();
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
     * @return {Promise<[boolean, string]>} success, message
     * @memberof Entry
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
    }): Promise<[boolean, string]> {
        // fetch
        const res = await fetch(`${this.server}/api/json/new`, {
            method: "POST",
            body: JSON.stringify(props),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // return
        return [
            res.status === 200,
            res.headers.get("X-Entry-Error") || "Paste created",
        ];
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
     * @return {Promise<[boolean, string]>} success, message
     * @memberof Entry
     */
    public async EditPaste(props: {
        Content: string;
        CustomURL: string;
        EditPassword: string;
        NewEditPassword?: string;
        NewCustomURL?: string;
    }): Promise<[boolean, string]> {
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
        return [
            res.status === 200,
            res.headers.get("X-Entry-Error") || "Paste edited",
        ];
    }

    /**
     * @method DeletePaste
     *
     * @param {{
     *         CustomURL: string;
     *         EditPassword: string;
     *     }} props
     * @return {Promise<[boolean, string]>}
     * @memberof Entry
     */
    public async DeletePaste(props: {
        CustomURL: string;
        EditPassword: string;
    }): Promise<[boolean, string]> {
        // fetch
        const res = await fetch(`${this.server}/api/json/delete`, {
            method: "POST",
            body: JSON.stringify(props),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // return
        return [
            res.status === 200,
            res.headers.get("X-Entry-Error") || "Paste deleted",
        ];
    }

    /**
     * @method DecryptPaste
     *
     * @param {{
     *         CustomURL: string;
     *         ViewPassword: string;
     *     }} props
     * @return {Promise<[boolean, string]>}
     * @memberof Entry
     */
    public async DecryptPaste(props: {
        CustomURL: string;
        ViewPassword: string;
    }): Promise<[boolean, string]> {
        // fetch
        const res = await fetch(`${this.server}/api/json/decrypt`, {
            method: "POST",
            body: JSON.stringify(props),
            headers: {
                "Content-Type": "application/json",
            },
        });

        // return
        return [
            res.status === 200,
            res.headers.get("X-Entry-Error") || (await res.text()),
        ];
    }

    // GET

    /**
     * @method GetPaste
     *
     * @param {string} CustomURL
     * @return {(Promise<{[key: string]: any} | undefined>)}
     * @memberof Entry
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
export default Entry;
