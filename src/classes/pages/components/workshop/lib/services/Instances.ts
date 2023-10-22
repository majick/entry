/**
 * @file Handle instance-related functions
 * @name Instances.ts
 * @license MIT
 */

/**
 * @export
 * @class World
 */
export class World {
    public readonly Name: string;
    public Element: Element;

    /**
     * Creates an instance of World.
     * @param {string} name
     * @param {Element} [element]
     * @memberof World
     */
    constructor(name: string, element?: Element) {
        this.Name = name;

        // @ts-ignore
        this.Element = element || globalThis.renderer.scene.createElement("World");

        // @ts-ignore
        globalThis.renderer.scene.firstChild.appendChild(this.Element);
    }

    // ...

    /**
     * @method Get
     * @description Get a world element by name
     *
     * @static
     * @param {string} name
     * @return {World}
     * @memberof World
     */
    public static Get(name: string): World {
        return new World(
            name,
            // @ts-ignore
            globalThis.renderer.scene.querySelector(`World[name="${name}"]`)
        );
    }
}

/** *
 * @export
 * @class Instance
 * @description The base class of all instances
 */
export class Instance {
    public Parent: Instance | World;
    public Element: Element;

    public name: string = "New Instance";
    public readonly id: string = crypto.randomUUID();

    /**
     * Creates an instance of Instance.
     * @param {(Instance | World)} parent
     * @param {string} type
     * @param {Element} [element]
     * @param {boolean} figurative (not a real scene element)
     * @memberof Instance
     */
    constructor(
        parent: Instance | World,
        type?: string,
        name?: string,
        element?: Element,
        figurative?: boolean
    ) {
        // set parent
        this.Parent = parent;

        // set name
        this.name = name || "New Instance";

        // set element
        this.Element =
            // @ts-ignore
            element || globalThis.renderer.scene.createElement(type || "Instance");

        if (!figurative) {
            this.Element.setAttribute("name", this.name);

            // set id
            if (this.Element.getAttribute("id"))
                this.id = this.Element.getAttribute("id")!;
            else this.Element.setAttribute("id", this.id);

            // ...
            const IsNew = element === undefined;

            // append to parent
            if (IsNew) this.Parent.Element.appendChild(this.Element);

            // if id is the same thing as the name, remove element
            // this is to fix some weird bug which causes new elements to create
            // the correct named element, but also an id element
            if (this.id === this.name) this.Element.remove();
        }
    }
}

/**
 * @export
 * @class Shape
 * @extends {Instance}
 */
export class Shape extends Instance {
    public readonly type: "rectangle";

    // attributes
    private _Position: { x: number; y: number };
    private _Size: { x: number; y: number };
    private _Color: { r: number; g: number; b: number };

    private PositionElement: Element;
    private SizeElement: Element;
    private ColorElement: Element;

