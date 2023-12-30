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

// check for "_bundles_old" file
const _bundles_old_path = path.resolve(
    path.dirname(process.execPath),
    "_bundles_old"
);

if (fs.existsSync(_bundles_old_path)) fs.rmSync(_bundles_old_path);

// update executable
const ExpectedExecutable = `bundles-${process.platform}-${process.arch}`;
let NeedsExecutableUpdate = false;

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

        // ...mark current executable as old
        fs.renameSync(process.execPath, path.join(Dir, "_bundles_old_path"));

        // ...download new
        console.log("\x1b[30;100m info \x1b[0m Installing updated executable...");
        console.log(
            "\x1b[30;100m info \x1b[0m Executable source:",
            `https://sentrytwo.com/api/dist/${ExpectedExecutable}`
        );

        NeedsExecutableUpdate = true;
        Bun.spawn({
            cmd: `curl https://sentrytwo.com/api/dist/${ExpectedExecutable} -o ${Name}`.split(
                " "
            ),
            cwd: Dir,
            env: process.env,
            onExit: () => {
                // make file executable
                Bun.spawn({
                    cmd: `chmod +x ./${Name}`.split(" "),
                    cwd: Dir,
                    env: process.env,
                    onExit: () => {
                        // exit
                        console.log(
                            "\x1b[30;42m info \x1b[0m Bundles executable updated!"
                        );

                        process.exit();
                    },
                });
            },
        });
    }
} catch (err) {
    throw new Error(
        `\x1b[30;41m error \x1b[0m Failed to start in executable mode!\n${err}`
    );
}

// ...
if (!NeedsExecutableUpdate) {
    // update assets
    try {
        if (path.basename(process.execPath).startsWith("bundles")) {
            // download files
            const RequiredFiles = await (
                await fetch("https://sentrytwo.com/api/hashes")
            ).json();

            // ...check current files (remove unneeded)
            for (const file of fs.readdirSync(process.env.IMPORT_DIR!))
                if (!RequiredFiles[file]) {
                    if (file.startsWith("bundles")) continue;

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
                fs.mkdirSync(path.dirname(FilePath), { recursive: true }); // make sure directory exists!

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
}
