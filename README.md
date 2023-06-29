# 📝 entry

Entry is a lightweight [Rentry](https://rentry.co) re-creation written in TypeScript that allows for publishing Markdown documents with Markdown preview, easy editing, quick deletion and custom URLs.

Uses the [Bun](https://bun.sh) runtime. Pastes are stored in an SQLite database using the [Bun SQLite3 API](https://bun.sh/docs/api/sqlite).

## Install

- Make sure you have [Bun installed](https://bun.sh/docs/installation)
    - Bun only runs on unix and unix-like systems (Linux, MacOS)
    - One of these systems is required to host the server, but it can be viewed by anyone on any system
- Clone the repository and run `bun install` to install dependencies
- Start the server with `bun run start`

## Compatibility

Entry supports all Rentry features with (almost) 1:1 compatibility. There are a few differences:

| Rentry                                                                                                                       | Entry                                                                                                                    |
|------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| When deleting pastes, Rentry uses  `POST /api/edit` with `{ delete: "delete" }`                                              | Entry uses `POST /api/delete`                                                                                            |
| Rentry supports exporting pastes as a pdf, image, or Markdown file                                                           | Entry only supports Markdown files                                                                                       |
| Rentry uses [Python-Markdown](https://github.com/Python-Markdown/markdown) for Markdown rendering, and renders on the server | Entry uses [Marked](https://marked.js.org/) (with some changes after) and renders an initial render on the server, and then finishes on the client. Entry only renders on client for editing previews |

## API

- `/api/new`: Create a new paste, expects FormData with the fields: `Content, CustomURL, EditPassword`
- `/api/edit`: Edit an existing paste, expects FormData with the fields: `OldContent, OldCustomURL, OldEditPassword, NewContent, NewCustomURL, NewEditPassword`
- `/api/delete`: Delete an existing paste, expects FormData with the fields: `CustomURL, EditPassword`

## Why

I wanted to self-host a Markdown pastebin, but I noticed every pastebin I could find had too many features or did not support Markdown viewing or custom paste URLs. I eventually found [Rentry](https://rentry.co), but was disappointed to find you could not host it yourself. It support every feature I was looking for, but was closed-source and appeared like it was going to remain that way.

I noticed that on the open-source for the Rentry CLI, there was [an issue](https://github.com/radude/rentry/issues/1) asking for Rentry to publish its source. The creator mentioned that Rentry would go open once the code was cleaned up, but that was four years ago and we haven't gotten a response about it since then.

This is a basic re-creation of Rentry that attempts to look and feel as similar to it as possible.

## TODO

- [ ] Private pastes
- [ ] Encrypted pastes
