/**
 * @file Example plugin
 * @name index.ts
 */

// import entrydb
// DO NOT USE THIS ENTRYDB, IT IS ONLY USED AS A TYPE
// THE ENTRYDB THAT IS USED IS ACCESSED FROM global.EntryDB
// ...make sure this only imports type so the Entry source isn't built again
import type EntryDB from "entry/src/classes/db/EntryDB";
import type Footer from "entry/src/classes/pages/components/site/Footer";

// import honeybee
import { Renderer, Endpoint, HoneybeeConfig } from "honeybee";

// create global
export type EntryGlobalType = {
    EntryDB: EntryDB;
    Footer: typeof Footer; // needed for client theme
};

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
