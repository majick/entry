import EntryDB from "../../../../db/EntryDB";
import LoadingModal from "./Loading";
import Modal from "./Modal";

export function AuthModals(props: { use: "login" | "logout" }) {
    return (
        <>
            <iframe
                name={"association_frame"}
                style={{
                    display: "none",
                }}
                // @ts-ignore
                onload={`(${((event: any) => {
                    // check path
                    if (event.target.contentWindow.location.pathname !== "/") return;

                    // redirect (show error on this page instead)
                    const SearchParams = new URLSearchParams(
                        event.target.contentWindow.location.search
                    );

                    // get message or error
                    const msg = SearchParams.get("msg");
                    const err = SearchParams.get("err");

                    // redirect
                    if (msg) window.location.href = `?msg=${msg}`;
                    else if (err) window.location.href = `?err=${err}`;
                }).toString()})(event);`}
            ></iframe>

            {props.use === "login" && (
                <Modal
                    buttonid="entry:button.login"
                    modalid="entry:modal.login"
                    noIdMatch={true}
                    round={true}
                >
                    <h1
                        style={{
                            width: "25rem",
                            maxWidth: "100%",
                        }}
                    >
                        Associate Paste
                    </h1>

                    <hr />

                    <form
                        action="/api/associate"
                        method={"POST"}
                        target={"association_frame"}
                        class={"flex flex-column g-10"}
                    >
                        <input
                            type="text"
                            placeholder={"Paste URL"}
                            maxLength={EntryDB.MaxCustomURLLength}
                            minLength={EntryDB.MinCustomURLLength}
                            name={"CustomURL"}
                            id={"CustomURL"}
                            autoComplete={"off"}
                            class={"round"}
                            required
                        />

                        <input
                            type="text"
                            placeholder={"Paste Edit Password"}
                            maxLength={EntryDB.MaxPasswordLength}
                            minLength={EntryDB.MinPasswordLength}
                            name={"EditPassword"}
                            id={"EditPassword"}
                            autoComplete={"off"}
                            class={"round"}
                            required
                        />

                        <button
                            class={"round modal:entry:button.Loading"}
                            style={{
                                width: "100%",
                            }}
                        >
                            Login
                        </button>
                    </form>

                    <hr />

                    <form method="dialog" class={"mobile-max"}>
                        <button
                            class={"green round"}
                            style={{
                                width: "100%",
                            }}
                        >
                            Cancel
                        </button>
                    </form>
                </Modal>
            )}

            {props.use === "logout" && (
                <Modal
                    buttonid="entry:button.logout"
                    modalid="entry:modal.logout"
                    noIdMatch={true}
                    round={true}
                >
                    <h1
                        style={{
                            width: "25rem",
                            maxWidth: "100%",
                        }}
                    >
                        Logout
                    </h1>

                    <hr />

                    <div
                        class={"flex g-4"}
                        style={{
                            width: "100%",
                        }}
                    >
                        <form
                            method="dialog"
                            style={{
                                width: "calc(50% - 0.25rem)",
                            }}
                        >
                            <button
                                class={"green round"}
                                style={{
                                    width: "100%",
                                }}
                            >
                                Cancel
                            </button>
                        </form>

                        <form
                            action="/api/disassociate"
                            method={"POST"}
                            target={"association_frame"}
                            style={{
                                width: "calc(50% - 0.25rem)",
                            }}
                        >
                            <button
                                class={"red round round modal:entry:button.Loading"}
                                style={{
                                    width: "100%",
                                }}
                            >
                                Confirm
                            </button>
                        </form>
                    </div>
                </Modal>
            )}
        </>
    );
}
