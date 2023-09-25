/**
 * @file Example plugin
 * @name index.ts
 */

// ...
import type { EntryGlobalType } from "entry/src";
import type _404Page from "entry/src/classes/pages/components/404";

// import honeybee
import { Renderer, Endpoint, HoneybeeConfig } from "honeybee";

// create global
const EntryGlobal = global as unknown as EntryGlobalType;

// create page...
const _Footer = EntryGlobal.Footer;
export class HelloWorld implements Endpoint {
    async request(request: Request): Promise<Response> {
        return new Response(
            Renderer.Render(
                <>
                    <main>
                        <div className="editor-tab">
                            <h1>Hello, world!</h1>
                        </div>

                        <_Footer />
                    </main>
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

// return
export default {
    "/plugin-example/hello": {
        Page: HelloWorld,
    },
} as HoneybeeConfig["Pages"];
