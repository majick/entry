/**
 * @file Handle Repos endpoints
 * @name Repos.ts
 * @license MIT
 */

import Honeybee, { Endpoint, Renderer } from "honeybee";
import { Server } from "bun";

import { Paste } from "../../db/objects/Paste";
import { CheckInstance, db } from "../Pages";

// import components
import TopNav from "../components/site/TopNav";
import Footer from "../components/site/Footer";
import _404Page from "../components/404";
import { PageHeaders } from "../api/API";

// nav component
export function ReposNav(props: { name: string; current: string }) {
    return (
        <div
            class="card secondary border round flex g-4"
            style={{ userSelect: "none" }}
        >
            <a
                className={`${
                    props.current === "Home" ? "secondary " : ""
                }button round full`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-label={"House Symbol"}
                >
                    <path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2Zm1.25 1.171a.25.25 0 0 0-.312 0l-5.25 4.2a.25.25 0 0 0-.094.196v7.019c0 .138.112.25.25.25H5.5V8.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v5.25h2.75a.25.25 0 0 0 .25-.25V6.23a.25.25 0 0 0-.094-.195Z"></path>
                </svg>
                Home
            </a>

            <a
                className={`${
                    props.current === "Versions" ? "secondary " : ""
                }button round full`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-label={"Versions Symbol"}
                >
                    <path d="M7.75 14A1.75 1.75 0 0 1 6 12.25v-8.5C6 2.784 6.784 2 7.75 2h6.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14Zm-.25-1.75c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25ZM4.9 3.508a.75.75 0 0 1-.274 1.025.249.249 0 0 0-.126.217v6.5c0 .09.048.173.126.217a.75.75 0 0 1-.752 1.298A1.75 1.75 0 0 1 3 11.25v-6.5c0-.649.353-1.214.874-1.516a.75.75 0 0 1 1.025.274ZM1.625 5.533h.001a.249.249 0 0 0-.126.217v4.5c0 .09.048.173.126.217a.75.75 0 0 1-.752 1.298A1.748 1.748 0 0 1 0 10.25v-4.5a1.748 1.748 0 0 1 .873-1.516.75.75 0 1 1 .752 1.299Z"></path>
                </svg>
                Versions
            </a>
        </div>
    );
}

// ...
export class RepoView implements Endpoint {
    public async request(request: Request, server: Server): Promise<Response> {
        const url = new URL(request.url);
        const search = new URLSearchParams(url.search);

        // handle cloud pages
        const IncorrectInstance = await CheckInstance(request, server);
        if (IncorrectInstance) return IncorrectInstance;

        // get paste name
        let name = url.pathname.slice(1, url.pathname.length).toLowerCase();
        if (name.startsWith("paste/vers/")) name = name.split("paste/vers/")[1];

        // attempt to get paste
        const result = (await db.GetPasteFromURL(name)) as Paste;
        if (!result) return new _404Page().request(request);

        const BuilderPaste = result.Content.startsWith("_builder:");

        // return
        return new Response(
            Renderer.Render(
                <>
                    <TopNav border={false} breadcrumbs={["paste", "vers", name]} />

                    <main className="small flex flex-column g-4">
                        <ReposNav name={name} current="Home" />

                        <div className="card round border">
                            {!BuilderPaste && (
                                // not builder paste, only show main file
                                // for builder pastes: show all pages as a separate file
                                <>
                                    <button className="round full justify-start">
                                        {name}.md
                                    </button>
                                </>
                            )}
                        </div>
                    </main>
                </>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                    ...PageHeaders,
                },
            }
        );
    }
}

// default export
export default {
    RepoView,
};
