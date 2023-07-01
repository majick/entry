# 📝 entry

Entry is a lightweight [Rentry](https://rentry.co) re-creation written in TypeScript that allows for publishing Markdown documents with Markdown preview, easy editing, quick deletion and custom URLs.

Uses the [Bun](https://bun.sh) runtime. Pastes are stored in an SQLite database using the [Bun SQLite3 API](https://bun.sh/docs/api/sqlite).

## Install

- Make sure you have [Bun installed](https://bun.sh/docs/installation)
    - Bun only runs on unix and unix-like systems (Linux, MacOS)
    - One of these systems is required to host the server, but it can be viewed by anyone on any system
- Clone the repository and run `bun install` to install dependencies
- Start the server with `bun run start`

## Usage

Once installed you can start (and build) the server using `bun run start`, to just build do `bun run build`. You can specify a launch port by doing `export PORT={port} && bun run start`, you can also specify a port by creating a `.env` file in the project directory and setting the port there.

## Compatibility

Entry supports all Rentry features with (almost) 1:1 compatibility. There are a few differences:

| Rentry                                                                                                                       | Entry                                                                                                                                                                                                               |
|------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| When deleting pastes, Rentry uses  `POST /api/edit` with `{ delete: "delete" }`                                              | Entry uses `POST /api/delete`                                                                                                                                                                                       |
| Rentry supports exporting pastes as a pdf, image, or Markdown file                                                           | Entry only supports a `GET /api/get` endpoint, which returns the saved record for the paste without the `EditPassword` hash. Any paste can be viewed raw just by clicking the "Edit" button when viewing the paste. |
| Rentry uses [Python-Markdown](https://github.com/Python-Markdown/markdown) for Markdown rendering, and renders on the server | Entry uses [Marked](https://marked.js.org/) (with some changes after) and renders an initial render on the server, and then finishes on the client. Entry only renders fully on client for editing previews         |

## API

- `POST /api/new`: Create a new paste, expects FormData with the fields: `Content, CustomURL, EditPassword`
- `POST /api/edit`: Edit an existing paste, expects FormData with the fields: `OldContent, OldCustomURL, OldEditPassword, NewContent, NewCustomURL, NewEditPassword`
- `POST /api/delete`: Delete an existing paste, expects FormData with the fields: `CustomURL, EditPassword`
- `POST /api/decrypt`: Decrypt an encrypted paste, expects FormData with the fields: `ViewPassword, CustomURL`
- `GET  /api/get/{paste}`: Get an existing paste

## (very basic) Federation

!!! note Encryption
Federation does not work with encrypted pastes.

Entry supports very basic federation, meaning you can view and edit pastes from other servers on your server.

To view pastes from other servers, you open them the same way (`example.com/paste`) you normally do, but add an `@` symbol and then the hostname of the other server. Example: `example.com/paste@example2.com`

In this example, we are viewing the paste `paste` from the server `example2.com` on the server `example.com`. Editing and deleting pastes is also available for pastes from a different server. Federation **only** supports HTTPS, it is assumed that any secondary server provided is using HTTPS, and the request will fail if it is not.

Pastes cannot normally include any special characters besides `-` and `_`, meaning there should not be any URL conflicts.

## Encryption

Pastes can be made "private" by encrypting them. This means that only people with your specified `ViewPassword` can decrypt and view the paste. The `ViewPassword` is also required to properly edit the paste.

Encrypted pastes cannot be decrypted from other servers, and the paste decryption form will not be shown. This is because the values for the decryption process are stored on the server (`IV`, `Key`, `AuthCode`), and it is not safe to send them back through HTTP. These values are only read when the server selects the record based on the `ViewPassword` and the `CustomURL`.

```typescript
// GetEncryptionInfo, EntryDB.ts
// get encryption values by view password and customurl
const record = (await SQL.QueryOBJ({
    db: this.db,
    query: "SELECT * FROM Encryption WHERE ViewPassword = ? AND CustomURL = ?",
    params: [ViewPassword, CustomURL],
    get: true,
    use: "Prepare",
})) as Paste | undefined;
```

Values are regenerated when an encrypted paste is edited.

## Why

I wanted to self-host a Markdown pastebin, but I noticed every pastebin I could find had too many features or did not support Markdown viewing or custom paste URLs. I eventually found [Rentry](https://rentry.co), but was disappointed to find you could not host it yourself. It support every feature I was looking for, but was closed-source and appeared like it was going to remain that way.

I noticed that on the open-source for the Rentry CLI, there was [an issue](https://github.com/radude/rentry/issues/1) asking for Rentry to publish its source. The creator mentioned that Rentry would go open once the code was cleaned up, but that was four years ago and we haven't gotten a response about it since then.

This is a basic re-creation of Rentry that attempts to look and feel as similar to it as possible.
