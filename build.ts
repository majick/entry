import { build } from "bun";

import path from "node:path";
import fs from "node:fs";

if (process.env.DO_NOT_CLEAR_DIST === undefined)
    fs.rmSync("./dist", { recursive: true }); // reset dist directory

const output = await build({
    entrypoints: [
        "./src/index.ts",
        "./src/Executable.ts",
        "./src/classes/pages/components/Editor.ts",
        "./src/classes/pages/assets/ClientFixMarkdown.ts",
        "./src/classes/pages/components/Markdown.ts",
        "./src/classes/pages/components/builder/Builder.tsx",
        "./src/classes/pages/components/MetadataEditor.tsx",
        "./src/classes/pages/components/site/UserSettings.tsx",
        "./src/classes/pages/components/Prefetch.ts",
    ],
    minify: {
        identifiers: true,
        syntax: true,
        whitespace: true,
    },
    target: "bun", // technically Editor.ts should have the "browser" target, but this hasn't caused any issues yet so it's fine!
    outdir: "dist",
    splitting: true,
    naming: {
        asset: "[name].[ext]",
        chunk: "[name]-[hash].[ext]",
        entry: "[name].[ext]", // do not include [dir]!!! files will NOT be findable if you include [dir]!!!
    },
    external: [
        // these files won't be included in the build
        "package.json",
        "data/config.json",
    ],
});

// import all fusion css
fs.cpSync(
    path.resolve(process.cwd(), "node_modules", "fusion", "src/css"),
    path.resolve(process.cwd(), "dist"),
    { recursive: true, filter: (name) => name !== "style.css" }
);

// log finished
console.log("\x1b[30;100m info \x1b[0m Build finished!");
