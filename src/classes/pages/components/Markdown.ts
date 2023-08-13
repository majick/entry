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
 * @function ParseMarkdown
 *
 * @param {string} content
 * @return {Promise<string>}
 */
export async function ParseMarkdown(content: string): Promise<string> {
    // table of contents base
    const TOC: TableOfContents = [];

    // escape < and >
    content = content.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    // allowed elements
    for (let element of ["hue", "sat", "lit", "theme", "comment", "p", "span"])
        content = content
            .replaceAll(`&lt;${element}&gt;`, `<${element}>`)
            .replaceAll(`&lt;/${element}&gt;`, `</${element}>`)
            .replaceAll("-&gt;", "->")
            .replaceAll("&lt;-", "<-");

    // allow html escapes (prefixed by &E)
    content = content.replaceAll(/(&!)(.*?);/g, "&$2;");

    // code blocks

    // ...fenced code block
    content = content.replaceAll(
        /^(\`{3})(.*?)\n(.*?)(\`{3})$/gms, // $2: language, $3: code
        '<pre><code class="language-$2">$3</code></pre>\n'
    );

    // ...inline code block
    content = content.replaceAll(/^(\`{3})(.*)(\`{3})$/gm, "<code>$2</code>"); // ```code```

    // ...inline code block
    content = content.replaceAll(/^(\`{2})(.*)(\`{2})$/gm, "<code>$2</code>"); // ``code``
    content = content.replaceAll(/^(\`{1})(.*)(\`{1})$/gm, "<code>$2</code>"); // `code`

    // fix headers (they aren't picked up if the formatting is really bad)
    // inserting a \n after each heading to make marked automatically make following text
    // its own paragraph element, fixes a lot of formatting issues
    // ...all headings need to be matched in one regex so that the toc goes by order of match!
    content = content.replaceAll(
        /^(\#.*?)\s(.*)$/gm,
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
                Text: string,
                Type: HeadingType,
                ID: `${string
                    .toLowerCase()
                    .replaceAll(" ", "-")
                    .replaceAll("(", "")
                    .replaceAll(")", "")}${suffix}`,
            };

            TOC.push(heading);

            // return
            return `<h${heading.Type} id="${heading.ID}">${string}</h${heading.Type}>\n`;
        }
    );

    // table of contents
    const TOC_Regex = /^\[(TOC)\]$/gm;

    // ...only spend time creating toc if [TOC] exists
    if (content.match(TOC_Regex)) {
        let TOC_Content = "";

        for (const heading of TOC)
            TOC_Content += `${"    ".repeat(heading.Type - 1)} 1. [${
                heading.Text
            }](#${heading.ID})\n`;

        // add table to content
        content = content.replaceAll(TOC_Regex, TOC_Content);
    }

    // horizontal rule
    content = content.replaceAll(/^\*{3}$/gm, "\n<hr />\n");
    content = content.replaceAll(/^-{3}$/gm, "\n<hr />\n");
    content = content.replaceAll(/^_{3}$/gm, "\n<hr />\n");

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

    // update content to allow arrow element alignment, marked doesn't normally do this because it isn't in the markdown spec
    // using the (custom) <r> element makes marked for some reason work??? I'VE BEEN DOING THIS FOR 5 1/2 HOURS AND THIS
    // IS THE SOLUTION TO MARKED NOT PARSING THESE ELEMENTS??????
    content = content.replaceAll(
        // -> -> (right)
        /(\-\>)(.*?)(\-\>|\<\-)\s*\.*/gs,
        (match: string, offset: string, string: string): string => {
            const trim = match.trim();
            return `<r style="text-align: ${
                // if last character is the end of an arrow, set align to right...
                // otherwise, set align to center
                trim[trim.length - 1] === ">" ? "right" : "center"
            };">${string}</r>`;
        }
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
    content = content.replaceAll(/(\*{2})(.*?)(\*{2})/g, "<strong>$2</strong>");
    content = content.replaceAll(/(\*{1})(.*?)(\*{1})/g, "<em>$2</em>");

    // named links
    // added because marked kept missing some when rendering as HTML

    // ...image
    // these are actually so fragile, and the ordering of all of these operations matters
    content = content.replaceAll(
        /(!)\[(?<TEXT>.*?)\]\((?<URL>.*?)\)/g,
        '<img alt="$<TEXT>" src="$<URL>" />'
    );

    // ...broken images
    content = content.replaceAll('" />', ")"); // this happens a lot, for some reason (?)
    content = content.replaceAll(
        /(<img)\s(alt=")(?<TEXT>.*?)\"\s(src=")(?<URL>.*?)\)/g,
        '<img alt="$<TEXT>" src="$<URL>" />'
    );

    content = content.replaceAll(/^(<img)(.*?)(\/\>)$\n/gm, "<img $2 /><br />"); // <- VERY important (for soem reason (?))

    // ...normal
    content = content.replaceAll(
        /\[(?<TEXT>.*?)\]\((?<URL>.*?)\)/g,
        '<a href="$<URL>">$<TEXT></a>'
    );

    // remove mistakes
    content = content.replaceAll("<r></r>", "");
    content = content.replaceAll("<p></p>", "");

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

    content = content.replaceAll(/(<style.*>)(.*?)(<\/style>)/gs, "");
    content = content.replaceAll(/(<style.*>)/gs, "");

    // parse content with marked and return
    return await marked.parse(content, {
        gfm: true,
        silent: true,
        breaks: true,
        async: true,
        mangle: false,
    });
}

// default export
export default {
    ParseMarkdown,
};
