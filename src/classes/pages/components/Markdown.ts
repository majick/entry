import { marked } from "marked";

/**
 * @function ParseMarkdown
 *
 * @param {string} content
 * @return {string}
 */
export function ParseMarkdown(content: string): string {
    content = content.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    // allowed elements
    for (let element of ["hue", "sat", "lit", "theme", "comment", "p", "span"])
        content = content
            .replaceAll(`&lt;${element}&gt;`, `<${element}>`)
            .replaceAll(`&lt;/${element}&gt;`, `</${element}>`)
            .replaceAll("-&gt;", "->")
            .replaceAll("&lt;-", "<-");

    // update content to allow notes/warnings
    content = content.replaceAll(
        /^(\!\!\!)\s(?<TYPE>.*?)\s(?<TITLE>.*?)\n(?<CONTENT>.*?)$/gm,
        `<div class="mdnote note-$2">
                <b class="mdnote-title">$3</b>
                <p>$4</p>
            </div>`
    );

    content = content.replaceAll(
        // only title match
        /^(\!\!\!)\s(?<TYPE>.*?)\s(?<TITLE>.*?)$/gm,
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
        /(\=\=)(.*?)(\=\=)/g,
        '<span class="highlight">$2</span>'
    );

    // we have to do this ourselves because the next step would make it not work!
    content = content.replaceAll(
        /(\*\*\*)(.*?)(\*\*\*)/g,
        "<strong><em>$2</em></strong>"
    );

    // replace *** with <hr /> (rentry uses *** for hr, that's dumb)
    content = content.replaceAll("***", "<hr />");

    // manual italics because i've noticed it doesn't work (partially)
    content = content.replaceAll(/(\*)(.*?)(\*)/g, "<em>$2</em>");

    // treat rentry.co links like links to federated entry servers
    content = content.replaceAll(
        /(href\=)\"(https:\/\/)(rentry\.co)\/(.*?)\"/g,
        'href="/$4@rentry.co"'
    );

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
    return marked.parse(content, {
        mangle: false,
        gfm: true,
        silent: true,
    });
}

// default export
export default {
    ParseMarkdown,
};
