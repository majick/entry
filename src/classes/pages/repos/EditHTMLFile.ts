/**
 * @file Handle HTML file editing in the media editor
 * @name EditHTMLFile.ts
 * @license MIT
 */

import HTMLEditor from "../components/builder/components/HTMLEditor";

// default export

/**
 * @function CreateEditor
 *
 * @export
 * @param {HTMLElement} element
 * @param {string} content
 * @return {void}
 */
export default function CreateEditor(
    element: HTMLElement,
    content: string,
    // session information
    edit_password: string,
    // file information
    owner: string,
    file_name: string
): void {
    const Editor = HTMLEditor.CreateEditor(
        element,
        "html",
        (_content) => (content = _content)
    )!;

    // set content
    Editor.dispatch(
        Editor.state.update({
            changes: {
                from: 0,
                to: Editor.state.doc.length,
                insert: decodeURIComponent(content),
            },
        })
    );

    // get preview button
    const PreviewButton = document.querySelector(".bundles\\:button\\.HTMLPreview");
    if (!PreviewButton) return;

    let BlobURLs: string[] = [];
    let Windows: Window[] = [];

    // handle preview
    PreviewButton.addEventListener("click", () => {
        // revoke all previous urls
        for (const url of BlobURLs) URL.revokeObjectURL(url);
        for (const _window of Windows) _window.close();

        /* // parse content
        const parsed = new DOMParser().parseFromString(content, "text/html");

        // get elements with an href
        for (const anchor of Array.from(
            parsed.querySelectorAll("a[href]")
        ) as HTMLAnchorElement[]) {
            // create blob
            const blob = new Blob([content], { type: "text/html" });

            // get url and open it
            const url = URL.createObjectURL(blob);
            BlobURLs.push(url);
        } */

        // create blob
        const blob = new Blob([content], { type: "text/html" });

        // get url and open it
        const url = URL.createObjectURL(blob);
        BlobURLs.push(url);

        Windows.push(window.open(url, "_blank") as Window);
    });

    // get format button
    const FormatButton = document.querySelector(".bundles\\:button\\.FormatCode");
    if (!FormatButton) return;

    // handle format
    FormatButton.addEventListener("click", () =>
        (window as any).HTMLEditor.Format()
    );

    // get save button
    const SaveButton = document.querySelector(".bundles\\:button\\.SaveFile");
    if (!SaveButton) return;

    // handle save
    SaveButton.addEventListener("click", async () => {
        // build body
        let body = "";

        // ...request information
        body += `EditPassword=${edit_password}`;

        // ...file information
        body += `&CustomURL=${owner}`;
        body += `&File=${file_name}`;

        // ...content
        body += `&FileContent=${encodeURIComponent(content)}`;

        // send request
        const res = await fetch("/api/media/edit", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
        });

        const json = await res.json();

        // handle response
        if (json.success === true) alert("File updated!");
        else alert(`Error: ${json.result[1]}`);
    });
}
