# Bundles Flavored Markdown

Bundles features a special markdown "flavor" tailored towards increased customization options and ease of use. This document will help to detail this Markdown flavoring, hoping to make it easier for others to implement a compliant Markdown parser.

## Basics

Bundles Markdown parsers must support all default Markdown options. This includes (but is not limited to) the following:

- bold/italics text using asterisks
- underlined text using double underscores
- links using a bracket/parenthesis combination
- images using an exclamation mark in front of a link
    - Bundles Markdown parsers should expand upon this idea by allowing users to declare a width and height of the image by adding `:{WIDTHxHEIGHT}` at the end of their image link
        - `width`: `int`
        - `height`: `int`
- headers using hashtag-based syntax (`(#{1,6})`)
- inline and fenced code blocks using backticks
- ordered and unordered lists using numbers (`1.`, `2.`, etc) and hyphens (`-`) respectively

## Special Elements

Bundles supports "special elements" in Markdown. These elements are opened with a less than and percentage sign (`<%`), and closed with a percentage sign and greater than (`%>`). Special elements take the element name, and then however many attributes that element is expected to parse: `<&!percnt; class class1 class2 class3 ... %>`

Below is a list of the current standardized special elements (and their arguments):

- tag
    - accepts infinite arguments of any type
- theme
    - **theme**: `"dark" | "light" | "blue" | "purple" | "pink" | "green"`
- hsl
    - **hue?**: `number`
    - **sat?**: `string`, percentage
    - **lit?**: `string`, percentage
- animation
    - [Animation Element Information](https://sentrytwo.com/paste/doc/what#animations)
- close
    - **name**: `any`
- time
    - **time**: `string`, UTC time formatted with underscores instead of spaces (ex: `Sat,_16_Dec_2023_02:07:11_GMT`)
- class
    - **classes**: `string`, accepts 1-infinite
- id
    - **id**: `string`, accepts only 1 argument
