/**
 * @file Handle BaseParser
 * @name BaseParser.ts
 * @license MIT
 */

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
            JSON.stringify(node).replaceAll(/%([a-f0-9]{2})/gi, (match, offset) =>
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
    return JSON.parse(
        decodeURIComponent(
            atob(node).replaceAll(
                /[\x80-\uffff]/g,
                (match) => `%${match.charCodeAt(0).toString(16).padStart(2, "0")}`
            )
        )
    );
}

// default export
export default {
    stringify,
    parse,
};
