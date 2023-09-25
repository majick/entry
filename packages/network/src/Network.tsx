/**
 * @file Handle Entry network functionality
 * @name Network.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";
import { EntryGlobal } from "..";

/**
 * @export
 * @class Dashboard
 * @implements {Endpoint}
 */
export class Dashboard implements Endpoint {
    public async request(request: Request): Promise<Response> {
        return new Response(
            Renderer.Render(
                <>
                    <EntryGlobal.TopNav breadcrumbs={["app"]}>
                        <a href="/app/login" className="button round border">
                            Login
                        </a>
                    </EntryGlobal.TopNav>

                    <main class={"flex flex-column g-4 small"}>
                        <div className="card round secondary flex justify-center align-center">
                            <h1>Entry Network</h1>
                        </div>

                        <div className="flex justify-center align-center g-4 flex-wrap">
                            <a
                                href={"/search"}
                                className="card round border dashed GrowHover flex g-4 align-center"
                                style={{
                                    width: "max-content",
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                >
                                    <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
                                </svg>
                                Explore Pastes
                            </a>

                            <div
                                className="card round border dashed GrowHover"
                                style={{
                                    width: "max-content",
                                }}
                            >
                                Explore Pastes
                            </div>

                            <div
                                className="card round border dashed GrowHover"
                                style={{
                                    width: "max-content",
                                }}
                            >
                                Explore Pastes
                            </div>

                            <div
                                className="card round border dashed GrowHover"
                                style={{
                                    width: "max-content",
                                }}
                            >
                                Explore Pastes
                            </div>
                        </div>
                    </main>
                </>,
                <>
                    <title>Dashboard - Network - {EntryGlobal.Config.name}</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                },
            }
        );
    }
}

/**
 * @export
 * @class Login
 * @implements {Endpoint}
 */
export class Login implements Endpoint {
    public async request(request: Request): Promise<Response> {
        return new Response(
            Renderer.Render(
                <>
                    <EntryGlobal.TopNav breadcrumbs={["app", "login"]} />
                </>,
                <>
                    <title>Login - Network - {EntryGlobal.Config.name}</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                },
            }
        );
    }
}

// default export
export default {
    Dashboard,
    Login,
};
