/**
 * @file Start Entry server
 * @name index.ts
 * @license MIT
 */

import { _Server } from "./classes/Server";

// create server
new _Server(parseInt(process.env.PORT || "8080"));
