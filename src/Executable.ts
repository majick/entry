/**
 * @file Handle executable start
 * @name Executable.ts
 * @license MIT
 */

import path from "node:path";
import fs from "node:fs";

import { CreateHash } from "./classes/db/helpers/Hash";

// start
console.log("\x1b[30;100m info \x1b[0m Running in executable mode!");
console.log(
    "\x1b[30;43m warn \x1b[0m Executable mode will make many calls to https//sentrytwo.com during start, and will likely download various files. These downloads will be logged in the standard output."
);

process.env.IMPORT_DIR! =
    import.meta.dir ||
    process.env.EXECUTABLE_STATIC_DIR ||
    path.dirname(process.execPath);

if (!fs.existsSync(process.env.IMPORT_DIR))
    fs.mkdirSync(process.env.IMPORT_DIR, { recursive: true });

// update executable
const ExpectedExecutable = `entry-${process.platform}-${process.arch}`;

try {
    const Executables = await (
        await fetch("https://sentrytwo.com/api/hashes?t=dist")
    ).json();

    // make sure our expected executable is available
    if (!Executables[ExpectedExecutable])
        throw new Error(
            `No executable available for your platform!\nExpected: ${ExpectedExecutable}\nValid: ${JSON.stringify(
                Object.keys(Executables)
            )}`
        );

    // check hash
    const ThisHash = CreateHash(await Bun.file(process.execPath).text());

    if (ThisHash !== Executables[ExpectedExecutable]) {
        // update executable!
        const Name = path.basename(process.execPath); // name to save the executable as
        const Dir = path.dirname(process.execPath); // path to save the executable in

        // ...self destruct
        fs.rmSync(process.execPath);

        // ...download new
        Bun.spawnSync({
            cmd: `curl https://sentrytwo.com/api/dist/${ExpectedExecutable} -o "${Dir}/${Name}"`.split(
                " "
            ),
            env: process.env,
            onExit: () => process.exit(),
        });

        console.log("\x1b[30;42m info \x1b[0m Entry executable updated!");
        process.exit();
    }
} catch {
    throw new Error(
        `\x1b[30;41m error \x1b[0m Failed to start in executable mode!\nUnable to check executable hash!`
    );
}

// update assets
try {
    if (path.basename(process.execPath).startsWith("entry")) {
        // download files
        const RequiredFiles = await (
            await fetch("https://sentrytwo.com/api/hashes")
        ).json();

        // ...check current files (remove unneeded)
        for (const file of fs.readdirSync(process.env.IMPORT_DIR!))
            if (!RequiredFiles[file]) {
                // ...delete file
                fs.rmSync(path.resolve(process.env.IMPORT_DIR!, file));

                // ...log
                console.log(
                    `\x1b[30;100m sync \x1b[0m Removing unneeded asset: "${file}"\x1b[0m`
                );
            }

        // ...check files
        for (const file of Object.entries(RequiredFiles)) {
            // 0: file name, 1: hash

            // check if file exists locally
            const FilePath = path.resolve(process.env.IMPORT_DIR!, file[0]);

            if (fs.existsSync(FilePath)) {
                // check hash
                const CurrentHash = CreateHash(await Bun.file(FilePath).text());
                if (CurrentHash === file[1]) continue;

                // ...delete file
                fs.rmSync(FilePath);

                // ...allow execution of the "download file" part
                console.log(
                    `\x1b[30;100m sync \x1b[0m Syncing asset: "${file[0]}"\x1b[0m`
                );
            }

            // download file
            await Bun.write(
                FilePath,
                await fetch(`https://sentrytwo.com/${file[0]}`)
            );

            console.log(
                `\x1b[30;100m sync \x1b[0m Asset synced: "${file[0]}"\x1b[0m`
            );

            continue;
        }
    }
} catch (err) {
    throw new Error(
        `\x1b[30;41m error \x1b[0m Failed to start in executable mode!\n${err}`
    );
}

// start server from "index.js" (should have been downloaded previously)
const IndexPath = path.resolve(process.env.IMPORT_DIR, "index.js");

if (!fs.existsSync(IndexPath))
    throw new Error(
        `\x1b[30;41m error \x1b[0m Failed to start in executable mode!\nAsset "index.js" does not exist! Please make sure it was synced properly.`
    );

await import(IndexPath);
