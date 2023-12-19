import { Modal, Expandable } from "fusion";

/**
 * @function LoadingModal
 *
 * @export
 * @return {*}
 */
export default function LoadingModal(): any {
    return (
        <Modal
            modalid="bundles:modal.Loading"
            buttonid="bundles:button.Loading"
            noIdMatch={true}
            round={true}
        >
            <div
                class={"flex flex-wrap flex-column g-10"}
                style={{
                    width: "24rem",
                    maxWidth: "100%",
                }}
            >
                <div
                    className="flex flex-column g-10 align-center full"
                    style={{
                        width: "8rem",
                    }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="36"
                        height="36"
                        aria-label={"Sparkle Symbol"}
                        style={{
                            animation: "Blink 2s 0s infinite forwards running",
                        }}
                    >
                        <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z"></path>
                    </svg>

                    <h5 className="no-margin">Loading!</h5>
                </div>

                <div
                    class={"full flex flex-column g-4"}
                    style={{
                        width: "calc(100% - 8rem - var(--u-10))", // 100% - width of other container - gap
                    }}
                >
                    <Expandable title="What?">
                        <span>
                            Your action is being processed! Everything takes time.
                            Some actions may require multiple database reads/writes
                            to complete. These generally happen very quickly, but
                            they could stall at times.
                        </span>
                    </Expandable>

                    <Expandable title="This is taking forever!">
                        <span>
                            Please attempt to be patient. It is recommended that you
                            wait at least 1 minute before retrying your action.
                        </span>

                        <span>
                            It is also recommended that you attempt to check if your
                            action completed successfully. Many database operations
                            finish quickly, and your wait is just the page load!
                        </span>

                        <Expandable title="I understand, let me out!">
                            <form method={"dialog"}>
                                <button className="full round red">Close</button>
                            </form>
                        </Expandable>
                    </Expandable>

                    <Expandable title="Bug?">
                        <span>
                            If you think this could be caused by a bug, you can{" "}
                            <a href="https://codeberg.org/sentrytwo/bundles">
                                attempt to contribute a fix
                            </a>
                            !
                        </span>
                    </Expandable>
                </div>
            </div>
        </Modal>
    );
}
