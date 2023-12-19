import BundlesDB from "../../../db/BundlesDB";
import type { Paste } from "../../../db/objects/Paste";

export default function DecryptionForm(props: {
    paste: Paste;
    urlName?: string;
    isEdit?: boolean;
}) {
    return (
        <>
            {
                // we don't need to send a POST request to /api/decrypt here,
                // because the decryption is handled above! all we want this
                // form to do is the default thing (where it puts inputs in the url)
            }
            <form
                class={"flex justify-space-between align-center flex-wrap g-4"}
                style={{
                    marginBottom: "0.5rem",
                }}
                action={
                    props.isEdit !== true
                        ? `/paste/dec/${props.paste.CustomURL}`
                        : ""
                }
                method={props.isEdit !== true ? "POST" : ""}
            >
                <button class={"round"}>Decrypt</button>

                {props.isEdit && (
                    <input type={"hidden"} name={"mode"} value={"edit"} required />
                )}

                <input
                    type="hidden"
                    required
                    name={props.urlName || "CustomURL"}
                    value={props.paste.CustomURL}
                />

                <input
                    type="text"
                    name={"ViewPassword"}
                    placeholder={"View password"}
                    minLength={BundlesDB.MinPasswordLength}
                    maxLength={BundlesDB.MaxPasswordLength}
                    class={"round"}
                    required
                />
            </form>
        </>
    );
}
