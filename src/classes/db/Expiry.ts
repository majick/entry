import path from "node:path";

import EntryDB from "./EntryDB";
import { Config } from "../..";

/**
 * @export
 * @class Expiry
 */
export default class Expiry {
    public static ExpiryFileLocation = "";

    private static config: Config;
    private readonly db: EntryDB;

    /**
     * Creates an instance of Expiry.
     * @memberof Expiry
     */
    constructor(db: EntryDB) {
        this.db = db;
    }

    /**
     * @method Initialize
     *
     * @return {Promise<void>}
     * @memberof Expiry
     */
    public async Initialize(location: string): Promise<void> {
        Expiry.ExpiryFileLocation = location;

        // read config
        Expiry.config = (await EntryDB.GetConfig()) as Config;

        // check if expiry file exists
        if (!(await Bun.file(Expiry.ExpiryFileLocation).exists()))
            // create file since it doesn't
            await Bun.write(Expiry.ExpiryFileLocation, "");

        return;
    }

    /**
     * @method AddPasteExpiry
     *
     * @param {string} CustomURL
     * @param {string} ExpiryDate
     * @returns {Promise<[boolean, string, string]>}
     * @memberof Expiry
     */
    public async AddPasteExpiry(
        CustomURL: string,
        ExpiryDate: string
    ): Promise<[boolean, string, string]> {
        // add paste expiry
        await Bun.write(
            Expiry.ExpiryFileLocation,
            (await Bun.file(Expiry.ExpiryFileLocation).text()) +
                `${CustomURL}|${new Date(ExpiryDate).toISOString()}&`
        );

        // return
        return [true, CustomURL, ExpiryDate];
    }

    /**
     * @method CheckExpiry
     *
     * @return {Promise<void>}
     * @memberof Expiry
     */
    public async CheckExpiry(): Promise<void> {
        // load file
        let ExpiryFile = await Bun.file(Expiry.ExpiryFileLocation).text();

        // split by "&" (we use that to separate, not using JSON to save space)
        for (let entry of ExpiryFile.split("&")) {
            if (entry === "") continue; // don't check blank (will be at the end of the file)

            // get CustomURL and ExpiryDate
            // separated by | character
            const CustomURL = entry.split("|")[0];
            const ExpiryDate = new Date(entry.split("|")[1]);

            // compare current date with expiry date
            if (ExpiryDate <= new Date()) {
                // delete paste
                await this.db.DeletePaste(
                    {
                        CustomURL,
                    },
                    Expiry.config.admin // use admin password
                );

                // remove from ExpiryFile
                ExpiryFile = ExpiryFile.replace(`${entry}&`, "");

                // gc
                Bun.gc(true);
            }
        }

        // write ExpiryFile
        await Bun.write(Expiry.ExpiryFileLocation, ExpiryFile);
    }

    /**
     * @method GetExpiryDate
     *
     * @param {string} CustomURL
     * @return {Promise<[boolean, Date?]>}
     * @memberof Expiry
     */
    public async GetExpiryDate(CustomURL: string): Promise<[boolean, Date?]> {
        // load file
        const ExpiryFile = await Bun.file(Expiry.ExpiryFileLocation).text();

        // find paste
        // we're looking for {CustomURL}| so if there is a paste url including the
        // custom url, it doesn't get matched
        if (!ExpiryFile.includes(`&${CustomURL}|`)) return [false];

        // gc
        Bun.gc(true);

        // return
        return [true, new Date(ExpiryFile.split(`&${CustomURL}|`)[1].split("&")[0])];
    }
}
