/**
 * @file Handle builder endpoint
 * @name index.tsx
 * @license MIT
 */

import { Endpoint, Renderer } from "honeybee";

/**
 * @export
 * @class Builder
 * @implements {Endpoint}
 */
export default class Builder implements Endpoint {
    public async request(request: Request): Promise<Response> {
        return new Response(
            Renderer.Render(
                <>
                    <noscript>
                        <div
                            class={"mdnote note-error"}
                            style={{
                                marginBottom: "0.5rem",
                            }}
                        >
                            <b class={"mdnote-title"}>JavaScript Disabled</b>
                            <p>This page does not work without JavaScript access!</p>
                        </div>
                    </noscript>

                    <div id="builder"></div>

                    <script src={"/Builder.js"} type={"module"} />
                </>,
                <>
                    <title>Builder</title>
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
