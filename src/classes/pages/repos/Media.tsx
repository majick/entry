/**
 * @file Handle Media endpoints
 * @name Media.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

import { PageHeaders, GetAssociation, VerifyContentType } from "../api/API";
import Pages, { CheckInstance, db, Curiosity } from "../Pages";
import { CreateHash } from "../../db/helpers/Hash";
import { contentType } from "mime-types";
import EntryDB from "../../db/EntryDB";

// import components
import TopNav from "../components/site/TopNav";
import _404Page from "../components/404";
import { ReposNav } from "./Repos";

/**
 * @export
 * @class ViewPasteMedia
 * @implements {Endpoint}
 */
export class ViewPasteMedia implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/media/")) name = name.split("paste/media/")[1];

        // get paste
        const paste = await db.GetPasteFromURL(name, true);
        if (!paste) return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // get media files
        const Files = await EntryDB.Media.GetMediaByOwner(paste.CustomURL as string);

        // render
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["paste", "media", name]} margin={false} />

                    <div className="flex flex-column g-8">
                        <div
                            className="card secondary flex justify-center"
                            style={{
                                padding: "calc(var(--u-12) * 4) var(--u-12)",
                            }}
                        >
                            <h1 class={"no-margin"}>{name}</h1>
                        </div>

                        <main class={"small flex flex-column g-4"}>
                            <ReposNav name={name} current="Media" />

                            <div
                                className="card round border"
                                style={{
                                    width: "100%",
                                    borderRadius: "0.4rem",
                                }}
                            >
                                <div
                                    class={
                                        "flex g-4 align-center justify-space-between"
                                    }
                                >
                                    <div className="card border round secondary flex mobile-flex-column justify-center align-center g-4">
                                        <button
                                            id={"entry:button.UploadFile"}
                                            className="border round full"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Upload Symbol"}
                                            >
                                                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                                                <path d="M11.78 4.72a.749.749 0 1 1-1.06 1.06L8.75 3.811V9.5a.75.75 0 0 1-1.5 0V3.811L5.28 5.78a.749.749 0 1 1-1.06-1.06l3.25-3.25a.749.749 0 0 1 1.06 0l3.25 3.25Z"></path>
                                            </svg>
                                            Upload File
                                        </button>

                                        <a
                                            href={"javascript:window.history.back()"}
                                            class={"button border round full"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Undo Symbol"}
                                            >
                                                <path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path>
                                            </svg>
                                            Back
                                        </a>
                                    </div>
                                </div>

                                <hr />

                                <table
                                    class={"force-full"}
                                    style={{
                                        width: "100%",
                                        marginBottom: 0,
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th>Preview</th>
                                            <th>Name/Link</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {Files[2] &&
                                            Files[2].map((file) => (
                                                <tr>
                                                    <td
                                                        style={{
                                                            width: "10%",
                                                            minWidth: "6rem",
                                                        }}
                                                    >
                                                        <img
                                                            class={
                                                                "card border round NoPadding"
                                                            }
                                                            src={`/api/media/file/${paste.CustomURL}/${file}`}
                                                            alt={file}
                                                            style={{
                                                                width: "100%",
                                                            }}
                                                        />
                                                    </td>

                                                    <td class={"text-left"}>
                                                        <span className="flex flex-wrap g-4">
                                                            <a
                                                                href={`/f/${name}/${file}`}
                                                            >
                                                                {file.length > 25
                                                                    ? `${file.substring(
                                                                          0,
                                                                          24
                                                                      )}...`
                                                                    : file}
                                                            </a>

                                                            <a
                                                                className="button anchor"
                                                                href={`/f/${name}/${file}?edit=true`}
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 16 16"
                                                                    width="16"
                                                                    height="16"
                                                                    aria-label={
                                                                        "Pencil Symbol"
                                                                    }
                                                                >
                                                                    <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                                                </svg>
                                                                Edit
                                                            </a>
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            <Modal
                                modalid="entry:modal.UploadFile"
                                buttonid="entry:button.UploadFile"
                                round={true}
                            >
                                <h1
                                    style={{
                                        width: "25rem",
                                        maxWidth: "100%",
                                    }}
                                >
                                    Upload File
                                </h1>

                                <hr />

                                <form
                                    action="/api/media/upload"
                                    encType={"multipart/form-data"}
                                    method={"POST"}
                                    class={"flex flex-column g-8"}
                                >
                                    <input
                                        type="hidden"
                                        name="CustomURL"
                                        value={paste.CustomURL}
                                        required
                                    />

                                    <label htmlFor="EditPassword">
                                        <b>Paste Edit Code</b>
                                    </label>

                                    <input
                                        class={"round"}
                                        type="text"
                                        placeholder={"Edit code"}
                                        maxLength={EntryDB.MaxPasswordLength}
                                        minLength={EntryDB.MinPasswordLength}
                                        name={"EditPassword"}
                                        id={"EditPassword"}
                                        required
                                    />

                                    <label htmlFor="File">
                                        <b>File</b>
                                    </label>

                                    <input
                                        class={"round"}
                                        type="file"
                                        name="File"
                                        id={"File"}
                                        maxLength={
                                            EntryDB.config.app!.media!.max_size || 0
                                        }
                                        accept={"image/*"}
                                        required
                                    />

                                    <hr style={{ margin: 0 }} />

                                    <button
                                        className="round green"
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        Upload File
                                    </button>
                                </form>

                                <hr />

                                <form method={"dialog"}>
                                    <button
                                        className="red round"
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </form>
                            </Modal>
                        </main>
                    </div>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <title>Media - {EntryDB.config.name}</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                },
            }
        );
    }
}

/**
 * @export
 * @class InspectMedia
 * @implements {Endpoint}
 */
export class InspectMedia implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/file/")) name = name.split("paste/file/")[1];
        else if (name.startsWith("api/media/file/"))
            name = name.split("api/media/file/")[1];
        else if (name.startsWith("f/")) name = name.split("f/")[1];

        let FileName = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.split("/").length > 1) FileName = name.split("/").pop()!;
        name = name.split(`/${FileName}`)[0]; // remove file from paste name

        // get paste
        const paste = await db.GetPasteFromURL(name, true);
        if (!paste) return new _404Page().request(request);

        // if request.headers.Accept does not include "text/html", just return the file!
        // (this means it was sent from an img element or similar)
        if (
            request.headers.get("Accept") &&
            !request.headers.get("Accept")!.includes("text/html")
        )
            return new GetFile().request(request, server);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // ...
        const EditMode = url.searchParams.get("edit") === "true";

        // get media file
        const File = await EntryDB.Media.GetFile(name, FileName);
        if (!File[0] || !File[2]) return new _404Page().request(request);

        // render
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["f", name, FileName]} margin={false} />

                    <div className="flex flex-column g-8">
                        <div
                            className="card secondary flex justify-center"
                            style={{
                                padding: "calc(var(--u-12) * 4) var(--u-12)",
                            }}
                        >
                            <h1 class={"no-margin"}>{name}</h1>
                        </div>

                        <main class={"small flex flex-column g-4"}>
                            <ReposNav name={name} current="Media" />

                            <div className="flex flex-column g-4">
                                <div className="card border round secondary flex mobile-flex-column justify-center align-center g-4">
                                    <a
                                        href={`/paste/media/${name}`}
                                        class={"button border round full"}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            width="16"
                                            height="16"
                                            aria-label={"Picture Symbol"}
                                        >
                                            <path d="M21.75 21.5H2.25A1.75 1.75 0 0 1 .5 19.75V4.25c0-.966.784-1.75 1.75-1.75h19.5c.966 0 1.75.784 1.75 1.75v15.5a1.75 1.75 0 0 1-1.75 1.75ZM2.25 4a.25.25 0 0 0-.25.25v15.5c0 .138.112.25.25.25h3.178L14 10.977a1.749 1.749 0 0 1 2.506-.032L22 16.44V4.25a.25.25 0 0 0-.25-.25ZM22 19.75v-1.19l-6.555-6.554a.248.248 0 0 0-.18-.073.247.247 0 0 0-.178.077L7.497 20H21.75a.25.25 0 0 0 .25-.25ZM10.5 9.25a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Zm-1.5 0a1.75 1.75 0 1 0-3.501.001A1.75 1.75 0 0 0 9 9.25Z"></path>
                                        </svg>
                                        More Media
                                    </a>

                                    {(EditMode && (
                                        <a
                                            href={"?"}
                                            class={"button border round full"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="18"
                                                height="18"
                                                aria-label={"X Symbol"}
                                            >
                                                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                                            </svg>
                                            Stop Editing
                                        </a>
                                    )) || (
                                        <a
                                            href={"?edit=true"}
                                            class={"button border round full"}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 16 16"
                                                width="16"
                                                height="16"
                                                aria-label={"Pencil Symbol"}
                                            >
                                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                                            </svg>
                                            Edit
                                        </a>
                                    )}
                                </div>

                                {/* edit mode stuff */}
                                {!url.searchParams.get("EditPassword") &&
                                    EditMode && (
                                        <div className="card border round NoPadding">
                                            <div className="card round header">
                                                <b>Enter Edit Mode</b>
                                            </div>

                                            <div className="card round has-header">
                                                <div className="flex justify-center">
                                                    <form
                                                        class={
                                                            "flex g-4 justify-center flex-wrap"
                                                        }
                                                    >
                                                        <input
                                                            class={
                                                                "round mobile-max"
                                                            }
                                                            type="text"
                                                            placeholder={"Edit code"}
                                                            maxLength={
                                                                EntryDB.MaxPasswordLength
                                                            }
                                                            minLength={
                                                                EntryDB.MinPasswordLength
                                                            }
                                                            name={"EditPassword"}
                                                            id={"EditPassword"}
                                                            required
                                                        />

                                                        <input
                                                            type="hidden"
                                                            name="edit"
                                                            value={"true"}
                                                            required
                                                        />

                                                        <button
                                                            class={
                                                                "round green mobile-max"
                                                            }
                                                        >
                                                            Continue
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                {url.searchParams.get("EditPassword") &&
                                    EditMode && (
                                        <div class={"card border round NoPadding"}>
                                            <div className="card round header">
                                                <b>Actions</b>
                                            </div>

                                            <div className="card round has-header flex flex-wrap g-4">
                                                <form
                                                    action="/api/media/delete"
                                                    encType={"multipart/form-data"}
                                                    method={"POST"}
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="CustomURL"
                                                        value={paste.CustomURL}
                                                        required
                                                    />

                                                    <input
                                                        type="hidden"
                                                        name="EditPassword"
                                                        value={
                                                            url.searchParams.get(
                                                                "EditPassword"
                                                            ) || ""
                                                        }
                                                        required
                                                    />

                                                    <input
                                                        type="hidden"
                                                        name="File"
                                                        value={FileName}
                                                        required
                                                    />

                                                    <button className="round red">
                                                        Delete File
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                {/* normal stuff */}
                                <div class={"card border round NoPadding"}>
                                    <div className="card round header">
                                        <b>Preview</b>
                                    </div>

                                    <div className="card round has-header flex justify-center">
                                        <img
                                            class={"card border round NoPadding"}
                                            src={`/api/media/file/${name}/${FileName}`}
                                            alt={FileName}
                                            style={{
                                                width: "auto",
                                                height: "auto",
                                                maxWidth: "100%",
                                            }}
                                        />
                                    </div>
                                </div>

                                <div class={"card border round NoPadding"}>
                                    <div className="card round header">
                                        <b>Information</b>
                                    </div>

                                    <div className="card round has-header">
                                        <ul style={{ margin: 0 }}>
                                            <li>
                                                <b>File Size</b>: {File[2].size}{" "}
                                                bytes
                                            </li>

                                            <li>
                                                <b>File Name</b>: {FileName}
                                            </li>

                                            <li>
                                                <b>Link</b>:{" "}
                                                <a
                                                    href={`${url.origin}/f/${name}/${FileName}`}
                                                >{`${url.origin}/f/${name}/${FileName}`}</a>
                                            </li>

                                            <li>
                                                <b>Tags</b>: N/A
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <title>
                        {FileName} - {EntryDB.config.name}
                    </title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                },
            }
        );
    }
}

