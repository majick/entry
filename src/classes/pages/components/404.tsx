import Endpoint from "../_Endpoint";
import Renderer from "../_Render";

import Footer from "./Footer";

/**
 * @export
 * @class _404Page
 * @implements {Endpoint}
 */
export default class _404Page implements Endpoint {
    public async request(request: Request): Promise<Response> {
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
                </main>
            ),
            {
                headers: {
                    "Content-Type": "text/html",
                },
            }
        );
    }
}
