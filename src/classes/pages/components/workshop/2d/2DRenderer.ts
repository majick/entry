/**
 * @file Handle 2D Renderer
 * @name 2DRenderer.ts
 * @license MIT
 */

import { Script, World } from "../lib/services/Instances";

/**
 * @export
 * @class Renderer2D
 */
export default class Renderer2D {
    public scene: XMLDocument | undefined;
    public readonly gl: WebGL2RenderingContext;
    private readonly canvas: HTMLCanvasElement;

    public AutoDraw: boolean = true;

    // ...
    private ShaderProgram: WebGLProgram | undefined;
    private locations:
        | {
              position: number;
              resolution: WebGLUniformLocation | null;
              color: WebGLUniformLocation | null;
          }
        | undefined;

    public CurrentWorldName: string = "World";
    public LastWorldName: string = ""; // blank by default so scripts are run on first load!

    /**
     * Creates an instance of Renderer2D.
     * @param {string} file
     * @param {HTMLCanvasElement} canvas
     * @memberof Renderer2D
     */
    constructor(file: string, canvas: HTMLCanvasElement) {
        // get canvas
        this.gl = canvas.getContext("webgl2")!;
        this.canvas = canvas;

        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clearDepth(1);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        // create shader program
        this.CreateShaderProgram();

        if (this.ShaderProgram) {
            this.locations = {
                position: this.gl.getAttribLocation(
                    this.ShaderProgram,
                    "a_position"
                ),
                // uniforms
                resolution: this.gl.getUniformLocation(
                    this.ShaderProgram,
                    "u_resolution"
                ),
                color: this.gl.getUniformLocation(this.ShaderProgram, "u_color"),
            };

            // set program
            this.gl.useProgram(this.ShaderProgram);

            // bind vertex array object
            const VertexArray = this.gl.createVertexArray();
            this.gl.bindVertexArray(VertexArray);

            // set resolution
            this.gl.uniform2f(
                this.locations.resolution,
                canvas.width,
                canvas.height
            );

            // create buffers
            const buffers = {
                position: {
                    buffer: this.gl.createBuffer(),
                    size: 2,
                    type: this.gl.FLOAT,
                    normalize: false,
                    stride: 0,
                    offset: 0,
                },
            };

            // get position buffer
            this.gl.enableVertexAttribArray(this.locations.position);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.position.buffer); // bind buffer
            this.gl.vertexAttribPointer(
                this.locations.position,
                buffers.position.size,
                buffers.position.type,
                buffers.position.normalize,
                buffers.position.stride,
                buffers.position.offset
            );
        }

        // parse scene
        this.UpdateScene(file);
    }

    /**
     * @method UpdateScene
     *
     * @param {string} file
     * @return {*}  {Document}
     * @memberof Renderer2D
     */
    public UpdateScene(file: string): XMLDocument {
        const scene = new DOMParser().parseFromString(file, "text/xml");
        this.scene = scene;

        // clear and draw
        this.ClearCanvas();
        this.Draw();

        // return
        return scene;
    }

    /**
     * @method CheckCanvasSize
     * @memberof Renderer2D
     */
    public CheckCanvasSize() {
        const ShouldResize =
            this.canvas.width !== this.canvas.clientWidth ||
            this.canvas.height !== this.canvas.clientHeight;

        if (ShouldResize) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;

            this.gl.viewport(
                0,
                0,
                this.gl.drawingBufferWidth,
                this.gl.drawingBufferHeight
            );
        }
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
            `#version 300 es

            in vec2 a_position;
            
            uniform vec2 u_resolution;
            
            void main() {
                vec2 zeroToOne = a_position / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            }`
        );

        const fragmentShader = this.LoadShader(
            this.gl.FRAGMENT_SHADER,
            `#version 300 es
            precision highp float;
            
            uniform vec4 u_color;

            out vec4 outColor;
            
            void main() {
                outColor = u_color;
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

    // shapes

    /**
     * @method CreateRectangle
     *
     * @private
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @return {[number, number, number, number]}
     * @memberof Renderer2D
     */
    private CreateRectangle(
        x: number,
        y: number,
        width: number,
        height: number
    ): [number, number, number, number] {
        const x1 = x;
        const x2 = x + width;
        const y1 = y;
        const y2 = y + height;

        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
            this.gl.STATIC_DRAW
        );

        return [x1, x2, y1, y2];
    }

    // ...

    /**
     * @method ClearCanvas
     * @memberof Renderer2D
     */
    public ClearCanvas(): void {
        this.gl.clear(
            this.gl.COLOR_BUFFER_BIT |
                this.gl.DEPTH_BUFFER_BIT |
                this.gl.STENCIL_BUFFER_BIT
        );
    }

    /**
     * @method Draw
     * @memberof Renderer2D
     */
    public Draw(): void {
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    /**
     * @method RGBtoDecimal
     *
     * @static
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @return {[number, number, number]}
     * @memberof Renderer2D
     */
    public static RGBtoDecimal(
        r: number,
        g: number,
        b: number
    ): [number, number, number] {
        return [r / 255, g / 255, b / 255];
    }

    /**
     * @method ParseWorld
     *
     * @param {string} name
     * @return {boolean}
     * @memberof Renderer2D
     */
    public ParseWorld(name: string): boolean {
        if (!this.locations || !this.scene) return false;
        this.ClearCanvas();

        // get world
        const WorldNode = World.Get(name);
        if (!WorldNode) return false;

        // ...
        this.CurrentWorldName = name;

        // check if world changed
        if (this.LastWorldName !== this.CurrentWorldName) {
            this.LastWorldName = this.CurrentWorldName;

            // run scripts
            for (const script of WorldNode.Element.querySelectorAll(
                "Script"
            ) as any as HTMLElement[]) {
                const Node = new Script(
                    WorldNode,
                    script.innerHTML,
                    script.getAttribute("name") || "New Script",
                    script
                );

                Node.run();
                continue;
            }
        }

        // parse objects

        // ...shapes
        for (const object of WorldNode.Element.querySelectorAll(
            "Shape"
        ) as any as HTMLElement[]) {
            // get position
            const position = object.querySelector("Position");

            // get size
            const size = object.querySelector("Size");

            // get color
            const color = object.querySelector("Color");

            // ...
            if (!position || !size || !color) continue;

            // add shape

            // create rectangle
            this.CreateRectangle(
                parseInt(position.getAttribute("x") || "0"),
                parseInt(position.getAttribute("y") || "0"),
                parseInt(size.getAttribute("x") || "5") || 5,
                parseInt(size.getAttribute("y") || "5") || 5
            );

            // ...set color
            const [r, g, b] = Renderer2D.RGBtoDecimal(
                // convert rgb into values from 0 to 1
                parseInt(color.getAttribute("r") || "0"),
                parseInt(color.getAttribute("g") || "0"),
                parseInt(color.getAttribute("b") || "0")
            );

            this.gl.uniform4f(this.locations.color, r, g, b, 1);

            // draw
            this.Draw();
        }

        // return
        return true;
    }

    /**
     * @method BeginDrawing
     * @memberof Renderer2D
     */
    public BeginDrawing() {
        // draw loop
        const StartDraw = () => {
            if (!this.AutoDraw) return window.requestAnimationFrame(StartDraw); // still request next frame!

            this.CheckCanvasSize(); // make sure canvas is the correct size
            this.ParseWorld(this.CurrentWorldName); // parse world and load

            return window.requestAnimationFrame(StartDraw);
        };

        // initial draw
        StartDraw();
    }
}
