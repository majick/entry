/**
 * @file Handle builder endpoint
 * @name index.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";

import EntryDB, { Paste } from "../../../db/EntryDB";
import { GetAssociation, PageHeaders, db } from "../../api/API";
import _404Page from "../404";

import TopNav from "../site/TopNav";
import Modal from "../site/modals/Modal";
import Footer from "../site/Footer";

/**
 * @export
 * @class WorkshopProjects
 * @implements {Endpoint}
 */
export class WorkshopProjects implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // check if workshop is enabled
        if (
            EntryDB.config &&
            EntryDB.config.app &&
            EntryDB.config.app.enable_workshop !== true
        )
            return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        if (!Association[0]) return new _404Page().request(request);

        // get projects
        const Projects = await EntryDB.Workshop.GetProjectsByOwner(Association[1]);
        if (!Projects[0] || !Projects[2]) return new _404Page().request(request);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav breadcrumbs={["paste", "workshop"]} border={false} />

                    <main>
                        <div className="editor-tab card round secondary">
                            <div
                                class={
                                    "card round border flex justify-space-between align-center"
                                }
                            >
                                <span>{Projects[1]}</span>
                                <button
                                    className="round"
                                    id={"entry:button.CreateProject"}
                                >
                                    Create New Project
                                </button>
                            </div>

                            <hr />

                            {Projects[2].forEach((project) => (
                                <div class={"card round border"}>
                                    <span>{project}</span>
                                </div>
                            ))}
                        </div>
                    </main>

                    <Modal
                        modalid="entry:modal.CreateProject"
                        buttonid="entry:button.CreateProject"
                        round={true}
                    >
                        <div
                            style={{
                                width: "50rem",
                                maxWidth: "100%",
                            }}
                        >
                            <h4 style={{ textAlign: "center", width: "100%" }}>
                                Create Project
                            </h4>

                            <hr />

                            <div className="flex g-4 flex-wrap justify-center">
                                <a
                                    href={"/paste/workshop/gl?d=2d"}
                                    class={"button border dashed __footer_cardbtn"}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="24"
                                        height="24"
                                        aria-label={"File Symbol"}
                                    >
                                        <path d="M3 3a2 2 0 0 1 2-2h9.982a2 2 0 0 1 1.414.586l4.018 4.018A2 2 0 0 1 21 7.018V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm2-.5a.5.5 0 0 0-.5.5v18a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V8.5h-4a2 2 0 0 1-2-2v-4Zm10 0v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0-.146-.336l-4.018-4.018A.5.5 0 0 0 15 2.5Z"></path>
                                    </svg>
                                    <b>2D</b>
                                </a>

                                <button
                                    class={"button border dashed __footer_cardbtn"}
                                    disabled
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="24"
                                        height="24"
                                        aria-label={"Cube Symbol"}
                                    >
                                        <path d="m8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm6.25 8.271 4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432Z"></path>
                                    </svg>
                                    <b>3D</b>
                                </button>
                            </div>

                            <hr />

                            <div className="flex justify-space-between align-center flex-wrap">
                                <span>You currently have {Projects[1]}</span>

                                <form method={"dialog"}>
                                    <button className="red round">Cancel</button>
                                </form>
                            </div>
                        </div>
                    </Modal>
                </>,
                <>
                    <title>Projects - {EntryDB.config.name} Workshop</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Content-Security-Policy": PageHeaders[
                        "Content-Security-Policy"
                    ].replace("default-src 'self'", "default-src *"),
                },
            }
        );
    }
}

/**
 * @export
 * @class WorkshopEditor
 * @implements {Endpoint}
 */
export class WorkshopEditor implements Endpoint {
    public async request(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // check if workshop is enabled
        if (
            EntryDB.config &&
            EntryDB.config.app &&
            EntryDB.config.app.enable_workshop !== true
        )
            return new _404Page().request(request);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        if (!Association[0]) return new _404Page().request(request);

        // return
        return new Response(
            Renderer.Render(
                <>
                    <div id="_doc" style={{ display: "contents" }} />

                    <script
                        type={"module"}
                        dangerouslySetInnerHTML={{
                            __html: `import Workshop from "/WorkshopEditor.js";
                            Workshop(document.getElementById("_doc"));`,
                        }}
                    />

                    <Modal
                        buttonid="entry:button.PageMenu"
                        modalid="entry:modal.PageMenu"
                        noIdMatch={true}
                        round={true}
                    >
                        <div className="flex justify-center align-center g-4">
                            <a
                                href={
                                    EntryDB.config.app &&
                                    EntryDB.config.app.enable_builder !== false
                                        ? "javascript:"
                                        : "/"
                                }
                                className={`button round border${
                                    EntryDB.config.app &&
                                    EntryDB.config.app.enable_builder !== false
                                        ? " modal:entry:button.NewPaste"
                                        : ""
                                }`}
                            >
                                New Paste
                            </a>
                        </div>

                        <hr />

                        <div className="flex justify-center align-center">
                            <form method={"dialog"}>
                                <button className="green round">Close Menu</button>
                            </form>
                        </div>

                        <Footer />
                    </Modal>
                </>,
                <>
                    <title>2D - {EntryDB.config.name} Workshop</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    ...PageHeaders,
                    "Content-Type": "text/html",
                    "Content-Security-Policy": PageHeaders[
                        "Content-Security-Policy"
                    ].replace("default-src 'self'", "default-src *"),
                },
            }
        );
    }
}

// default export
export default {
    WorkshopProjects,
    WorkshopEditor,
};
