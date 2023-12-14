# Entry Flavored Markdown

Entry features a special markdown "flavor" tailored towards increased customization options and ease of use. This document will help to detail this Markdown flavoring, hoping to make it easier for others to implement a compliant Markdown parser.

Most of this information can be found in an end user guide [here](https://sentrytwo.com/pub/markdown).

## Basics

Entry Markdown parsers must support all default Markdown options. This includes (but is not limited to) the following:

- bold/italics text using asterisks
- underlined text using double underscores
- links using a bracket/parenthesis combination
- images using an exclamation mark in front of a link
    - Entry Markdown parsers should expand upon this idea by allowing users to declare a width and height of the image by adding `:{WIDTHxHEIGHT}` at the end of their image link
        - `width`: `int`
        - `height`: `int`
- headers using hashtag-based syntax (`(#{1,6})`)
- inline and fenced code blocks using backticks
- ordered and unordered lists using numbers (`1.`, `2.`, etc) and hyphens (`-`) respectively

## Special Elements

...to be continued
