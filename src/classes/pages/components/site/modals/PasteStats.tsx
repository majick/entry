import { Modal, Expandable, Card, Button } from "fusion";

import type { Paste } from "../../../../db/objects/Paste";
import BundlesDB from "../../../../db/BundlesDB";
import Footer from "../Footer";

/**
 * @function PasteStatsModal
 *
 * @export
 * @param {{
 *     paste: Paste;
 *     includeFooter?: boolean;
 *     noIdMatch?: boolean;
 * }} props
 * @return {*}
 */
export default function PasteStatsModal(props: {
    paste: Paste;
    includeFooter?: boolean;
    noIdMatch?: boolean;
    revisionNumber?: number;
}): any {
    return (
        <Modal
            modalid="bundles:modal.PasteStats"
            buttonid="bundles:button.PasteStats"
            noIdMatch={props.noIdMatch}
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
                    className="flex justify-space-between align-center full"
                    style={{
                        width: "8rem",
                    }}
                >
                    <div
                        className="flex full g-10"
                        style={{
                            color: "var(--text-color-faded)",
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="24"
                            height="24"
                            aria-label={"Info Symbol"}
                        >
                            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
                        </svg>

                        <b>Paste Info</b>
                    </div>

                    <b className="full no-margin text-right">
                        {props.paste.CustomURL}
                    </b>
                </div>

                <div
                    class={"full flex flex-column g-4"}
                    style={{
                        width: "calc(100% - 8rem - var(--u-10))", // 100% - width of other container - gap
                    }}
                >
                    {/* actions */}
                    <Card
                        round={true}
                        border={true}
                        class="flex justify-center align-center flex-wrap g-4"
                    >
                        <Button
                            round={true}
                            class="green-cta"
                            href={
                                props.paste.Metadata &&
                                props.paste.Metadata.PasteType === "normal"
                                    ? `/?mode=edit&OldURL=${props.paste.CustomURL}${
                                          props.revisionNumber !== 0 &&
                                          props.revisionNumber !== undefined
                                              ? `&r=${props.revisionNumber}`
                                              : ""
                                      }`
                                    : `/paste/builder?edit=${props.paste.CustomURL}${
                                          props.revisionNumber !== 0 &&
                                          props.revisionNumber !== undefined
                                              ? `&r=${props.revisionNumber}`
                                              : ""
                                      }`
                            }
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                aria-label={"Pencil Symbol"}
                            >
                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                            </svg>
                            Edit
                        </Button>

                        <Button round={true} href={`/r/${props.paste.CustomURL}`}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                style={{
                                    marginTop: "2px",
                                }}
                                aria-label={"Repo Symbol"}
                            >
                                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                            </svg>
                            Overview
                        </Button>

                        {props.paste.Metadata &&
                            props.paste.Metadata.Owner !== props.paste.CustomURL &&
                            props.paste.Metadata &&
                            props.paste.Metadata.ShowOwnerEnabled !== false && (
                                <Button
                                    round={true}
                                    href={`/~${props.paste.Metadata.Owner}`}
                                    class="tooltip-wrapper"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        width="16"
                                        height="16"
                                        aria-label={"Person Symbol"}
                                    >
                                        <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                                    </svg>
                                    Owner
                                    <div className="card secondary round border tooltip left">
                                        {props.paste.Metadata.Owner}
                                    </div>
                                </Button>
                            )}
                    </Card>

                    <hr />

                    {/* stats */}
                    <Expandable title="Publish/Edit" open={true}>
                        <span>
                            <span
                                class={"flex align-center g-4"}
                                title={new Date(props.paste.PubDate).toUTCString()}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                    aria-label={"Calendar Symbol"}
                                >
                                    <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z"></path>
                                </svg>

                                <span>
                                    Pub:{" "}
                                    <span className="utc-date-to-localize">
                                        {new Date(props.paste.PubDate).toUTCString()}
                                    </span>
                                </span>
                            </span>

                            <span
                                class={"flex align-center g-4"}
                                title={new Date(props.paste.EditDate).toUTCString()}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    width="16"
                                    height="16"
                                    aria-label={"Calendar Symbol"}
                                >
                                    <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z"></path>
                                </svg>

                                <span>
                                    Edit:{" "}
                                    <span className="utc-date-to-localize">
                                        {new Date(
                                            props.paste.EditDate
                                        ).toUTCString()}
                                    </span>
                                </span>
                            </span>
                        </span>
                    </Expandable>

                    <Expandable title="Social" open={true}>
                        <span>
                            {BundlesDB.config.log.events.includes("view_paste") &&
                                props.paste.Metadata &&
                                props.paste.Metadata.ShowViewCount !== false && (
                                    <span
                                        class={"flex align-center g-4"}
                                        title={new Date(
                                            props.paste.PubDate
                                        ).toUTCString()}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Telescope Symbol"}
                                        >
                                            <path d="M14.184 1.143v-.001l1.422 2.464a1.75 1.75 0 0 1-.757 2.451L3.104 11.713a1.75 1.75 0 0 1-2.275-.702l-.447-.775a1.75 1.75 0 0 1 .53-2.32L11.682.573a1.748 1.748 0 0 1 2.502.57Zm-4.709 9.32h-.001l2.644 3.863a.75.75 0 1 1-1.238.848l-1.881-2.75v2.826a.75.75 0 0 1-1.5 0v-2.826l-1.881 2.75a.75.75 0 1 1-1.238-.848l2.049-2.992a.746.746 0 0 1 .293-.253l1.809-.87a.749.749 0 0 1 .944.252ZM9.436 3.92h-.001l-4.97 3.39.942 1.63 5.42-2.61Zm3.091-2.108h.001l-1.85 1.26 1.505 2.605 2.016-.97a.247.247 0 0 0 .13-.151.247.247 0 0 0-.022-.199l-1.422-2.464a.253.253 0 0 0-.161-.119.254.254 0 0 0-.197.038ZM1.756 9.157a.25.25 0 0 0-.075.33l.447.775a.25.25 0 0 0 .325.1l1.598-.769-.83-1.436-1.465 1Z"></path>
                                        </svg>

                                        <span>Views: {props.paste.Views}</span>
                                    </span>
                                )}

                            {BundlesDB.config.app &&
                                BundlesDB.config.app.enable_comments === true &&
                                props.paste.Metadata &&
                                props.paste.Metadata.Comments &&
                                props.paste.Metadata.Comments.Enabled !== false && (
                                    <span
                                        class={"flex align-center g-4"}
                                        title={new Date(
                                            props.paste.EditDate
                                        ).toUTCString()}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"Comments Symbol"}
                                        >
                                            <path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.458 1.458 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25Z"></path>
                                        </svg>

                                        <span>
                                            Comments:{" "}
                                            <a href={`/c/${props.paste.CustomURL}`}>
                                                {props.paste.Comments}
                                            </a>
                                        </span>
                                    </span>
                                )}

                            {props.paste.Metadata &&
                                props.paste.Metadata.Badges &&
                                props.paste.Metadata.Badges.split(",").length >
                                    0 && (
                                    <span class={"flex align-center g-4"}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16 16"
                                            width="16"
                                            height="16"
                                            aria-label={"ID Badge Symbol"}
                                        >
                                            <path d="M3 7.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-3Zm10 .25a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 1 .75.75ZM10.25 11a.75.75 0 0 0 0-1.5h-2.5a.75.75 0 0 0 0 1.5h2.5Z"></path>
                                            <path d="M7.25 0h1.5c.966 0 1.75.784 1.75 1.75V3h3.75c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25v-8.5C0 3.784.784 3 1.75 3H5.5V1.75C5.5.784 6.284 0 7.25 0Zm3.232 4.5A1.75 1.75 0 0 1 8.75 6h-1.5a1.75 1.75 0 0 1-1.732-1.5H1.75a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25ZM7 1.75v2.5c0 .138.112.25.25.25h1.5A.25.25 0 0 0 9 4.25v-2.5a.25.25 0 0 0-.25-.25h-1.5a.25.25 0 0 0-.25.25Z"></path>
                                        </svg>
                                        Badges:{" "}
                                        <div class={"flex flex-wrap g-4"}>
                                            {props.paste.Metadata.Badges.split(
                                                ","
                                            ).map((badge) => (
                                                <span class={"chip badge"}>
                                                    {badge}
                                                </span>
                                            ))}
                                        </div>
                                    </span>
                                )}
                        </span>
                    </Expandable>

                    {/* extras */}

                    <hr />

                    <form method={"dialog"}>
                        <button className="full round red">Close</button>
                    </form>

                    {props.includeFooter === true && <Footer />}
                </div>
            </div>
        </Modal>
    );
}
