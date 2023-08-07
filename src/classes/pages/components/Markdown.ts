/**
 * @file Handle Markdown
 * @name Markdown.ts
 * @license MIT
 */

import { marked } from "marked";

/**
 * @function ParseMarkdown
 *
 * @param {string} content
 * @return {Promise<string>}
 */
export async function ParseMarkdown(content: string): Promise<string> {
    content = content.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    // allowed elements
    for (let element of ["hue", "sat", "lit", "theme", "comment", "p", "span"])
        content = content
            .replaceAll(`&lt;${element}&gt;`, `<${element}>`)
            .replaceAll(`&lt;/${element}&gt;`, `</${element}>`)
            .replaceAll("-&gt;", "->")
            .replaceAll("&lt;-", "<-");

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
    content = content.replaceAll(/^(\#{6})\s*(.*)$/gm, "<h6>$2</h6>\n");
    content = content.replaceAll(/^(\#{5})\s*(.*)$/gm, "<h5>$2</h5>\n");
    content = content.replaceAll(/^(\#{4})\s*(.*)$/gm, "<h4>$2</h4>\n");
    content = content.replaceAll(/^(\#{3})\s*(.*)$/gm, "<h3>$2</h3>\n");
    content = content.replaceAll(/^(\#{2})\s*(.*)$/gm, "<h2>$2</h2>\n");
    content = content.replaceAll(/^(\#{1})\s*(.*)$/gm, "<h1>$2</h1>\n");

    // horizontal rule
    content = content.replaceAll(/^\*{3}$/gm, "\n<hr />\n");
    content = content.replaceAll(/^-{3}$/gm, "\n<hr />\n");
    content = content.replaceAll(/^_{3}$/gm, "\n<hr />\n");

    // update content to allow notes/warnings
    content = content.replaceAll(
        /^(\!{3})\s(?<TYPE>.*?)\s(?<TITLE>.*?)\n(?<CONTENT>.*?)$/gm,
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
        // -> <- (center)
        /(\-\>)(.*?)(\<\-)\s*\.*/gs,
        '<r style="text-align: center;">$2</r>'
    );

    content = content.replaceAll(
        // -> -> (right)
        /(\-\>)(.*?)(\-\>)\s*\.*/gs,
        '<r style="text-align: right;">$2</r>'
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