// API

/**
 * @export
 * @class GetFile
 * @implements {Endpoint}
 */
export class GetFile implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // don't check if media is disabled, as files should still be viewable even with media disabled!

        // get owner name and file name
        let Owner = url.pathname.slice(1, url.pathname.length).toLowerCase();

        if (Owner.startsWith("api/media/file/"))
            Owner = Owner.split("api/media/file/")[1];
        else if (Owner.startsWith("f/")) Owner = Owner.split("f/")[1];

        let File = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (Owner.split("/").length > 1) File = Owner.split("/").pop()!;
        Owner = Owner.split(`/${File}`)[0]; // remove file from paste name

        if (!Owner || !File) return new _404Page().request(request);

        // get file
        const file = await EntryDB.Media.GetFile(Owner, File);
        if (!file[0] && !file[2]) return new _404Page().request(request);

        // return
        return new Response(file[2], {
            status: 200,
            headers: {
                // get file content type based on name
                "Content-Type": contentType(File) || "application/octet-stream",
            },
        });
    }
}

/**
 * @export
 * @class ListFiles
 * @implements {Endpoint}
 */
export class ListFiles implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);

        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // don't check if media is disabled, as files should still be viewable even with media disabled!

        // get owner name and ifle name
        const name = url.pathname.slice(
            "/api/media/list/".length,
            url.pathname.length
        );

        const Owner = name.split("/")[0];
        const File = name.split("/")[1];

        if (!Owner || !File) return new _404Page().request(request);

        // get file
        const files = await EntryDB.Media.GetMediaByOwner(Owner);
        if (!files[0] && !files[2]) return new _404Page().request(request);

        // return
        return new Response(JSON.stringify(files), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}

