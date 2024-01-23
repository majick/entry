/**
 * @file Handle Markdown
 * @name Markdown.ts
 * @license MIT
 */

import { marked } from "marked";

// types
export type Heading = {
    Text: string;
    Type: number;
    ID: string;
};

export type TableOfContents = Heading[];

/**
 * @function ParseMarkdownSync
 *
 * @param {string} content
 * @param [onserver=true]
 * @return {string}
 */
export function ParseMarkdownSync(
    content: string,
    onserver: boolean = true
): string {
    let CurrentPaste = "";

    // table of contents base
    const TOC: TableOfContents = [];

    // escape < and >
    content = content.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    // allowed elements
    for (let element of [
        // custom elements
        "hue",
        "sat",
        "lit",
        "theme",
        "comment",
        // html elements
        "p",
        "span",
        "style",
    ])
        content = content
            .replaceAll(`&lt;${element}&gt;`, `<${element}>`)
            .replaceAll(`&lt;/${element}&gt;`, `</${element}>`)
            .replaceAll("-&gt;&gt;", "->>")
            .replaceAll("&lt;&lt;-", "<<-")
            .replaceAll("-&gt;", "->")
            .replaceAll("&lt;-", "<-");

    // allow html escapes (prefixed by &E)
    content = content.replaceAll(/(&!)(.*?);/g, "&$2;");

    // code blocks

    // ...fenced code block
    let FencedCodeBlocks = 0; // needed to create unique line number IDs
    content = content.replaceAll(
        /^(\`{3})(.*?)\n(.*?)(\`{3})$/gms, // $2: language, $3: code
        (match: string, offset: string, string: string) => {
            const lang = string;
            let code = match.slice(`\`\`\`${lang}\n`.length).split("```")[0];

            FencedCodeBlocks++;

            // run replacements
            code = code.replaceAll("*", "&!temp-ast;");
            code = code.replaceAll("`", "&!temp-back;");
            code = code.replaceAll("\n", "&nbsp;1;\n");
            code = code.replaceAll("#", "&#35;");
            code = code.replaceAll("(", "&lpar;");

            // build line numbers
            let LineNumbers = "";
            let _current = 0;

            for (const _line of code.split("\n")) {
                if (!_line) continue;

                _current++;
                LineNumbers += `<a 
                    class="line-number" 
                    href="#B${FencedCodeBlocks}L${_current}"
                    id="B${FencedCodeBlocks}L${_current}"
                >${_current}</a>\n`;
            }

            // return
            return `<pre class="flex" style="position: relative;${
                // only add padding if there is only 1 line
                _current === 1 ? ' padding: 12px 0;"' : ""
            }">
                <div class="line-numbers code">${LineNumbers}</div>
                <code class="language-${lang}" id="B${FencedCodeBlocks}C" style="display: block;">${code}</code>
                <button 
                    onclick="window.navigator.clipboard.writeText(document.getElementById('B${FencedCodeBlocks}C').innerText);"
                    class="secondary copy-button"
                    title="Copy Code"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                    >
                        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                        <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                    </svg>
                </button>
            </pre>\n`;
        }
    );

    // ...inline code block
    content = content.replaceAll(/(\`{3})(.*?)(\`{3})/gm, "<code>$2</code>"); // ```code```

    // ...inline code block
    content = content.replaceAll(/(\`{2})(.*?)(\`{2})/g, "<code>$2</code>"); // ``code``
    content = content.replaceAll(/(\`{1})(.*?)(\`{1})/g, "<code>$2</code>"); // `code`

    // fix headers (they aren't picked up if the formatting is really bad)
    // inserting a \n after each heading to make marked automatically make following text
    // its own paragraph element, fixes a lot of formatting issues
    // ...all headings need to be matched in one regex so that the toc goes by order of match!
    content = content.replaceAll(
        /^(\#+)\s(.*)$/gm,
        (match: string, offset: string, string: string): string => {
            const HeadingType = offset.length; // offset = hashtags before heading

            // get suffix
            // (get all headings with the same text, suffix is the number of those)
            // (helps prevent duplicate ids)
            let suffix = TOC.filter((h) => h.Text === string).length.toString();

            if (suffix !== "0") suffix = `-${suffix}`;
            else suffix = "";

            // add to toc
            const heading: Heading = {
                Text: string.replaceAll("\n", ""),
                Type: HeadingType,
                ID: `${string
                    .toLowerCase()
                    .replaceAll(" ", "-")
                    .replaceAll(/[^A-Za-z0-9-]/g, "")}${suffix}`,
            };

            if (HeadingType <= 6) TOC.push(heading);

            // return
            return `<h${heading.Type} id="${heading.ID}">
                ${string}
                <a class="htag" href="#${heading.ID}" title="Permanent Link">#</a>
            </h${heading.Type}>\n`;
        }
    );

    // table of contents
    const TOC_Regex = /^\[(TOC)\]$/gm;

    // ...only spend time creating toc if [TOC] exists
    if (content.match(TOC_Regex)) {
        let TOC_Content = "";

        // if there is no heading 1, add root heading (so formatting doesn't break)
        if (!TOC.find((v) => v.Type === 1)) TOC_Content = `1. [(root)](#)\n`;

        // load headings
        for (const heading of TOC)
            TOC_Content += `${"    ".repeat(heading.Type - 1)} 1. [${
                heading.Text
            }](#${heading.ID})\n`;

        // add table to content
        content = content.replaceAll(TOC_Regex, TOC_Content);
    }

    // remove frontmatter
    content = content.replaceAll(/^(\-{3})F\n(?<CONTENT>.*?)\n(\-{3})F$/gms, "");

    // horizontal rule
    content = content.replaceAll(/^\*{3}\s*$/gm, "\n<hr />\n");
    content = content.replaceAll(/^-{3}$/gm, "\n<hr />\n");
    content = content.replaceAll(/^_{3}$/gm, "\n<hr />\n");

    // special custom element syntax!
    content = content.replaceAll(
        /(\&lt\;\%)\s(?<CLASS>.*?)\s(?<ATTRIBUTES>.*?)(\s\%\&gt;)\s*/gm,
        (match: string, offset: string, string: string): string => {
            const _class = string;

            // get attributes
            const attributes = match
                .slice(`${offset} ${_class} `.length)
                .split(" %&gt;")[0]
                .split(" ");

            // build result
            // (error message by default)
            let result = `\n!!! error parsing error: invalid element class\n${match.replace(
                _class,
                `<b>&gt;&gt; ${_class} &lt;&lt;</b>`
            )}`;

            // tag block
            if (_class === "tag") {
                // this is used to tell us information about the content that we will need to know for rendering
                if (attributes[0] === "current_paste") CurrentPaste = attributes[1];
                result = "";
            }
            // theme block
            else if (_class === "theme") result = `<theme>${attributes[0]}</theme>`;
            // animation block
            else if (_class === "animation")
                result = `<span class="anim" style="animation: ${
                    // animation name
                    attributes[0]
                } ${
                    // duration
                    attributes[1] || "1s"
                } ${
                    // delay
                    attributes[2] || "0s"
                } ease-in-out ${
                    // "infinite" is like the only option here
                    // ...use "1" for 1 iteration
                    attributes[3] || "1"
                } forwards running; display: ${
                    // inline display
                    attributes[4] === "inline" ? "inline-block" : "block"
                }; ${
                    // set width to max-content if display is not inline
                    attributes[4] === "inline"
                        ? ""
                        : attributes[4] === "full"
                          ? "width: 100%;"
                          : "width: max-content; max-width: 100%;"
                }">`;
            // close block
            else if (_class === "close") result = "</span>&nbsp;";
            // hsl block
            else if (_class === "hsl")
                result = `<${attributes[0]}>${attributes[1]}</${attributes[0]}>`;
            // time block
            else if (_class === "time")
                result = `<span class="utc-date-to-localize" title="${attributes[0].replaceAll(
                    "_",
                    " "
                )}">${attributes[0].replaceAll("_", " ")}</span>`;
            // enable/disable block
            else if (_class === "enable" || _class === "disable" || _class === "tag")
                result = "";
            // class block
            else if (_class === "class")
                result = `<span class="${attributes.join(" ")}">`;
            // id block
            else if (_class === "id") result = `<span id="${attributes[0]}">`;
            // music block
            else if (_class === "music")
                result = `<audio src="${attributes[0]}" loop="${attributes[1]}" autoplay="${attributes[2]}" controls="${attributes[3]}"></audio>`;
            // html/chtml block
            else if (_class === "html") {
                const tag = attributes[0] || "span";
                attributes.shift();

                result = `<${tag} ${attributes.join(" ")}>`;
            } else if (_class === "chtml") result = `</${attributes[0] || "span"}>`;
            // include block
            else if (_class === "include" && attributes[0] !== CurrentPaste)
                // set temp result
                result = `<% tag temp_include ${attributes[0]} %>`;

            // return
            return result;
        }
    );

    // text color thing
    content = content.replaceAll(
        /\%(?<COLOR>.*?)\%(?!>)\s*(?<CONTENT>.*?)\s*(\%\%)/gm,
        '<span style="color: $<COLOR>;" role="custom-color">$<CONTENT></span>'
    );

    // spoiler
    content = content.replaceAll(
        /(\|\|)\s*(?<CONTENT>.*?)\s*(\|\|)/gm,
        '<span role="spoiler">$<CONTENT></span>'
    );

    // ...compatibility
    content = content.replaceAll(
        /(\!\&gt;)\s*(?<CONTENT>.*?)($|\s\s)/gm,
        '<span role="spoiler">$<CONTENT></span>'
    );

    // admonitions
    content = content.replaceAll(
        // title and content
        /^(\!{3})\s(?<TYPE>.*?)\s(?<TITLE>.+)\n(?<CONTENT>.+)$/gm,
        `<div class="mdnote note-$2">
            <b class="mdnote-title">$3</b>
            <p>$4</p>
        </div>`
    );

    content = content.replaceAll(
        // only title match
        /^(\!{3})\s(?<TYPE>.*?)\s(?<TITLE>.*?)$/gm,
        '<div class="mdnote note-$2"><b class="mdnote-title">$3</b></div>'
    );

    // update content to allow highlighting
    content = content.replaceAll(
        /(\={2})(.*?)(\={2})/g,
        '<span class="highlight">$2</span>'
    );

    // we have to do this ourselves because the next step would make it not work!
    content = content.replaceAll(
        /(\*{3})(.*?)(\*{3})/g,
        "<strong><em>$2</em></strong>"
    );

    // manual italics/bold because i've noticed it doesn't work (partially)
    content = content.replaceAll(/(\*{2})(.*?)(\*{2})/gs, "<strong>$2</strong>");
    content = content.replaceAll(/(\*{1})(.*?)(\*{1})/gs, "<em>$2</em>");
    content = content.replaceAll("&!temp-ast;", "*"); // look, I know this is stupid but... it works?
    //                   (we need this to stop italics matching when the asterisk is in a code block)
    //      (essentially just replaces it and then runs the italics match and then replaces it again)
    content = content.replaceAll("&!temp-back;", "`");
    content = content.replaceAll("&nbsp;1;\n", "&nbsp;\n");

    // strikethrough
    content = content.replaceAll(/(\~{2})(.*?)(\~{2})/gs, "<del>$2</del>");

    // underline
    content = content.replaceAll(
        /(\_{2})(.*?)(\_{2})/gs,
        '<span style="text-decoration: underline;" role="underline">$2</span>'
    );

    // paste mentions (autolink)
    content = content.replaceAll(
        /(\.\/)(?<NAME>.*?)(?<END>\s|\n)/gm,
        '<a href="/$<NAME>" class="chip badge mention" role="mention">./$<NAME></a>$<END>'
    );

    content = content.replaceAll(
        /(\[{2})(?<NAME>.*?)(\]{2})/gm,
        '<a href="/$<NAME>" class="chip badge mention" role="mention">./$<NAME></a>$<END>'
    );

    // named links
    // added because marked kept missing some when rendering as HTML

    // ...image
    // these are actually so fragile, and the ordering of all of these operations matters

    // ...image with sizing
    content = content.replaceAll(
        // this regex match is ended by either a space or a newline!
        // ...same as normal image but with SIZE_X and SIZE_Y matching
        /(!)\[(?<TEXT>.*?)\]\((?<URL>.*?)\)\:\{(?<SIZE_X>.*?)x(?<SIZE_Y>.*?)\}/g,
        '<img alt="$<TEXT>" title="$<TEXT>" src="$<URL>" style="width: $<SIZE_X>px; height: $<SIZE_Y>px" />'
    );

    // ...normal image
    content = content.replaceAll(
        /(!)\[(?<TEXT>.*?)\]\((?<URL>.*?)\)/g,
        '<img alt="$<TEXT>" title="$<TEXT>" src="$<URL>" />'
    );

    // ...broken images
    content = content.replaceAll('" />', ")"); // this happens a lot, for some reason (?)
    content = content.replaceAll(
        /(<img)\s(alt=")(?<TEXT>.*?)\"\s(src=")(?<URL>.*?)\)/g,
        '<img alt="$<TEXT>" src="$<URL>" />'
    );

    content = content.replaceAll(/^(<img)(.*?)(\/\>)$\n/gm, "<img $2 /><br />"); // <- VERY important (for some reason (?))

    // ...normal (with attributes)
    content = content.replaceAll(
        /\[(?<TEXT>.*?)\]\((?<URL>.*?)\)\:\{(?<ATTRS>.+)\}/g,
        '<a href="$<URL>" $<ATTRS>>$<TEXT></a>'
    );

    // ...normal
    content = content.replaceAll(
        /\[(?<TEXT>.*?)\]\((?<URL>.*?)\)/g,
        '<a href="$<URL>">$<TEXT></a>'
    );

    // update content to allow arrow element alignment, marked doesn't normally do this because it isn't in the markdown spec
    // using the (custom) <r> element makes marked for some reason work??? I'VE BEEN DOING THIS FOR 5 1/2 HOURS AND THIS
    // IS THE SOLUTION TO MARKED NOT PARSING THESE ELEMENTS??????
    content = content.replaceAll(
        // row flex
        /(\-\>{2})(.*?)(\-\>{2}|\<{2}\-)/gs,
        (match: string, offset: string, string: string): string => {
            const trim = match.trim();
            return `<rf style="justify-content: ${
                // if last character is the end of an arrow, set align to right...
                // otherwise, set align to center
                trim[trim.length - 1] === ">" ? "right" : "center"
            }; text-align: ${
                trim[trim.length - 1] === ">" ? "right" : "center"
            };">${string}</rf>`;
        }
    );

    content = content.replaceAll(
        // row
        /(\-\>{1})(.*?)(\-\>{1}|\<{1}\-)/gs,
        (match: string, offset: string, string: string): string => {
            const trim = match.trim();
            return `<r style="text-align: ${
                // if last character is the end of an arrow, set align to right...
                // otherwise, set align to center
                trim[trim.length - 1] === ">" ? "right" : "center"
            };">${string}</r>`;
        }
    );

    // remove/fix mistakes
    content = content.replaceAll("<r></r>", "");

    // remove scripts, on[...] attributes and <link> elements

    // ...attributes
    content = content.replaceAll(/^(on)(.*)\=(.*)\"$/gm, "");
    content = content.replaceAll(/(href)\=\"(javascript\:)(.*)\"/g, "");

    // ...elements
    content = content.replaceAll(/(<script.*>)(.*?)(<\/script>)/gs, "");
    content = content.replaceAll(/(<script.*>)/gs, ""); // the above thing does not match the void <script /> element,
    //                                                     making the following work:
    //                                                         <script />alert(1)
    //                                                     this regex fixes that

    content = content.replaceAll(/(<link.*>)/gs, "");
    content = content.replaceAll(/(<meta.*>)/gs, "");

    // return
    return content;
}

/**
 * @function ParseMarkdown
 *
 * @export
 * @param {string}
 * @param [onserver=true]
 * @return {Promise<string>}
 */
export async function ParseMarkdown(
    content: string,
    onserver: boolean = true
): Promise<string> {
    content = ParseMarkdownSync(content, onserver);

    // parse content with marked and return
    content = await marked.parse(content, {
        gfm: true,
        silent: true,
        breaks: true,
        async: true,
        mangle: false,
    });

    // AUTO-PARAGRAPH!!!
    content = content.replaceAll(
        /^(.*?)\n{2,}/gms,
        (match: string, offset: string): string => {
            // return
            return `<p>\n${match}\n</p>`;
        }
    );

    // fill includes
    // TODO

    // fix mistakes (again)
    content = content.replaceAll("<p></p>", "");
    content = content.replaceAll("</p><p>", "");

    // return
    return `<!-- Bundles Markdown - report bugs at https://codeberg.org/sentrytwo/bundles -->\n${content}`;
}

// default export
export default {
    ParseMarkdownSync,
    ParseMarkdown,
};
