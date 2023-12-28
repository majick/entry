import { BunFile } from "bun";
import path from "node:path";
import fs from "node:fs";

import translations from "./objects/translations.json";
import BundlesDB from "./BundlesDB";

import mime from "mime-types";

/**
 * @export
 * @class Media
 */
export default class Media {
    public static MediaLocation = "";
    private readonly db: BundlesDB;

    /**
     * Creates an instance of Expiry.
     * @memberof Expiry
     */
    constructor(db: BundlesDB) {
        this.db = db;
    }

    /**
     * @method Initialize
     *
     * @return {Promise<void>}
     * @memberof Expiry
     */
    public async Initialize(): Promise<void> {
        Media.MediaLocation = path.resolve(BundlesDB.DataDirectory, "media");

        // check config
        if (!BundlesDB.config) await BundlesDB.GetConfig();

        if (
            !BundlesDB.config.app ||
            !BundlesDB.config.app.media ||
            BundlesDB.config.app.media.enabled === false
        )
            return;

        // create media dir if it doesn't already exist
        if (!fs.existsSync(Media.MediaLocation)) fs.mkdirSync(Media.MediaLocation);

        // return
        return;
    }

    /**
     * @method GetFile
     *
     * @param {string} owner
     * @param {string} name
     * @return {Promise<[boolean, string, BunFile?]>}
     * @memberof Media
     */
    public async GetFile(
        owner: string,
        name: string
    ): Promise<[boolean, string, BunFile?]> {
        // don't check if media is disabled, as files should still be viewable even with media disabled!

        // ...
        const OwnerFolder = path.resolve(
            Media.MediaLocation,
            owner.replaceAll("/", ":sl:")
        );

        // return false if OwnerFolder doesn't exist
        if (!fs.existsSync(OwnerFolder))
            return [false, translations.English.error_no_files];

        // make sure file exists
        const FilePath = path.resolve(OwnerFolder, name);
        if (!fs.existsSync(FilePath))
            return [false, translations.English.error_file_not_found];

        // get file
        const file = Bun.file(FilePath);

        // return
        return [true, translations.English.file_exists, file];
    }

    /**
     * @method UploadFile
     *
     * @param {string} owner
     * @param {File} file
     * @return {Promise<[boolean, string]>}
     * @memberof Media
     */
    public async UploadFile(owner: string, file: File): Promise<[boolean, string]> {
        // ideally, the owner value would be checked for the correct password prior to calling UploadFile

        if (
            !BundlesDB.config.app ||
            !BundlesDB.config.app.media ||
            BundlesDB.config.app.media.enabled === false
        )
            return [false, translations.English.error_configuration];

        // ...
        const OwnerFolder = path.resolve(
            Media.MediaLocation,
            owner.replaceAll("/", ":sl:")
        );

        // create owner folder if it doesn't exist
        if (!fs.existsSync(OwnerFolder))
            fs.mkdirSync(OwnerFolder, { recursive: true });

        // check size
        if (file.size > (BundlesDB.config.app.media.max_size || 52428800))
            return [false, translations.English.error_too_large];

        // ...
        const FilePath = path.resolve(OwnerFolder, file.name.replaceAll(" ", "_"));

        // make sure file doesn't already exist
        if (fs.existsSync(FilePath))
            return [false, translations.English.error_file_exists];

        // upload file
        await Bun.write(FilePath, file);

        // return
        return [true, translations.English.file_created];
    }

    /**
     * @method DeleteFile
     *
     * @param {string} owner
     * @param {string} name
     * @return {Promise<[boolean, string]>}
     * @memberof Media
     */
    public async DeleteFile(
        owner: string,
        name: string
    ): Promise<[boolean, string]> {
        // ideally, the owner value would be checked for the correct password prior to calling DeleteFile

        if (
            !BundlesDB.config.app ||
            !BundlesDB.config.app.media ||
            BundlesDB.config.app.media.enabled === false
        )
            return [false, translations.English.error_configuration];

        // ...
        const OwnerFolder = path.resolve(
            Media.MediaLocation,
            owner.replaceAll("/", ":sl:")
        );

        // return false if OwnerFolder doesn't exist
        if (!fs.existsSync(OwnerFolder))
            return [false, translations.English.error_no_files];

        // make sure file exists
        const FilePath = path.resolve(OwnerFolder, name);
        if (!fs.existsSync(FilePath))
            return [false, translations.English.error_file_not_found];

        // delete file
        fs.rmSync(FilePath);

        // return
        return [true, translations.English.file_deleted];
    }

