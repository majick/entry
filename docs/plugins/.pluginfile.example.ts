/**
 * @file Example plugin import file
 * @name .pluginfile.example.ts
 */

import path from "node:path";

// import plugins
import pluginExample from "./plugin-example";

// export plugins
export default [[path.resolve(import.meta.dir, "./plugin-example"), pluginExample]];
