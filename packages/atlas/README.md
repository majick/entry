# entry-atlas-plugin

## About

The Entry Atlas plugin provides support for "pastes v2", a live paste editor with a new database and API system based on [PocketBase](https://pocketbase.io). The Atlas plugin requires deanonymizing users through required authentication. All servers should still offer normal pastes for anonymous pastebin functionality, as Atlas provides a more "social network" feel to the pastebin.

## Configuration

Declare an environment variable named "ENTRY_ATLAS_POCKETBASE_URL" with the URL to your [PocketBase](https://pocketbase.io) server. This value defaults to `https://drone.sentrytwo.com`.
