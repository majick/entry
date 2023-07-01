import { build } from "bun";
import fs from "node:fs";

fs.rmSync("./dist", { recursive: true }); // reset dist directory
const output = await build({
    entrypoints: [
        "./src/index.ts",
        "./src/classes/pages/components/Editor.ts",
        "./src/classes/pages/assets/ClientFixMD.ts",
    ],
    // minify: true,
    target: "bun", // technically Editor.ts should have the "browser" target, but this hasn't caused any issues yet so it's fine!
    outdir: "dist",
    splitting: true,
    naming: {
        asset: "[name].[ext]",
        chunk: "[name].[ext]",
    },
});

console.log(output);