/**
 * @export
 * @class UploadFile
 * @implements {Endpoint}
 */
export class UploadFile implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // make sure media is enabled (and exists)
        if (!EntryDB.Media) return new _404Page().request(request);

        // verify content type
        const WrongType = VerifyContentType(request, "multipart/form-data");
        if (WrongType) return WrongType;

        // get request body
        const FormData = await request.formData();

        // create body
        const body = {
            CustomURL: FormData.get("CustomURL") as string | undefined,
            EditPassword: FormData.get("EditPassword") as string | undefined,
        };

        const _file = FormData.get("File") as File | undefined;

        if (!body.CustomURL || !body.EditPassword || !_file)
            return new _404Page().request(request);

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return new _404Page().request(request);

        // validate password
        const admin =
            CreateHash(body.EditPassword) === CreateHash(EntryDB.config.admin);

        if (paste.EditPassword !== CreateHash(body.EditPassword) && !admin)
            return new Response("Invalid password", {
                status: 302,
                headers: {
                    Location: "/?err=Cannot upload file: Invalid password!",
                    "X-Entry-Error": "Cannot upload file: Invalid password!",
                },
            });

        // upload file
        const res = await EntryDB.Media.UploadFile(paste.CustomURL as string, _file);

        // return
        return new Response(JSON.stringify(res), {
            status: 302,
            headers: {
                "Content-Type": "application/json",
                Location: res[0] === true ? `/?msg=${res[1]}` : `/?err=${res[1]}`,
            },
        });
    }
}