    /**
     * Creates an instance of Shape.
     * @param {(Instance | World)} parent
     * @param {"rectangle"} type
     * @param {string | undefined} name
     * @param {Element | undefined} element
     * @memberof Shape
     */
    constructor(
        parent: Instance | World,
        type: "rectangle",
        name?: string,
        element?: Element
    ) {
        super(parent, "Shape", name, element); // element will be created automatically
        this.type = type;

        // get position element
        const Position = this.Element.querySelector("Position");

        this.PositionElement =
            // @ts-ignore
            Position || globalThis.renderer.scene.createElement("Position");

        if (!Position) {
            // append if element is new
            this._Position = { x: 0, y: 0 };

            this.x = 0; // add x attribute
            this.y = 0; // add y attribute

            this.Element.appendChild(this.PositionElement);
        }

        if (Position)
            this._Position = {
                x: parseInt(Position.getAttribute("x") || "0"),
                y: parseInt(Position.getAttribute("y") || "0"),
            };
        else this._Position = { x: 0, y: 0 };

        // get size element
        const Size = this.Element.querySelector("Size");
        // @ts-ignore
        this.SizeElement = Size || globalThis.renderer.scene.createElement("Size");

        if (!Size) {
            // append if element is new
            this._Size = { x: 0, y: 0 };

            this.width = 1; // add width attribute
            this.height = 1; // add height attribute

            this.Element.appendChild(this.SizeElement);
        }

        if (Size)
            this._Size = {
                x: parseInt(Size.getAttribute("x") || "1"),
                y: parseInt(Size.getAttribute("y") || "1"),
            };
        else this._Size = { x: 5, y: 5 };

        // get color element
        const Color = this.Element.querySelector("Color");

        this.ColorElement =
            // @ts-ignore
            Color || globalThis.renderer.scene.createElement("Color");

        if (!Color) {
            // append if element is new
            this.color = { r: 255, g: 255, b: 255 }; // add attributes
            this.Element.appendChild(this.ColorElement);
        }

        if (Color)
            this._Color = {
                r: parseInt(Color.getAttribute("r") || "255"),
                g: parseInt(Color.getAttribute("g") || "255"),
                b: parseInt(Color.getAttribute("b") || "255"),
            };
        else this._Color = { r: 255, g: 255, b: 255 };
    }

    /**
     * @method CheckCollision
     *
     * @param {Shape} OtherShape
     * @return {[boolean, string]}
     * @memberof Shape
     */
    public CheckCollision(OtherShape: Shape): [boolean, string] {
        if (this.x === OtherShape.x && this.y === OtherShape.y) return [true, "xy"];

        if (this.x === OtherShape.x) return [true, "x"];
        else if (this.y === OtherShape.y) return [true, "y"];

        // default return
        return [false, ""];
    }

    /**
     * @method GetShapesByPosition
     *
     * @static
     * @param {number} x
     * @param {number} y
     * @return {Shape[]}
     * @memberof Shape
     */
    public static GetShapesByPosition(x: number, y: number): Shape[] {
        // @ts-ignore get world
        const world = World.Get(globalThis.renderer.CurrentWorldName);

        // @ts-ignore query select
        const Elements = world.Element.querySelectorAll(
            `Position[x="${x}"][y="${y}"]`
        );

        // create nodes
        const Nodes: Shape[] = [];

        for (const element of Elements as any as Element[]) {
            // make sure parent element is a shape! (we selected the position element)
            if (!element.parentElement || element.parentElement.nodeName !== "Shape")
                continue;

            // create figurative node
            Nodes.push(
                new Shape(
                    world,
                    "rectangle",
                    element.getAttribute("name")!,
                    element.parentElement
                )
            );

            // continue
            continue;
        }

        // return
        return Nodes;
    }

    /**
     * @method GetShapeByID
     *
     * @static
     * @param {string} id
     * @return {(Shape | undefined)}
     * @memberof Shape
     */
    public static GetShapeByID(id: string): Shape | undefined {
        // @ts-ignore get world
        const world = World.Get(globalThis.renderer.CurrentWorldName);

        // @ts-ignore query select
        const Element = world.Element.querySelector(`Shape#${id}`);
        if (!Element) return;

        // create figurative node and return
        return new Shape(world, "rectangle", Element.getAttribute("name")!, Element);
    }

    // get/set Position
    public get x(): number {
        return this._Position.x;
    }

    public get y(): number {
        return this._Position.y;
    }

    public set x(x: number) {
        this._Position.x = x;
        this.PositionElement.setAttribute("x", x.toString());
    }

    public set y(y: number) {
        this._Position.y = y;
        this.PositionElement.setAttribute("y", y.toString());
    }

    // get/set Size
    public get width(): number {
        return this._Size.x;
    }

    public get height(): number {
        return this._Size.y;
    }

    public set width(width: number) {
        this._Size.x = width;
        this.SizeElement.setAttribute("x", width.toString());
    }

    public set height(height: number) {
        this._Size.y = height;
        this.SizeElement.setAttribute("y", height.toString());
    }

