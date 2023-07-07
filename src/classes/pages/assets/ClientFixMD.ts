// yeah, so this didn't want to work on client because when we try to use it on the client,
// FixMarkdown will not be defined because the script will have already been minified
// this is the code run to fix the markdown when viewing a paste

import { FixMarkdown } from "../components/Markdown";

export default function ClientFixMD() {
    FixMarkdown(document.getElementById("editor-tab-preview")!);
}
