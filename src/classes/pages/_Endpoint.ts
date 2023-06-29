/**
 * @file Handle endpoint base
 * @name _Endpoint.ts
 * @license MIT
 */

interface Endpoint {
    request(request: Request): Promise<Response>;
}

export default Endpoint;
