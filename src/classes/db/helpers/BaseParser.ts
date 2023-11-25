/**
 * @file Handle BaseParser
 * @name BaseParser.ts
 * @license MIT
 */

import { parse as TParse, stringify as TStringify } from "smol-toml";
export const TOML = { parse: TParse, stringify: TStringify };

/**
 * @function stringify
 *
 * @export
 * @param {{[key: string]: any}} node
 * @return {string}
 */
export function stringify(node: { [key: string]: any }): string {
    return btoa(
        encodeURIComponent(
            TOML.stringify(node).replaceAll(/%([a-f0-9]{2})/gi, (match, offset) =>
                String.fromCharCode(parseInt(offset, 16))
            )
        )
    );
}

/**
 * @function parse
 *
 * @export
 * @param {string} node
 * @return {{[key: string]: any}}
 */
export function parse(node: string): { [key: string]: any } {
    const decoded = decodeURIComponent(
        atob(node).replaceAll(
            /[\x80-\uffff]/g,
            (match) => `%${match.charCodeAt(0).toString(16).padStart(2, "0")}`
        )
    );

    // return
    return (decoded.startsWith("{") ? JSON : TOML).parse(decoded);
}

// default export
export default {
    stringify,
    parse,
    TOML,
};
