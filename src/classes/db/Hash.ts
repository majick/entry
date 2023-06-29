/**
 * @file Handle hash functions
 * @name Hash.ts
 * @license MIT
 */

import subtle from "node:crypto";

/**
 * @function CreateHash
 *
 * @export
 * @param {string} input
 * @return {string}
 */
export function CreateHash(input: string): string {
    return subtle.createHash("sha256").update(input).digest("hex");
}

/**
 * @function ComputeRandomObjectHash
 * @description Return the hash of a random object
 *
 * @export
 * @return {string}
 */
export function ComputeRandomObjectHash(): string {
    return CreateHash(subtle.randomUUID());
}

// default export
export default {
    CreateHash,
    ComputeRandomObjectHash,
};
