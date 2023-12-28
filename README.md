# 🧶 bundles

<comment>
Certain features of this README only work on Bundles! You can view this README at https://www.sentrytwo.com/what

***
</comment>

Bundles is a lightweight and anonymous Markdown pastebin written in TypeScript that allows for publishing Markdown documents with Markdown preview, easy editing, quick deletion, custom URLs, versioning, comments, media uploads and [many more features](#features).

*Bun*dles uses the [Bun](https://bun.sh) runtime. Pastes are stored in an SQLite database using the [Bun SQLite3 API](https://bun.sh/docs/api/sqlite). Bundles also supports using a PostgreSQL database through config `pg`.

The official Bundles instance is hosted at [sentrytwo.com](https://sentrytwo.com), but any instance can interact with any other instance through the basic decentralization support provided by Bundles.

## Install

- Make sure you have [Bun installed](https://bun.sh/docs/installation)
    - Bun only runs on unix and unix-like systems (Linux, MacOS)
    - One of these systems is required to host the server, but it can be viewed by anyone on any system
- Clone the repository and run `bun install` to install dependencies
- Start the server with `bun run start`

Bundles can also be installed using Docker. Follow [these instructions](https://www.sentrytwo.com/docs/docker) to get started.

The main Bundles repository also includes the source for Bundles related packages. These can be found in the [/packages](https://codeberg.org/sentrytwo/bundles/src/branch/master/packages) directory. Install directions are detailed for each package in their respective README.

### Executable

Bundles can be installed through an executable. The executable will automatically install static files the client needs into the directory it is contained in. You can change this install location through the `EXECUTABLE_STATIC_DIR` environment variable. This must be an exact path to the directory you want static files to be contained in.

### PostgreSQL

You can configure a PostgreSQL database to be used for the main paste database through the configuration file.

```json
{
    ...
    "pg": {
        "host": "localhost",
        "user": "myuser",
        "password": "mypassword",
        "database": "mypastedatabase",
        // "logdb"?: boolean
        // "max_clients"?: boolean (DEFAULT 10)
    }
}
```

This is recommended over the default SQLite database, as it provides much faster write speeds at the cost of memory usage. The logs database will still use SQLite unless you set `logdb` to `true`.

## Usage

Once installed you can start (and build) the server using `bun run start`, to just build do `bun run build`.

Manually launch once after installing to start the setup prompts. These will allow you to set an admin password and define a different port.

## Features

Many features are able to be disabled or enabled through the server configuration file. An example file can be seen [here](https://sentrytwo.com/config). It is the file used in the primary Bundles instance.

If your server is having cache issues you can add `DO_NOT_CACHE=true` to your environment variables. Contrary to what its name suggests, files are still cached! Though they are cache only for a day and in a private cache.

You can define a custom [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) through the `CONTENT_SECURITY_POLICY` environment variable.

### API

All API endpoints expect a `Content-Type` of `application/x-www-form-urlencoded` unless otherwise specified, but the server can convert JSON to `application/x-www-form-urlencoded` if you use `/api/json/{endpoint}` instead.

- `POST /api/new`, Create a new paste, expects `application/x-www-form-urlencoded` with the fields: `Content, CustomURL, EditPassword, IsEditable, ViewPassword, ExpireOn, GroupName, GroupSubmitPassword`
- `POST /api/edit`, Edit an existing paste, expects `application/x-www-form-urlencoded` with the fields: `OldContent, OldURL, EditPassword, Content, NewURL, NewEditPassword`
    - Supports `?draft=true` query parameter, saves changes as a new revision instead of publishing
- `POST /api/delete`, Delete an existing paste, expects `application/x-www-form-urlencoded` with the fields: `CustomURL, EditPassword`
- `POST /api/decrypt`, Decrypt an encrypted paste, expects `application/x-www-form-urlencoded` with the fields: `ViewPassword, CustomURL`
- `POST /api/markdown`, Render any markdown to HTML using the Bundles renderer (based on [Marked](https://marked.js.org))
- `POST /api/comments/delete`, Delete a comment from a paste, expects `application/x-www-form-urlencoded` with the fields: `CustomURL, EditPassword, CommentURL`
- `POST /api/associate`, Associate (Login) as a paste, expects `application/x-www-form-urlencoded` with the fields: `CustomURL, EditPassword`
    - Links posted comments with this paste
- `POST /api/metadata`, Update paste metadata, expects `application/x-www-form-urlencoded` with the fields: `CustomURL, EditPassword, metadata`
    - The `metadata` field is JSON stringified, URI encoded and base64 encoded **ON CLIENT**
- `POST /api/media/upload`, Upload file, expects `multipart/form-data` with the fields: `CustomURL, EditPassword, File(binary)`
- `POST /api/media/delete`, Delete file, expects `multipart/form-data` with the fields: `CustomURL, EditPassword, File(string)`
- `POST /api/media/edit`, Edit text file contents, expects `application/x-www-form-urlencoded` with the fields: `CustomURL, EditPassword, File(string), FileContent`
- `POST /api/domain`, Update paste custom domain, expects `application/x-www-form-urlencoded` with the fields: `CustomURL, EditPassword, Domain`
- `POST /api/disassociate`, Disassociate (Logout) from a paste
- `POST /api/claim`, Repossess an unused custom URL, expects `application/x-www-form-urlencoded` with the fields: `CustomURL`
    - Also requires a prior paste association!
- `POST /api/search`, Search pastes with a JSON return, expects no body with the query parameters: `q(string), by("CustomURL" | "Content" | "Group")`
    - This is the same as the `/search` page, but with a JSON return instead of HTML
- `POST /api/group/update`, Update a group EditPassword, expects `application/x-www-form-urlencoded` with the fields: `CustomURL, EditPassword, NewEditPassword`
    - `CustomURL` refers to the name of a group, not paste!
- `GET  /api/get/{paste}`, Get an existing paste
- `GET  /api/raw/{paste}`, Get raw paste content
- `GET  /api/exists/{paste}`, Check if a paste exists
- `GET  /api/html/{paste}`, Get rendered paste content
- `GET  /api/comments/{paste}`, Get all comments on a specific paste, accepts query string `offset` (multiples of 100, for pagination)
- `GET  /api/group/{group}`, Get all pastes in specified group
- `GET  /api/owner/{pastes}`, Get all pastes owned by specified paste
- `GET  /api/media/file/{owner}/{file}`, Get media
- `GET  /api/media/list/{owner}`, List files under paste

Most of the POST endpoints listed return a JSON object similar to this:

```ts
type APIResponse = {
    success: boolean;
    redirect: string; // the expected redirect location after the request is fulfilled
    result?: [boolean, string, any]; // server function call return value
}
```

#### Admin Endpoints

- `POST /admin/api/delete`, Delete paste, expects `application/x-www-form-urlencoded` with the fields: `AdminPassword, CustomURL`
- `POST /admin/api/export`, Get JSON of all pastes in server (decrypted): `AdminPassword`
- `POST /admin/api/import`, Import pastes JSON: `AdminPassword, pastes` (with `pastes` being the JSON export from `/admin/api/export`) (`multipart/form-data`)
- `POST /admin/api/import/json`, Import pastes JSON: `AdminPassword, pastes` (`application/json`)
- `POST /admin/api/logs/import/json`, Import logs JSON: `AdminPassword, logs` (`application/json`)
- `POST /admin/api/mass-delete`, Delete pastes by sql query: `AdminPassword, pastes`
- `POST /admin/api/sql`, Directly run sql on the server: `AdminPassword, sql, get, all` (`get` and `all` represent the type of operation, `get` returns one result while `all` returns... all results)
- `POST /admin/api/logs/export`, Get all server logs: `AdminPassword`
- `POST /admin/api/logs/users`, Get all users (Returns pastes associated with a session log)
- `POST /admin/api/logs/mass-delete`, Delete logs by sql query: `AdminPassword, logs`
- `POST /admin/api/config.json`, Get server config file contents: `AdminPassword`
- `POST /admin/api/metadata`, Update the metadata of a paste: `AdminPassword, CustomURL, Metadata`

### (very basic) Decentralization

!!! note Encryption
Decentralization does not work with encrypted pastes.

Bundles supports very basic decentralization, meaning you can view and edit pastes from other servers on your server.

To view pastes from other servers, you open them the same way (`example.com/paste`) you normally do, but add an `:` symbol and then the hostname of the other server. Example: `example.com/paste:example2.com`

In this example, we are viewing the paste `paste` from the server `example2.com` on the server `example.com`. Editing and deleting pastes is also available for pastes from a different server. Decentralization **only** supports HTTPS, it is assumed that any secondary server provided is using HTTPS, and the request will fail if it is not.

### Encryption

!!! note Security
Encrypted pastes are NOT fully private from the server owner, but they are from other users!

Pastes can be made "private" by encrypting them. This means that only people with your specified `ViewPassword` can decrypt and view the paste. The `ViewPassword` is also required to properly edit the paste.

Encrypted pastes cannot be decrypted from other servers, and the paste decryption form will not be shown. This is because the values for the decryption process are stored on the server (`IV`, `Key`, `AuthCode`), and it is not safe to send them back through HTTP. These values are only read when the server selects the record based on the `ViewPassword` and the `CustomURL`.

```typescript
// GetEncryptionInfo, BundlesDB.ts
// get encryption values by view password and customurl
const record = (await SQL.QueryOBJ({
    db: this.db,
    query: `SELECT * FROM \"Encryption\" WHERE \"ViewPassword\" = ? AND \"CustomURL\" = ?`,
    params: [ViewPassword, CustomURL],
    get: true,
    use: "Prepare",
})) as Paste | undefined;
```

Values are regenerated when an encrypted paste is edited.

Can be disabled through the server config. `app.enable_private_pastes`

### Paste Expiration

When creating a paste, you can set to have your paste expire at a given time and date. When this time comes, your paste will automatically be deleted by Bundles. This is useful if you don't set an edit password on your paste and are unable to delete it. Information about expired pastes is not kept after their deletion, and their custom URL because open again once they expire.

Can be disabled through the server config. `app.enable_expiry`

### Admin Panel

Bundles provides an admin panel that is locked behind a set password that allows the server owner to manage pastes on their server quickly and easily. The admin password is set on initial configuration, and stored (plain text) in `data/config.json` with the key `admin`.

#### Logs

Through the admin panel, you can view certain logs that are automatically saved whenever an event occurs on the server. These logs are not sent from the client. Logs can be set to automatically be deleted when the server exists using the `log.clear_on_start` option in the server `config.json` file. No events are enabled by default. This will not delete `session`, `report` or `view_paste` type logs, as these should be retained.

The following options can be used as events:

- `create_paste`, fires when a paste is created on the server (`Content` is the paste CustomURL)
- `edit_paste`, fires when a paste is edited on the server (`Content` is the old CustomURL and the new CustomURL)
- `delete_paste`, fires when a paste is deleted on the server (`Content` is the paste CustomURL)
- `access_admin`, fires when the admin panel is accessed (`Content` is the value of the `User-Agent` header, will be "?" if no UA exists)
- `session`, fires when a new session is created (`Content` is the session `User-Agent` header)
- `view_paste`, fires when a paste is viewed (`Content` is the paste CustomURL and the session ID of the viewer)
    - A "Views" counter is added to pastes when this event is enabled
- `report`, fires when a paste is reported (`Content` dependent on the report log type, see below)
    - `create`, followed by the paste that is being reported and the CustomURL of the report
    - `archive`, followed by the CustomURL of the report that is being archived
- `custom_domain`, stores data about a custom domain link (`Content` is the paste that the domain is linked to, followed by the domain)
- `notification`, stores data about notifications (`Content` is the paste that the notification is on, followed by the paste that the notification is for)
- `generic`, random events (most likely never used)

An example that doesn't clear logs on server restart could look like this:

```json
{
    ...
    "log": {
        "clear_on_start": false,
        "events": [
            "create_paste",
            "edit_paste",
            "delete_paste",
            "access_admin",
            "session",
            "view_paste",
            "generic"
        ]
    }
    ...
}
```

#### Plugins

!!! warn Security
    Plugins are given **full access** to your server. Please be sure you trust a plugin before adding it!

Bundles servers are able to run plugins that extend the functionality of Bundles.

Plugins only need one dependency, Bundles. You can add this through using your locally installed Bundles source, and running `bun link` to create a local link. Plugins will install from this directory using the [bun link](https://bun.sh/docs/cli/install#bun-link) system.

Plugins can access the `BundlesDB` class through `global.BundlesDB`.

```typescript
console.log(global.BundlesDB.DataDirectory);
```

An example server plugin can be seen [here](https://codeberg.org/sentrytwo/bundles/src/branch/master/docs/plugins/plugin-example)! It is also important to build your server plugin file, as pages are written in JSX. An example build file (using [Bun](#install)) and example plugin load file can be found [here](https://codeberg.org/sentrytwo/bundles/src/branch/master/docs/plugins).

Please refer to the example files provided, as they walk you through the steps of creating plugins and adding them to your server through comments. Once you have built your plugin file, it can be added through the `plugin_file` key in your server config.

```json
{
    ...
    "plugin_file": "path_to_built_plugin_file.js",
    ...
}
```

The [admin panel](#admin-panel) plugin tab shows the found and loaded plugin pages.

Plugins can load HTML content into the site footer by adding an endpoint beginning with `._footer`, these work the same as normal endpoints (implementing the `Endpoint` class), but their request URL will always be from `bundles:footer-load`. The HTML they return is added to the bottom of the footer on all pages the footer is present. This allows plugins to modify existing pages and include their own scripts in the site.

If a plugin has an endpoint named `._set_plugin_dir` and the pluginfile supplies it, the endpoint will be called with a request that has the header value of "X-Plugin-Dir" set to the directory of the plugin source.

I recommend placing your plugin file and the build file in `data_directory/plugins`

#### Paste Reports

Paste reports can be enabled by adding the `report` [log type](#logs). With paste reports enabled, you can view reported pastes from the [admin panel](#admin-panel). The panel will allow you to view the contents of a report, as well as archive and delete reports.

#### Metadata Editor

The admin panel allows admins to edit the metadata values of a paste. Note that these values are not the record data (such as the edit data or edit password), but rather the unique metadata properties stored in every paste content.

### Customization

Every color is customizable through simple CSS variables. You can customize the background using the `--base-hue`, `--base-sat` and `--base-lit` variables. The background is normally in `hsl` format, while other colors are in hex. Many of these values can be controlled using specific [Special Elements](#special-elements).

- `--base-hue`, The base hue of the background, `int`
- `--base-sat`, The base saturation of the background, `percentage`
- `--base-lit`, The base lightness of the background, `percentage`

Some examples are includes in the base stylesheet. The example below creates a purple theme.

```css
html.purple-theme {
    --base-hue: 255;
    --base-sat: 50%;
}
```

#### User Settings

Custom themes can cause contrast and accessibility issues. The settings button located in the footer allows users to toggle certain settings to improve their experience on the website.

#### Special Elements

You can customize the way your pastes are displayed using some custom elements.

- `&!lt;hue&!gt;`, the hue element allows you to control the hue of the page when your paste is rendered. It expects an `integer`.
- `&!lt;sat&!gt;`, the sat element allows you to control the saturation of the page when your paste is rendered. It expects a `percentage`.
- `&!lt;lit&!gt;`, the lit element allows you to control the lightness of the page when your paste is rendered. It expects a `percentage`.
- `&!lt;theme&!gt;`, the theme element allows you to force a theme when your paste is rendered, `dark/light/blue/purple`

Bundles also supports an easier syntax, allowing you to shorten elements.

```html
<&!percnt; theme dark &!percnt;>
```

##### Animations

!!! info This is an advanced use of special elements!

You can add special animations around blocks of text. These are customizable animations that make pastes more interactive.

These are the currently available animations:

- FadeIn
- FadeOut
- Float
- GrowShrink (grow/shrink)
- Blink

You can create an animation by adding the "animation" class to a special element, followed by the name of the animation.

```html
<&!percnt; animation FadeIn &!percnt;>
content goes here!
```

Animation elements must be closed using a `close` block.

```html
<&!percnt; animation FadeIn &!percnt;>
content goes here!
<&!percnt; close animation &!percnt;>
```

The animation element also supports more attributes to allow you to customize your animation. Each attribute requires the attributes before to be present.

- Animation Name
- Duration (number seconds, ex: `1s`, `2s`)
- Delay (number seconds, ex: `1s`, `0`)
- Repeat (`infinite` makes the animation repeat forever, set to 1 for an animation to play once)
- Inline (Set to `inline` to make the animation block fit with text, set to `full` to make the animation full width **makes centered animation works**)

An example using all of these would look like:

```html
<&!percnt; animation Float 1s 0s infinite inline &!percnt;> floating text! <&!percnt; close animation &!percnt;>
```

This creates an animation with that has a type of `Float`, a duration of 1s, delay of 0s, repeats forever and is inline with text.

When rendered, it would look like <% animation Float 1s 0s infinite inline %> this <% close animation %>!

#### Custom Footer Links

!!! info This feature is only configurable from the server settings!

You can added custom footer links to your server by editing the `config.json` (`{DATA_DIRECTORY}/config.json`) and adding a `footer` section. All links should have a `label` and `href` value. Links are organized in different rows. Each new entry in the "rows" array creates a new row in the footer.

Example:

```json
{
    ...
    "app": {
        ...
        "footer": {
            "rows": [
                {
                    "what": "/what:www.sentrytwo.com"
                }
            ]
        }
        ...
    }
    ...
}
```

You can enable/disable the app name being shown in the footer on all pages using `app.footer.show_name_on_all_pages`. It is always shown on the home page.

#### Info Page

!!! info This feature is only configurable from the server settings!

You can add an info page that is linked in the footer as *info*. This link is only shown if the `info` key exists. This page will be opened whenever the *info* link is selected. This page is intended for server information and announcements, but it can be used for anything.

Example:

```json
{
    ...
    "app": {
        ...
        "info": "/info:www.sentrytwo.com"
        ...
    }
    ...
}
```

### Paste Groups

Groups allow users to organize their pastes into different groups that are locked by a password. Anybody can view the pastes in an existing group, but in order to add a new paste to the group you must have the correct password. A group must not already exist with the requested name to create a new group. A group will become available once all the pastes inside of it are deleted.

Adding a group name will append the group name to the beginning of your set custom URL. This means the custom URL "example" with the group "example-group" would look LIKE \'example-group/example\' instead of just the custom URL. This means that, if you add a group, you can have any custom URL you want for your paste. Adding a group is not required.

Can be disabled through the server config. `app.enable_groups`

### Special Markdown

Bundles supports some custom Markdown features that aren't included in the Markdown specification. These allow you to create more advanced pastes much quicker. Information about these can be found [here](https://www.sentrytwo.com/pub/markdown)!

### Paste Search

Pastes can be searched (by `CustomURL`) in `/search` on an Bundles server. Results are limited to 100 results per query and resulting pastes must be public. You can disable the search page by adding the `app.enable_search` key to your server config.

```json
{
    ...
    "app": {
        ...
        "enable_search": false // enabled by default
        ...
    }
    ...
}
```

### Paste Comments

Users can anonymously leave comments on pastes through paste comments. For comments to work, you must enable comments in config `app.enable_comments`. When a comment is created, a new paste is created in the "comments" group. The content of this paste is the content of the comment. Users can associate an existing paste that they own to "login" to comments.

Paste comments are disabled by default. They can be enabled by changing config `app.enable_comments` to `true`.

Paste comments can be disabled on individual pastes using the paste settings menu. The paste settings menu can be disabled by changing config `app.enable_paste_settings` to false.

Users are automatically tagged with an association with the first paste (not comment) that they create. This can be disabled by changing config `app.auto_tag` to false. If you want to require somebody already has an association to create a paste, you can set config `app.association_required` to true.

### Paste Builder

Users can build multi-page "pastes" using the paste builder. These pages are built using drag-and-drop (desktop only, manual move on mobile) components, allowing users to build with text, images, buttons and more. These pages are highly customizable, from the width of the containing box to the overall theme of the page. Users can also directly add CSS styles to components. Users can also directly add custom HTML to builder pastes, as well as add events to different builder components.

These pages can be published as normal pastes, and will open rendered when viewed.

A basic introduction to the layout of the builder can be found [here](https://builder.sntry.cc)!

#### Technical

Pastes built in this way follow a basic "schema" that is detailed in the types used for each node. This schema can be viewed [here](https://codeberg.org/sentrytwo/bundles/src/branch/master/src/classes/pages/components/builder/schema.tsx).

The paste builder can be disabled using config `app.enable_builder`. It is enabled by default.

Fields for a specific node type are handled in four steps:

- The entry in the `{Type}Node` interface (`schema.tsx`)
    - Example: `Size: number;` in the `TextNode` interface
- The handler for the `--{Type}` entry in the schema parse function (`schema.tsx`)
    - Example: `--Size` for the `TextNode` parse function
- The style handler in the stylesheet, `.builder\:{type}` (`style.css`)
    - Example:

```css
.builder\:text {
    --Size: 16px;
    font-size: var(--Size);
}
```

- Adding an input in the sidebar (`Sidebar.tsx`)
    - Example:

```tsx
<QuickInput
    name="Text Size"
    property="Size"
    type="input"
    inputType="number"
    default={16}
/>
```

Adding a new node is handled similarly:

- Creating a new interface and parse function in the schema (`schema.tsx`)
- Creating the handler in the parser (`parser.tsx`)
- Adding style attributes

### Media Storage

Bundles allows users to store media (photos) on your server for use within their pastes. Media is ordered by the owner (associated paste) that uploaded it. It is accessible from `/paste/files/{owner}/{file}`. On the server, media is stored in `data/media/{owner}/{file}`. Media can only be uploaded by users associated with a paste.

Media can be enabled through the config key.

```json
{
    ...
    "app": {
        ...
        "media": {
            "enabled" true,
            "max_size": 52428800 // size in bytes, default is 50MB
        }
    }
}
```

### Wildcard Domains

By enabling config `app.wildcard`, all subdomains that point to your server (besides `www`) will act as the paste view page, and will try to find a paste matching the subdomain to show. These pages have views and sessions disabled. With wildcard enabled, you must also provide an value for the server hostname. This is used to find the subdomain correctly.

Example:

```json
{
    "app": {
        "wildcard": true,
        "hostname": "sentrytwo.com"
    }
}
```

Note that wildcard paths cannot be indexed by search engines, and all relative links should redirect to the main site.

You can allow people to use custom domains and link with a CNAME record by enabling the `custom_domain` log type.

When somebody visits a wildcard domain for a paste that has a static HTML file in its [media storage](#media-storage), this HTML file will be served. By default, `index.html` is served for `/`. Every path is checked for an HTML file match, so users can also specify their own file names.

### Revisions

Every paste is given 10 revisions. Every time the paste is updated, a new revision is created for it. These revisions can be viewed as if they are other pastes, allowing users to iterate on versions of their pastes.

Revisions can be enabled through config `app.enable_versioning`.

## Development

1. Make sure you have [Bun](https://bun.sh) installed
2. Clone the repository (`git clone https://codeberg.org/sentrytwo/bundles`)
3. Install all dependencies (`bun i`)
4. Run `bun run start` to start the server
5. Before committing changes you should run `bun run format` to format all files
6. You should also run `bun run test` to make sure your commit passes all tests first

### Tests

You can test your changes like you would a deployed version of Bundles. You should also run the included tests before committing your changes. Run `bun test` to run the tests that are included in the repository. These tests test the memory and CPU usage of app usage. All tests should pass before you commit.
