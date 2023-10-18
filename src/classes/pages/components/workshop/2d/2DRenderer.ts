/**
 * @file Handle 2D Renderer
 * @name 2DRenderer.ts
 * @license MIT
 */

import { mat4 } from "gl-matrix";

/**
 * @export
 * @class Renderer2D
 */
export default class Renderer2D {
    scene: XMLDocument;
    gl: WebGL2RenderingContext;

    // ...
    ShaderProgram: WebGLProgram | undefined;

    /**
     * Creates an instance of Renderer2D.
     * @param {string} file
     * @param {HTMLCanvasElement} canvas
     * @memberof Renderer2D
     */
    constructor(file: string, canvas: HTMLCanvasElement) {
        // parse scene
        const scene = new DOMParser().parseFromString(file, "text/xml");
        this.scene = scene;

        const Root = scene.querySelector("Workshop");

        // get configuration from scene
        const Version = Root ? Root.getAttribute("version") : "1.0";

        // get canvas
        this.gl = canvas.getContext("webgl2")!;

        // ...
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clearDepth(1);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // create shader program
        this.CreateShaderProgram();

        if (this.ShaderProgram) {
            const attributeLocations = {
                vertexPosition: this.gl.getAttribLocation(
                    this.ShaderProgram,
                    "aVertextPosition"
                ),
            };

            const uniformLocations = {
                projectionMatrix: this.gl.getUniformLocation(
                    this.ShaderProgram,
                    "uProjectionMatrix"
                ),
                modelViewMatrix: this.gl.getUniformLocation(
                    this.ShaderProgram,
                    "uModelViewMatrix"
                ),
            };

            // ...TEST
            // create buffers
            const posBuffer = this.CreatePositionBuffer([
                1, 1, -1, 1, 1, -1, -1, -1, -1,
            ]);

            // pull positions
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);

            this.gl.vertexAttribPointer(
                attributeLocations.vertexPosition,
                2,
                this.gl.FLOAT,
                false,
                0,
                0
            );

            this.gl.enableVertexAttribArray(attributeLocations.vertexPosition);

            // set program
            this.gl.useProgram(this.ShaderProgram);
        }

        // start drawing
        // this.Draw();
        // window.requestAnimationFrame(this.Draw);
    }

    // positions

    /**
     * @method CreatePositionBuffer
     *
     * @private
     * @param {[
     *             number, // 1
     *             number, // 2
     *             number, // 3
     *             number, // 1
     *             number, // 2
     *             number, // 3
     *             number, // 1
     *             number, // 2
     *             number, // 3
     *         ]} positions
     * @return {WebGLBuffer}
     * @memberof Renderer2D
     */
    private CreatePositionBuffer(
        positions: [
            number, // 1
            number, // 2
            number, // 3
            number, // 1
            number, // 2
            number, // 3
            number, // 1
            number, // 2
            number, // 3
        ]
    ): WebGLBuffer {
        // create buffer
        const buffer = this.gl.createBuffer();

        // bind buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

        // create data
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(positions),
            this.gl.STATIC_DRAW
        );

        // return
        return buffer as WebGLBuffer;
    }

    // shaders

    /**
     * @method CreateShaderProgram
     *
     * @private
     * @return {(WebGLProgram | null)}
     * @memberof Renderer2D
     */
    private CreateShaderProgram(): WebGLProgram | null {
        // load shaders
        const vertexShader = this.LoadShader(
            this.gl.VERTEX_SHADER,
            `attribute vec4 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;

            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            }`
        );

        const fragmentShader = this.LoadShader(
            this.gl.FRAGMENT_SHADER,
            `void main() {
                gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }`
        );

        if (!vertexShader || !fragmentShader) return null;

        // create program
        this.ShaderProgram = this.gl.createProgram()!;

        // attach shaders
        this.gl.attachShader(this.ShaderProgram, vertexShader);
        this.gl.attachShader(this.ShaderProgram, fragmentShader);

        // link
        this.gl.linkProgram(this.ShaderProgram);

        // make sure program successfully linked
        if (!this.gl.getProgramParameter(this.ShaderProgram, this.gl.LINK_STATUS)) {
            this.ShaderProgram = undefined;
            throw new Error("Failed to create shader program");
        }

        // return
        return this.ShaderProgram;
    }

    /**
     * @method LoadShader
     *
     * @private
     * @param {number} type
     * @param {string} source
     * @return {(WebGLShader | null)}
     * @memberof Renderer2D
     */
    private LoadShader(type: number, source: string): WebGLShader | null {
        // create shader
        const _shader = this.gl.createShader(type);

        if (!_shader) throw Error("Failed to create shader!");

        // send source
        this.gl.shaderSource(_shader, source);

        // compile shader
        this.gl.compileShader(_shader);

        // make sure shader compiled
        if (!this.gl.getShaderParameter(_shader, this.gl.COMPILE_STATUS)) {
            // delete shader
            this.gl.deleteShader(_shader);

            // return
            console.error("[shader]: error compiling shader");
            return null;
        }

        // return
        return _shader;
    }

    // draw function

    /**
     * @method Draw
     *
     * @memberof Renderer2D
     */
    public Draw() {
        // request next frame
    }
}
