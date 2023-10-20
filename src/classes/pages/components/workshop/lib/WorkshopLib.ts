/**
 * @file Handle Workshop Library links
 * @name index.ts
 * @license MIT
 */

import Renderer2D from "../2d/2DRenderer";

// links
import Instances from "./services/Instances";
import Events from "./services/Events";

export default {
    Instances,
    Events,
    // controllers
    AbortScripts: new AbortController(),
};
