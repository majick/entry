export default function DateOptions() {
    function SetDateMonths(months: number): number {
        const date = new Date(); // get date
        date.setMonth(date.getMonth() + months); // add months
        return date.getTime(); // return time
    }

    // return
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
            }}
        >
            <a
                href={`javascript:SetExpire("${Date.now() + 60 * 10 * 1000}")`}
                className="button secondary"
            >
                10 minutes
            </a>

            <a
                href={`javascript:SetExpire("${Date.now() + 60 * 60 * 1000}")`}
                className="button secondary"
            >
                1 hour
            </a>

            <a
                href={`javascript:SetExpire("${
                    Date.now() +
                    60 * // seconds
                        60 * // minutes
                        24 * // hours
                        1000 // convert from ms
                }")`}
                className="button secondary"
            >
                1 day
            </a>

            <a
                href={`javascript:SetExpire("${
                    Date.now() +
                    60 * // seconds
                        60 * // minutes
                        24 * // hours
                        7 * // days
                        1000 // convert from ms
                }")`}
                className="button secondary"
            >
                1 week
            </a>

            <a
                href={`javascript:SetExpire("${
                    Date.now() +
                    60 * // seconds
                        60 * // minutes
                        24 * // hours
                        14 * // days
                        1000 // convert from ms
                }")`}
                className="button secondary"
            >
                2 weeks
            </a>

            <a
                href={`javascript:SetExpire("${
                    Date.now() +
                    60 * // seconds
                        60 * // minutes
                        24 * // hours
                        31 * // days
                        1000 // convert from ms
                }")`}
                className="button secondary"
            >
                1 month
            </a>

            <a
                href={`javascript:SetExpire("${SetDateMonths(6)}")`}
                className="button secondary"
            >
                6 months
            </a>

            <a
                href={`javascript:SetExpire("${SetDateMonths(12)}")`}
                className="button secondary"
            >
                1 year
            </a>

            <script
                dangerouslySetInnerHTML={{
                    __html: `function SetExpire(ms) {
                        const date = new Date(parseInt(ms));
                        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                        document.getElementById("ExpireOn").value = date.toISOString().slice(0, 16);
                    }`,
                }}
            />
        </div>
    );
}
