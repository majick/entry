/**
 * @function LineNumbers
 *
 * @export
 * @param {{
 *     children: string;
 *     block?: number;
 * }} props
 * @return {*}
 */
export default function LineNumbers(props: {
    children: string;
    block?: number;
}): any {
    let line = 0; // store current line

    // return
    return (
        <div class="line-numbers code">
            {props.children.split("\n").map(() => {
                line++;

                // return
                return (
                    <a
                        class="line-number"
                        href={`#${props.block ? `B${props.block}` : ""}L${line}`}
                        id={`${props.block ? `B${props.block}` : ""}L${line}`}
                    >
                        {line}
                    </a>
                );
            })}
        </div>
    );
}
