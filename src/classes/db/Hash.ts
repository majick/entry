/**
 * @file Handle hash functions
 * @name Hash.ts
 * @license MIT
 */

import crypto from "node:crypto";

/**
 * @function CreateHash
 *
 * @export
 * @param {string} input
 * @return {string}
 */
export function CreateHash(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * @function ComputeRandomObjectHash
 * @description Return the hash of a random object
 *
 * @export
 * @return {string}
 */
export function ComputeRandomObjectHash(): string {
    return CreateHash(crypto.randomUUID());
}

/**
 * @function Encrypt
 *
 * @export
 * @param {string} content
 * @return {[string, string, string, string] | undefined} [encrypted, key, iv, tag]
 */
export function Encrypt(
    content: string
): [string, string, string, string] | undefined {
    // we're working with (what I consider) legacy APIs, so we need a try/catch block

    try {
        // I'm not going to pretend like I know how to do this off the top of my head,
        // I used the Node.js crypto documentation, and you should too if you're going to
        // change this: https://nodejs.org/api/crypto.html

        // generate key
        const key = crypto.randomBytes(32);

        // generate iv
        const iv = crypto.randomBytes(12);

        // create cipher
        const cipher = crypto.createCipheriv(
            "aes-256-gcm",
            Buffer.from(key),
            iv
        );

        // encrypt
        let encryptedText = cipher.update(content, "utf-8", "hex");
        encryptedText += cipher.final("hex");

        const tag = cipher.getAuthTag();

        // return
        return [
            encryptedText,
            key.toString("hex"),
            iv.toString("hex"),
            tag.toString("hex"),
        ];
    } catch {
        return undefined;
    }
}

/**
 * @function Decrypt
 *
 * @export
 * @param {string} encrypted
 * @param {string} key
 * @param {string} iv
 * @param {string} tag
 * @return {(string | undefined)}
 */
export function Decrypt(
    encrypted: string,
    key: string,
    iv: string,
    tag: string
): string | undefined {
    // we're working with (what I consider) legacy APIs, so we need a try/catch block
    try {
        // make return iv and encrypted to buffers
        const ivBuffer = Buffer.from(iv, "hex");

        // create decipher
        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            Buffer.from(key, "hex"),
            ivBuffer
        );

        decipher.setAuthTag(Buffer.from(tag, "hex")); // set auth tag

        // decrypt
        let decryped = decipher.update(encrypted, "hex", "utf-8");
        decryped += decipher.final("utf-8");

        // return
        return decryped;
    } catch {
        return undefined;
    }
}

// default export
export default {
    CreateHash,
    ComputeRandomObjectHash,
    Encrypt,
    Decrypt,
};
