import EntryDB from "../../../db/EntryDB";
import Modal from "./modals/Modal";
import Footer from "./Footer";

export default function TopNav(props: { breadcrumbs?: string[] }) {
    // build breadcrumbs
    const crumbs: any[] = [];

    if (props.breadcrumbs)
        for (const crumb of props.breadcrumbs) {
            if (crumb === "paste") continue;

            const RealIndex = props.breadcrumbs.indexOf(crumb);
            const index =
                props.breadcrumbs[0] !== "paste"
                    ? RealIndex
                    : // if first breadcrumb is /paste, shift everything down 1
                      props.breadcrumbs.indexOf(crumb) - 1;

            // add to crumbs
            crumbs.push(
                <>
                    {index !== 0 && (
                        <span
                            style={{
                                margin: "var(--u-02)",
                            }}
                        >
                            /
                        </span>
                    )}

                    <a
                        href={`/${
                            RealIndex !== 0
                                ? `${props.breadcrumbs
                                      .slice(0, RealIndex)
                                      .join("/")}/`
                                : ""
                        }${crumb}`}
                        style={{
                            fontWeight: "normal",
                        }}
                    >
                        {crumb}
                    </a>
                </>
            );
        }

    // return
    return (
        <nav
            class={"g-8"}
            id={"entry:nav.Top"}
            style={{
                marginBottom: "1rem",
            }}
        >
            {/* left */}
            <span
                style={{
                    maxWidth: "50%",
                    overflow: "hidden",
                    wordBreak: "initial",
                    textOverflow: "ellipsis",
                    whiteSpace: "pre",
                    userSelect: "none",
                }}
            >
                <a href="/">{EntryDB.config.name}</a>

                {/* breadcrumbs */}
                {props.breadcrumbs && (
                    <span
                        style={{
                            margin: "var(--u-02)",
                            userSelect: "none",
                        }}
                    >
                        /
                    </span>
                )}

                {crumbs.map((c) => c)}
            </span>

            {/* right */}
            <div className="flex justify-center align-center g-4 flex-wrap">
                <a href="/" className="button round border">
                    Home
                </a>

                <div className="hr-left" />

                <button
                    id={"entry:button.PageMenu"}
                    className="round invisible"
                    title={"Menu"}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        aria-label={"Three Bars Menu Symbol"}
                    >
                        <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"></path>
                    </svg>
                </button>
            </div>

            <Modal
                buttonid="entry:button.PageMenu"
                modalid="entry:modal.PageMenu"
                round={true}
            >
                {props.breadcrumbs && (
                    <>
                        <div className="flex justify-center align-center g-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                aria-label={"Path Symbol"}
                            >
                                <path d="M13.94 3.045a.75.75 0 0 0-1.38-.59l-4.5 10.5a.75.75 0 1 0 1.38.59l4.5-10.5ZM5 11.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"></path>
                            </svg>
                            {crumbs.map((c) => c)}
                        </div>
                    </>
                )}

                <hr />

                <div className="flex justify-center align-center">
                    <form method={"dialog"}>
                        <button className="green round">Close Menu</button>
                    </form>
                </div>

                <Footer />
            </Modal>

            {/* scripts */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `const nav = document.getElementById("entry:nav.Top");
                    document.body.addEventListener("scroll", () => {
                        if (document.body.scrollTop < 50)
                            nav.classList.remove("scroll");
                        else
                            if (!nav.classList.contains("scroll")) 
                                nav.classList.add("scroll");
                    })`,
                }}
            />
        </nav>
    );
}
