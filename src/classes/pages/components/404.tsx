import { Endpoint, Renderer } from "honeybee";

import Footer from "./site/Footer";

import EntryDB from "../../db/EntryDB";
import { Config } from "../../..";
let config: Config;

import { DefaultHeaders, GetAssociation } from "../api/API";
import { Curiosity } from "../Pages";

/**
 * @function _404Page
 *
 * @export
 * @return {*}
 */
export function _404Page(props: { pathname?: string }): any {
    return (
        <main>
            <div
                class={"flex flex-column g-4 align-center"}
                style={{
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
        const url = new URL(request.url);

        // get association
        const Association = await GetAssociation(request, null);
        if (Association[1].startsWith("associated=")) Association[0] = false;

        // return
        return new Response(
            Renderer.Render(
                <>
                    <_404Page pathname={url.pathname} />

                    {/* curiosity */}
                    <Curiosity Association={Association} />
                </>,
                <>
                    <title>404 - {EntryDB.config.name}</title>
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
