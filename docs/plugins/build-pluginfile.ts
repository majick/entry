import { build } from "bun";
import fs from "node:fs";

const output = await build({
    entrypoints: [
        "./example-pluginfile.ts"
    ],
    minify: {
        identifiers: true,
        syntax: true,
        whitespace: true,
    },
    target: "bun",
    splitting: true,
    outdir: "dist",
    naming: {
        asset: "[name].[ext]",
        chunk: "[name].[ext]",
        entry: "[name].[ext]", // do not include [dir]!!! files will NOT be findable if you include [dir]!!!
    }
});

// log finished
console.log("\x1b[92mBuild finished!\x1b[0m");
