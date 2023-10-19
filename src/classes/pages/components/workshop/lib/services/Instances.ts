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
        this.Element = element || document.createElement("World");
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

    /**
     * Creates an instance of Instance.
     * @param {(Instance | World)} parent
     * @param {string} type
     * @param {Element} [element]
     * @memberof Instance
     */
    constructor(parent: Instance | World, type?: string, element?: Element) {
        // set parent
        this.Parent = parent;

        // set element
        this.Element =
            // @ts-ignore
            element || globalThis.renderer.scene.createElement(type || "Instance");

        // append to parent
        this.Parent.Element.appendChild(this.Element);
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
     * @memberof Shape
     */
    constructor(parent: Instance | World, type: "rectangle") {
        super(parent, "Shape"); // element will be created automatically
        this.type = type;

        // get position element
        const Position = this.Element.querySelector("Position");

        this.PositionElement =
            // @ts-ignore
            Position || globalThis.renderer.scene.createElement("Position");

        if (!Position) {
            // append if element is new
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
            this.width = 5; // add width attribute
            this.height = 5; // add height attribute
            this.Element.appendChild(this.SizeElement);
        }

        if (Size)
            this._Size = {
                x: parseInt(Size.getAttribute("x") || "5"),
                y: parseInt(Size.getAttribute("y") || "5"),
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

    // get/set Position
    public get x(): number {
        return this._Size.x;
    }

    public get y(): number {
        return this._Size.y;
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

// default export
export default {
    World,
    Instance,
    Shape,
};
