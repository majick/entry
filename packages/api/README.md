# entrymd

Node.js API wrapper for [Bundles](https://codeberg.org/sentrytwo/bundles) instances.

Implements API as described [here](https://sentrytwo.com/what#api). Does not implemenet admin endpoints.

## Install

```bash
npm install entrymd
```

## Usage

```typescript
new Bundles("https://sentrytwo.com");
```

The constructor takes a `server` input, which determines which server to send requests to. Uses `https://sentrytwo.com` as the default.

### Create Paste

Create a new paste with the specified content.

- props:
    - `Content`: string, the content of the paste
    - `CustomURL`: string, the path the paste will be saved at
    - `EditPassword`: string, the password used to edit the paste
    - `IsEditable`?: boolean, determines if the paste should be editable (`true` by default)
    - `ViewPassword`?: string, encrypts paste if provided
    - `ExpireOn`?: string, exact date and time to delete paste on
    - `GroupName`?: string, group name (required if `GroupSubmitPassword` is provided)
    - `GroupSumbmitPassword`?: string, group password (required if `GroupName` is provided)

```typescript
const client = new Bundles();
await client.NewPaste({
    Content: "test paste",
    CustomURL: "test",
    EditPassword: "12345",
    IsEditable: true,
    ViewPassword: "12345",
    ExpireOn: new Date().getTime(),
    GroupName: "test",
    GroupSubmitPassword: "12345",
});
```

### Edit Paste

Edit an existing paste.

- props:
    - `Content`: string, the new content of the paste
    - `CustomURL`: string, the path the paste is saved at
    - `EditPassword`: string, the paste edit password
    - `NewEditPassword`?: string, the password to change the paste edit password to (password does not change if this is not provided)
    - `NewCustomURL`?: string, the path to change the paste path to (path does not change if this is not provided)

```typescript
const client = new Bundles();
await client.EditPaste({
    Content: "test 1",
    CustomURL: "test",
    EditPassword: "12345",
    NewEditPassword: "54321",
    NewCustomURL: "test1",
});
```

### Delete Paste

Delete an existing paste.

- props:
    - `CustomURL`: string, the path the paste is saved at
    - `EditPassword`: string, the paste edit password

```typescript
const client = new Bundles();
await client.DeletePaste({
    CustomURL: "test1",
    EditPassword: "54321",
});
```

### Get Paste

Get an existing paste.

- `CustomURL`: string, the path the paste is saved at

```typescript
const client = new Bundles();
await client.GetPaste("example");
```

### Decrypt Paste

Decrypt a private paste.

- props:
    - `CustomURL`: string, the path the paste is saved at
    - `ViewPassword`: string, the paste view password

```typescript
const client = new Bundles();
await client.GetPaste({
    CustomURL: "test",
    ViewPassword: "12345",
});
```

## Development

Requires [Bun](https://bun.sh)

- Clone repository (`git clone https://codeberg.org/sentrytwo/bundles`)
- cd into directory (`cd packages/api`)
- Install dependencies (`bun i`)
- Format (`bun run format`)
- Build (`bun run build`)
