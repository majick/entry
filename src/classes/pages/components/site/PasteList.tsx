import EntryDB, { Paste } from "../../../db/EntryDB";
import { CreateHash } from "../../../db/helpers/Hash";

import Modal from "./modals/Modal";

export default function PasteList(props: {
    Pastes: Paste[];
    Query?: string;
    Limit?: number;
    ShowDelete?: boolean;
    AdminPassword?: string;
}) {
    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                }}
            >
                {(props.Query !== undefined && (
                    <>
                        <form
                            action="/admin/manage-pastes"
                            method={"POST"}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                            }}
                        >
                            <input
                                type="hidden"
                                required
                                name="AdminPassword"
                                value={props.AdminPassword}
                            />

                            <input
                                name={"query"}
                                placeholder={"Query"}
                                value={props.Query}
                                class={"secondary"}
                                style={{
                                    width: "20rem",
                                }}
                            />

                            <input
                                type="number"
                                value={props.Limit}
                                placeholder={"Limit"}
                                minLength={1}
                                maxLength={10000}
                                name={"limit"}
                                id={"limit"}
                                class={"secondary"}
                                required
                                style={{
                                    width: "10rem",
                                }}
                            />

                            <button class={"secondary"}>Query</button>
                        </form>
                    </>
                )) || <span></span>}

                <div
                    style={{
                        display: "flex",
                        gap: "1rem",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    {props.ShowDelete && props.AdminPassword && (
                        <>
                            <button
                                className="secondary"
                                id={"PLDeleteResultsButton"}
                            >
                                Delete Results
                            </button>

                            <Modal
                                buttonid="PLDeleteResultsButton"
                                modalid="PLDeleteResultsModal"
                            >
                                <h4 style={{ textAlign: "center", width: "100%" }}>
                                    Confirm Deletion
                                </h4>

                                <hr />

                                <p>
                                    This will delete{" "}
                                    <b>all pastes shown on the page</b>! Please be
                                    sure you want to do this.
                                </p>

                                <hr />

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "1rem",
                                    }}
                                >
                                    <form method="dialog" class={"mobile-max"}>
                                        <button class={"green mobile-max"}>
                                            Cancel
                                        </button>

                                        <div style={{ margin: "0.25rem 0" }}>
                                            <hr class={"mobile-only"} />
                                        </div>
                                    </form>

                                    <form
                                        method="POST"
                                        action={"/admin/api/mass-delete"}
                                        class={"mobile-max"}
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            justifyContent: "right",
                                            maxWidth: "100%",
                                            gap: "0.5rem",
                                        }}
                                    >
                                        <input
                                            type="hidden"
                                            required
                                            name="AdminPassword"
                                            value={props.AdminPassword}
                                        />

                                        <input
                                            type="hidden"
                                            required
                                            name={"pastes"}
                                            value={JSON.stringify(
                                                props.Pastes.map((p) => p.CustomURL)
                                            )}
                                        />

                                        <button class={"red mobile-max"}>
                                            Delete
                                        </button>
                                    </form>
                                </div>
                            </Modal>
                        </>
                    )}

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            width="16"
                            height="16"
                            aria-label={"Magnifying Glass Symbol"}
                        >
                            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
                        </svg>

                        <span>
                            <b>{props.Pastes.length}</b> result
                            {props.Pastes.length > 1 || props.Pastes.length === 0
                                ? "s"
                                : ""}
                        </span>
                    </div>
                </div>
            </div>

            <div
                style={{
                    maxWidth: "100vw",
                    overflow: "auto",
                }}
            >
                <table
                    class={"force-full"}
                    style={{
                        width: "100%",
                    }}
                >
                    <thead>
                        <tr>
                            <th>Custom URL</th>
                            <th>Publish Date</th>
                            <th>Edit Date</th>

                            {!EntryDB.config.app ||
                                (EntryDB.config.app.enable_private_pastes !==
                                    false && <th>Private</th>)}

                            <th>Editable</th>
                            <th>Open</th>
                            {props.ShowDelete && <th>Delete</th>}
                        </tr>
                    </thead>

                    <tbody>
                        {props.Pastes.map((paste) => {
                            return (
                                <tr>
                                    <td
                                        title={paste.CustomURL}
                                        style={{
                                            maxWidth: "5rem",
                                        }}
                                    >
                                        {paste.CustomURL.split(":")[0].replace(
                                            `${paste.GroupName}/`,
                                            ""
                                        )}
                                    </td>

                                    <td
                                        class="utc-date-to-localize"
                                        title={new Date(
                                            paste.PubDate || 0
                                        ).toUTCString()}
                                    >
                                        {new Date(paste.PubDate || 0).toUTCString()}
                                    </td>

                                    <td
                                        class="utc-date-to-localize"
                                        title={new Date(
                                            paste.EditDate || 0
                                        ).toUTCString()}
                                    >
                                        {new Date(paste.EditDate || 0).toUTCString()}
                                    </td>

                                    {!EntryDB.config.app ||
                                        (EntryDB.config.app.enable_private_pastes !==
                                            false && (
                                            <td>
                                                {paste.ViewPassword !== ""
                                                    ? "yes"
                                                    : "no"}
                                            </td>
                                        ))}

                                    <td>
                                        {paste.EditPassword !== CreateHash("") &&
                                        paste.GroupName !== "server" // server pastes cannot be edited
                                            ? "yes"
                                            : "no"}
                                    </td>

                                    <td>
                                        <a
                                            href={`/${paste.CustomURL}`}
                                            target="_blank"
                                        >
                                            View Paste
                                        </a>
                                    </td>

                                    {props.ShowDelete && (
                                        <td>
                                            <form
                                                action="/admin/api/delete"
                                                method={"POST"}
                                            >
                                                <input
                                                    type="hidden"
                                                    required
                                                    name="AdminPassword"
                                                    value={props.AdminPassword}
                                                />

                                                <input
                                                    type="hidden"
                                                    required
                                                    name={"CustomURL"}
                                                    value={paste.CustomURL}
                                                />

                                                <button
                                                    class={"secondary"}
                                                    title={"Delete Paste"}
                                                    style={{
                                                        margin: "auto",
                                                    }}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 16 16"
                                                        width="16"
                                                        height="16"
                                                        aria-label={"Trash Symbol"}
                                                    >
                                                        <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                                                    </svg>
                                                </button>
                                            </form>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
