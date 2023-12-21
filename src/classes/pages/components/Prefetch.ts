/**
 * @file Handle link prefetch
 * @name Prefetch.ts
 * @license MIT
 */

export type PrefetchOptions = {
    MaximumLinks?: number;
    Element?: HTMLElement | ShadowRoot;
};

/**
 * @export
 * @class Prefetch
 */
export default class Prefetch {
    public readonly Options: PrefetchOptions;
    private Read: { [key: string]: string } = {};
    public PreviousURL: URL = new URL(window.location.href);

    constructor(Options: PrefetchOptions) {
        // ...options
        if (!Options.Element) Options.Element = document.documentElement;
        this.Options = Options;

        // begin
        this.Index(Options.Element);

        // ...make normal history changes function
        window.addEventListener("popstate", async (event) => {
            // make sure we actually changed pages (not just hash)
            if (new URL(window.location.href).pathname === this.PreviousURL.pathname)
                return;

            // make sure stored state exists
            if (!this.Read[window.location.href]) {
                const res = await fetch(window.location.href);

                // store
                this.Read[window.location.href] = await res.text();
            }

            // load page
            this.PreviousURL = new URL(window.location.href);
            await this.LoadPage(
                new URL(window.location.href),
                event,
                document.documentElement
            );
        });

        window.addEventListener("hashchange", (event) => {
            // get element
            const element = document.body.querySelector(
                window.location.hash.replaceAll(/[\\\/\!\@\$\%\^\&\*\(\)]/g, "")
            );

            // scroll to element
            if (element) element.scrollTo();
        });
    }

    /**
     * @method SwapState
     * @description Change the browser's history state
     * @private
     *
     * @param {void} url
     * @return {void}
     */
    private SwapState(url: string): void {
        if (!window.history.state || window.history.state.url !== url) {
            window.history.pushState({ url }, "", url);
        }
    }

