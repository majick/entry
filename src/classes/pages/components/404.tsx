import { Endpoint, Renderer } from "honeybee";

import Footer from "./site/Footer";

import EntryDB from "../../db/EntryDB";
import { Config } from "../../..";
let config: Config;

import { DefaultHeaders } from "../api/API";

/**
 * @function _404Page
 *
 * @export
 * @return {*}
 */
export function _404Page(): any {
    return (
        <main>
            <div
                style={{
                    display: "grid",
                    flexDirection: "column",
                    placeItems: "center",
                    margin: "3rem 0 3rem 0",
                }}
            >
                <h4>Error</h4>
                <h5
                    style={{
                        fontWeight: "normal",
                        marginTop: "0",
                    }}
                >
                    404 not found
                </h5>
            </div>

            <Footer />
        </main>
    );
}

/**
 * @export
 * @class _404Page
 * @implements {Endpoint}
 */
export default class _404PageEndpoint implements Endpoint {
    public async request(request: Request): Promise<Response> {
        if (!config) config = (await EntryDB.GetConfig()) as Config;

        return new Response(
            Renderer.Render(
                _404Page(),
                <>
                    <title>404 - {config.name}</title>
                    <link rel="icon" href="/favicon" />
                </>
            ),
            {
                status: 404,
                headers: {
                    ...DefaultHeaders,
                    "Content-Type": "text/html",
                },
            }
        );
    }
}
