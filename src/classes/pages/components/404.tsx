import Endpoint from "../_Endpoint";
import Renderer from "../_Render";

import Footer from "./Footer";

import EntryDB from "../../db/EntryDB";
import { Config } from "../../..";
let config: Config;

import { DefaultHeaders } from "../API";

/**
 * @export
 * @class _404Page
 * @implements {Endpoint}
 */
export default class _404Page implements Endpoint {
    public async request(request: Request): Promise<Response> {
        if (!config) config = (await EntryDB.GetConfig()) as Config;

        return new Response(
            Renderer.Render(
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
                </main>,
                <>
                    <title>404 - {config.name}</title>
                </>
            ),
            {
                headers: {
                    ...DefaultHeaders,
                    "Content-Type": "text/html",
                },
            }
        );
    }
}