    /**
     * @method ExecuteScript
     * @private
     *
     * @return {Promise<void>}
     * @param {HTMLScriptElement} script
     */
    private async ExecuteScript(script: HTMLScriptElement): Promise<void> {
        const NewScript = document.createElement("script");

        // replace imports
        const Imports = script.innerHTML.matchAll(/(from)\s\"(.*?)\";/g);

        for (const Import of Imports) {
            // fetch script
            let content = await (await fetch(Import[2] as string)).text();

            // ...replace MORE imports
            content = content.replaceAll(
                'from"./',
                `from"${window.location.origin}/./`
            );

            content = content.replaceAll(
                'import"./',
                `import"${window.location.origin}/./`
            );

            // create blob
            const url = URL.createObjectURL(
                new Blob([content], {
                    type: "application/javascript",
                })
            );

            // replace
            script.innerHTML = script.innerHTML.replace(Import[0], `from "${url}";`);
        }

        // create url
        NewScript.appendChild(document.createTextNode(script.innerHTML));

        NewScript.src = script.src;
        if (NewScript.getAttribute("src") === "") NewScript.removeAttribute("src");

        NewScript.type = script.type;
        NewScript.setAttribute(
            "data-state",
            script.getAttribute("data-state") || ""
        );

        // replace script
        script.parentElement!.replaceChild(NewScript, script);
    }

    /**
     * @method CanRemoveElement
     *
     * @private
     * @param {Array<Node>} nodeList
     * @param {HTMLElement} element
     * @return {boolean}
     * @memberof Prefetch
     */
    private CanRemoveElement(nodeList: Array<Node>, element: HTMLElement): boolean {
        if (nodeList.find((node: any) => node.isEqualNode(element as HTMLElement)))
            return false; // don't remove this element because it already exists!

        return true;
    }

    /**
     * @method LoadPage
     *
     * @private
     * @param {URL} href
     * @param {Event} event
     * @param {PrefetchOptions["Element"]} element
     * @return {Promise<void>}
     * @memberof Prefetch
     */
    private async LoadPage(
        href: URL,
        event: Event,
        element: PrefetchOptions["Element"]
    ): Promise<void> {
        if (!element) return;

        // check PreviousURL
        if (href.pathname === this.PreviousURL.pathname) return;
        this.PreviousURL = href;

        // try to get link from read cache
        const StoredState = this.Read[href.href];

        // if stored version exists, prevent default and load that state!
        if (!StoredState) return;
        event.preventDefault();

        // parse state
        const parsed = new DOMParser().parseFromString(StoredState, "text/html");

        // append to the END of the document
        document.body.innerHTML = parsed.body.innerHTML;

        // remove all elements besides <link> and <style> elements
        const newNodes = Array.from(parsed.head.children);

        for (let element of document.head.querySelectorAll(
            "*"
        ) as any as HTMLElement[])
            if (
                this.CanRemoveElement(newNodes, element) &&
                element.nodeName !== "LINK" &&
                element.nodeName !== "STYLE"
            )
                element.remove();

        for (let element of parsed.head.querySelectorAll(
            "*"
        ) as any as HTMLElement[])
            if (
                this.CanRemoveElement(
                    Array.from(document.head.querySelectorAll("*")),
                    element
                )
            )
                document.head.appendChild(element);

        // run scripts
        for (let script of element.querySelectorAll(
            // don't rerun scripts that want their state to save
            'script:not([data-state="save"])'
        ) as any as HTMLScriptElement[])
            await this.ExecuteScript(script);

        // change history state
        this.SwapState(href.href);

        // prefetch new content
        setTimeout(() => {
            this.Index(document.documentElement);
        }, 500);
    }

    /**
     * @method Index
     *
     * @param {PrefetchOptions["Element"]} element
     * @return {void}
     * @memberof Prefetch
     */
    public Index(element: PrefetchOptions["Element"]): void {
        if (!element) return;

        // get all anchor elements
        for (const anchor of element.querySelectorAll(
            "a"
        ) as any as HTMLAnchorElement[]) {
            // make sure anchor href hostname matches the current hostname,
            // we don't want to try and fetch cross-site!
            const href = new URL(anchor.href);
            if (href.hostname !== window.location.hostname) continue;

            // make sure anchor isn't set to target="_blank"
            if (anchor.target === "_blank") continue;

            // make sure href isn't just a hash value
            if (href.hash && anchor.href.startsWith("#")) continue;

            // register listeners
            anchor.addEventListener("mouseenter", async () => {
                if (this.Read[href.href]) return; // make sure we haven't already read this link

                // read link
                try {
                    const res = await fetch(href.href);

                    // make sure page is HTML
                    if (!res.headers.get("Content-Type")!.includes("text/html"))
                        return;

                    // store
                    this.Read[href.href] = await res.text();
                    console.info("Link prefetched!");
                } catch {
                    console.error("Failed to prefetch link!");
                    return;
                }
            });

            anchor.addEventListener("click", async (event) => {
                await this.LoadPage(href, event, element);
            });
        }
    }
}

// handle form submit
export function RegisterEditorFormListeners(): void {
    for (const form of Array.from(
        document.querySelectorAll("form[action]")!
    ) as HTMLFormElement[]) {
        const _action = new URL(form.action).pathname;
        if (!_action.startsWith("/api/")) continue;

        // create event
        form.addEventListener("submit", async (event: Event<HTMLFormElement>) => {
            event.preventDefault();

            // create formdata
            const data = new FormData(event.target as HTMLFormElement);

            if (data.get("Content") !== null || data.get("OldContent") !== null) {
                // ...set content (not automatically part of the form!)
                data.set(
                    "Content",
                    encodeURIComponent((window as any).EditorContent || "")
                );

                if (data.get("OldContent") !== null)
                    data.set(
                        "OldContent",
                        encodeURIComponent((window as any).EditorContent || "")
                    );
            }

            // create application/x-www-form-urlencoded from formdata
            let body = "";

            if (form.enctype === "application/x-www-form-urlencoded")
                for (const point of data.entries())
                    body += `&${point[0]}=${encodeURIComponent(
                        (point[1] as string).trimStart()
                    )}`;

            // send request
            const res = await fetch(
                (event as any).submitter.getAttribute("formaction") ||
                    (event.target as HTMLFormElement).action,
                {
                    method: "POST",
                    headers: form.enctype.startsWith("application")
                        ? { "Content-Type": form.enctype }
                        : {},
                    body: body !== "" ? body.slice(1) : data,
                }
            );

            const json = await res.json();

            // @ts-ignore close loading modal (it's like it never happened)
            (globalThis as any).modals["bundles:modal.Loading"](false);

            // navigate
            window.location.href = json.redirect;
        });
    }
}
