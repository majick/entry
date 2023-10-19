import { render, hydrate } from "preact";

import Modal from "../site/modals/Modal";
import PublishModals from "../site/modals/PublishModals";

import Renderer2D from "./2d/2DRenderer";

export default function Render(element: HTMLElement) {
    // render
    render(
        <div
            class={"flex flex-column"}
            style={{
                height: "100%",
            }}
        >
            {/* topbar - tabs */}
            <div
                className="card flex justify-space-between"
                style={{
                    borderBottom: "solid 1px var(--background-surface2a)",
                    height: "76.2px",
                }}
            >
                <div class={"tabbar"}>
                    <button>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Pencil Symbol"}
                        >
                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                        </svg>
                        Game
                    </button>

                    <button class={"secondary"}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Code Symbol"}
                        >
                            <path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"></path>
                        </svg>
                        Code
                    </button>
                </div>

                <button
                    className="round invisible"
                    title={"Menu"}
                    // @ts-ignore
                    onClick={() => window.modals["entry:modal.PageMenu"](true)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Three Bar Menu Symbol"}
                    >
                        <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"></path>
                    </svg>
                </button>
            </div>

            {/* view panels */}
            <div
                id="tab_game"
                class={"editor-tab -editor active flex justify-center align-center"}
                style={{
                    height: "100%",
                }}
            >
                <canvas
                    id={"game_canvas"}
                    width={"1024"}
                    height={"512"}
                    style={{
                        background: "white",
                        maxWidth: "100%",
                    }}
                />
            </div>

            <div id="tab_code" class={"editor-tab -editor"}></div>
        </div>,
        element
    );

    // create game renderer
    const Renderer = new Renderer2D(
        `<Workshop version="1.0">
        <World name="World">
            <Shape type="Rectangle" color="blue">
                <Position x="0" y="0"></Position>
                <Size x="100" y="100"></Size>
            </Shape>
    
            <Shape type="Rectangle" color="blue">
                <Position x="100" y="0"></Position>
                <Size x="100" y="100"></Size>
            </Shape>
    
            <Shape type="Rectangle" color="blue">
                <Position x="200" y="0"></Position>
                <Size x="100" y="100"></Size>
            </Shape>
        </World>
    </Workshop>`,
        document.getElementById("game_canvas") as HTMLCanvasElement
    );
}