    // get/set Color
    public get color(): typeof this._Color {
        return this._Color;
    }

    public set color(color: typeof this._Color) {
        this._Color = color;

        this.ColorElement.setAttribute("r", color.r.toString());
        this.ColorElement.setAttribute("g", color.g.toString());
        this.ColorElement.setAttribute("b", color.b.toString());
    }
}

/**
 * @export
 * @class Script
 * @extends {Instance}
 */
export class Script extends Instance {
    private _content: string;

    /**
     * Creates an instance of Script.
     * @param {(Instance | World)} parent
     * @param {string} content
     * @param {string | undefined} name
     * @param {Element | undefined} element
     * @param {boolean} figurative
     * @memberof Script
     */
    constructor(
        parent: Instance | World,
        content: string,
        name?: string,
        element?: Element,
        figurative?: boolean
    ) {
        super(parent, "Script", name, element, figurative);

        this._content = content;
        this.Element.innerHTML = this._content;
    }

    /**
     * @function FillModules
     * @description Handle script imports
     *
     * @private
     * @param {string} content
     * @return {string}
     * @memberof Script
     */
    private FillModules(content: string): string {
        // get module imports
        const moduleImports = content.matchAll(/(\#module)\(\"(?<URL>.*?)\"\)/g);

        for (const mod of moduleImports) {
            const { URL } = mod.groups!;
            const ModuleName = URL.split("module://")[1];

            // get script
            const _Script = this.Parent.Element.parentElement!.querySelector(
                `Script[name="${ModuleName}"]`
            );

            if (!_Script) {
                console.error(
                    "Module script cannot be found in scope: (self).Parent.Parent",
                    ModuleName
                );
                continue;
            }

            // get node content
            let ScriptContent = decodeURIComponent(_Script.innerHTML);
            ScriptContent = this.FillModules(ScriptContent); // fill this script's modules!

            // create blob
            const blob = new Blob([ScriptContent], {
                type: "application/javascript",
            });

            const url = globalThis.URL.createObjectURL(blob);

            // replace content
            content = content.replace(mod[0], `await import("${url}")/* ${URL} */`);

            // continue...
            continue;
        }

        // return
        return content;
    }

    /**
     * @method run
     * @memberof Script
     */
    public run() {
        // get content
        let content = decodeURIComponent(this._content);
        content += "\n// RUNTIME CONTENT\n";

        // if content starts with skip string, don't directly execute
        if (content.startsWith("// @module")) return;

        // include all module imports
        content = this.FillModules(content);

        // add main call
        content += "main(library);";

        // add stop observer
        content += `library.AbortScripts.signal.addEventListener("abort", () => {
            throw new Error("Script Aborted");
        });`;

        // replace script references

        // create blob
        const blob = new Blob([content], {
            type: "application/javascript",
        });

        // get url
        const url = URL.createObjectURL(blob);

        // add script
        const script = document.createElement("script");
        script.type = "module";
        script.src = url;

        // add script
        document.body.append(script);

        // revoke url
        URL.revokeObjectURL(url);

        // remove script
        script.remove();
    }

    // get/set code
    public get content(): string {
        return this._content;
    }

    public set content(content: string) {
        this._content = content;
        this.Element.innerHTML = content;
    }
}

/**
 * @function CreateInstance
 *
 * @export
 * @param {(World | Instance)} parent
 * @param {("Shape" | "Script")} type
 * @param {any} [value]
 * @param {string} [name]
 * @return {*}
 */
export function CreateInstance(
    parent: World | Instance,
    type: "Shape" | "Script" | "Instance",
    value?: any,
    name?: string
): any {
    const cl = type === "Shape" ? Shape : type === "Script" ? Script : Instance;
    if (!cl) return;

    // return
    return new cl(parent, value, name);
}

// default export
export default {
    World,
    Instance,
    Shape,
    Script,
    // ...
    CreateInstance,
};