    /**
     * @method DeleteOwner
     *
     * @param {string} owner
     * @return {Promise<[boolean, string]>}
     * @memberof Media
     */
    public async DeleteOwner(owner: string): Promise<[boolean, string]> {
        // ideally, the owner value would be checked for the correct password prior to calling DeleteOwner

        if (
            !BundlesDB.config.app ||
            !BundlesDB.config.app.media ||
            BundlesDB.config.app.media.enabled === false
        )
            return [false, translations.English.error_configuration];

        // ...
        const OwnerFolder = path.resolve(
            Media.MediaLocation,
            owner.replaceAll("/", ":sl:")
        );

        // return false if OwnerFolder doesn't exist
        if (!fs.existsSync(OwnerFolder))
            return [false, translations.English.error_no_files];

        // delete directory
        fs.rmdirSync(OwnerFolder);

        // return
        return [true, translations.English.file_deleted];
    }

    /**
     * @method GetMediaByOwner
     *
     * @param {string} owner
     * @return {Promise<[boolean, string, string[]?]>}
     * @memberof Media
     */
    public async GetMediaByOwner(
        owner: string
    ): Promise<[boolean, string, string[]?]> {
        if (
            !BundlesDB.config.app ||
            !BundlesDB.config.app.media ||
            BundlesDB.config.app.media.enabled === false
        )
            return [false, translations.English.error_configuration];

        // ...
        const OwnerFolder = path.resolve(
            Media.MediaLocation,
            owner.replaceAll("/", ":sl:")
        );

        // return false if OwnerFolder doesn't exist
        if (!fs.existsSync(OwnerFolder))
            return [false, translations.English.error_no_files];

        // get all files
        const files = fs.readdirSync(OwnerFolder);

        // return files
        return [true, `${files.length} files`, files];
    }

    /**
     * @method EditFile
     *
     * @param {string} owner
     * @param {string} name
     * @param {string} content
     * @return {Promise<[boolean, string]>}
     * @memberof Media
     */
    public async EditFile(
        owner: string,
        name: string,
        content: string
    ): Promise<[boolean, string]> {
        if (
            !BundlesDB.config.app ||
            !BundlesDB.config.app.media ||
            BundlesDB.config.app.media.enabled === false
        )
            return [false, translations.English.error_configuration];

        // ...
        const OwnerFolder = path.resolve(
            Media.MediaLocation,
            owner.replaceAll("/", ":sl:")
        );

        // return false if OwnerFolder doesn't exist
        if (!fs.existsSync(OwnerFolder))
            return [false, translations.English.error_no_files];

        // make sure file exists
        const FilePath = path.resolve(OwnerFolder, name);
        if (!fs.existsSync(FilePath))
            return [false, translations.English.error_file_not_found];

        // update file
        await Bun.write(FilePath, content);

        // return
        return [true, translations.English.file_updated];
    }

    /**
     * @method CreateFolder
     *
     * @param {string} owner
     * @param {string} _path
     * @return {Promise<[boolean, string]>}
     * @memberof Media
     */
    public async CreateFolder(
        owner: string,
        _path: string
    ): Promise<[boolean, string]> {
        if (
            !BundlesDB.config.app ||
            !BundlesDB.config.app.media ||
            BundlesDB.config.app.media.enabled === false
        )
            return [false, translations.English.error_configuration];

        // ...
        const OwnerFolder = path.resolve(
            Media.MediaLocation,
            owner.replaceAll("/", ":sl:")
        );

        // make sure path doesn't already exist
        const Path = path.resolve(OwnerFolder, _path);
        if (!fs.existsSync(Path))
            return [false, translations.English.error_file_not_found];

        // create folder
        fs.mkdirSync(Path, { recursive: true });

        // return
        return [true, translations.English.file_created];
    }

    /**
     * @method GetFileType
     *
     * @static
     * @param {string} name
     * @return {string}
     * @memberof Media
     */
    public static GetFileType(name: string): string {
        const Mime = mime.contentType(name) || "";

        if (Mime.startsWith("image/")) return "image";
        else if (Mime.startsWith("audio/")) return "audio";
        else if (Mime.startsWith("text/"))
            if (Mime.startsWith("text/html")) return "html";
            else return "text";

        return "binary";
    }
}
