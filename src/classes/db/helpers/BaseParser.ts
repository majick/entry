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
    return btoa(encodeURIComponent(JSON.stringify(node)));
}

/**
 * @function parse
 *
 * @export
 * @param {string} node
 * @return {{[key: string]: any}}
 */
export function parse(node: string): { [key: string]: any } {
    return JSON.parse(decodeURIComponent(atob(node)));
}

// default export
export default {
    stringify,
    parse,
};