/**
 * @export
 * @class DeleteFile
 * @implements {Endpoint}
 */
export class DeleteFile implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        // handle cloud pages
        const IncorrectInstance = await Pages.CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // make sure media is enabled (and exists)
        if (!EntryDB.Media) return new _404Page().request(request);

        // verify content type
        const WrongType = VerifyContentType(request, "multipart/form-data");
        if (WrongType) return WrongType;

        // get request body
        const FormData = await request.formData();

        // create body
        const body = {
            CustomURL: FormData.get("CustomURL") as string | undefined,
            EditPassword: FormData.get("EditPassword") as string | undefined,
            File: FormData.get("File") as string | undefined,
        };

        if (!body.CustomURL || !body.EditPassword || !body.File)
            return new _404Page().request(request);

        // get paste
        const paste = await db.GetPasteFromURL(body.CustomURL);
        if (!paste) return new _404Page().request(request);

        // validate password
        const admin =
            CreateHash(body.EditPassword) === CreateHash(EntryDB.config.admin);

        if (paste.EditPassword !== CreateHash(body.EditPassword) && !admin)
            return new Response("Invalid password", {
                status: 302,
                headers: {
                    Location: "/?err=Cannot delete file: Invalid password!",
                    "X-Entry-Error": "Cannot delete file: Invalid password!",
                },
            });

        // delete file
        const res = await EntryDB.Media.DeleteFile(
            paste.CustomURL as string,
            body.File
        );

        // return
        return new Response(JSON.stringify(res), {
            status: 302,
            headers: {
                "Content-Type": "application/json",
                Location: res[0] === true ? `/?msg=${res[1]}` : `/?err=${res[1]}`,
            },
        });
    }
}

// default export
export default {
    ViewPasteMedia,
    InspectMedia,
    // api
    ListFiles,
    GetFile,
    UploadFile,
    DeleteFile,
};
