import DateOptions from "../../form/DateOptions";
import { Modal, Expandable } from "fusion";

/**
 * @function ExtraPasteOptions
 *
 * @export
 * @return {*}
 */
export default function ExtraPasteOptions(props: {
    EnablePrivate?: boolean;
    EnableGroups?: boolean;
    EnableExpiry?: boolean;
}): any {
    return (
        <Modal
            buttonid="bundles:button.PasteExtras"
            modalid="bundles:modal.PasteExtras"
            round={true}
        >
            <div
                class={"flex flex-column align-center g-8"}
                style={{
                    width: "25rem",
                    maxWidth: "100%",
                }}
            >
                <h4 class={"no-margin"}>Extra Options</h4>

                {props.EnablePrivate !== false && (
                    <Expandable title="Private Pastes">
                        <div className="card round secondary border flex flex-column g-4">
                            <p>
                                Providing a view code makes your paste private. The
                                view code is used to decrypt your paste for viewing.
                            </p>

                            <input
                                class={"round full"}
                                type="text"
                                placeholder={"View code - optional"}
                                minLength={5} // BundlesDB.MinPasswordLength
                                maxLength={256} // BundlesDB.MaxPasswordLength
                                name={"ViewPassword"}
                                autoComplete={"off"}
                            />
                        </div>
                    </Expandable>
                )}

                {props.EnableGroups !== false && (
                    <Expandable title="Group Pastes">
                        <div className="card round secondary border flex flex-column g-4">
                            <p>
                                Groups cannot be made private. The group post code is
                                only required when submitting to an existing group or
                                creating a new group.
                            </p>

                            <input
                                class={"round full"}
                                type="text"
                                placeholder={"Group name - optional"}
                                minLength={2} // BundlesDB.MinCustomURLLength
                                maxLength={500} // BundlesDB.MaxCustomURLLength
                                id={"GroupName"}
                                name={"GroupName"}
                            />

                            <input
                                class={"round full"}
                                type="text"
                                placeholder={"Group post code - optional"}
                                minLength={5} // BundlesDB.MinPasswordLength
                                maxLength={256} // BundlesDB.MaxPasswordLength
                                name={"GroupSubmitPassword"}
                                autoComplete={"off"}
                            />
                        </div>
                    </Expandable>
                )}

                {props.EnableExpiry !== false && (
                    <Expandable title="Paste Expiry">
                        <div className="card round secondary border flex flex-column g-4">
                            <label htmlFor="ExpireOn">Delete Paste On</label>

                            <input
                                class={"round full"}
                                type={"datetime-local"}
                                name={"ExpireOn"}
                                id={"ExpireOn"}
                            />

                            <DateOptions />
                        </div>
                    </Expandable>
                )}
            </div>

            <hr />

            <div className="flex justify-center">
                <a
                    className="button full green round"
                    href={"javascript:modals['bundles:modal.PasteExtras']();"}
                >
                    Close
                </a>
            </div>
        </Modal>
    );
}
