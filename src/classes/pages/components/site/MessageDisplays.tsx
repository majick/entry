import { CardWithHeader, Button } from "fusion";

export default function MessageDisplays(props: { search: URLSearchParams }): any {
    const { search } = props;

    // return
    return (
        <>
            {(search.get("err") && (
                <div style={{ marginBottom: "var(--u-04)" }}>
                    <CardWithHeader
                        round={true}
                        border={true}
                        header={
                            <div
                                class={
                                    "full flex align-center justify-space-between"
                                }
                            >
                                <b style={{ color: "var(--red)" }}>
                                    Application Error
                                </b>

                                <Button type="border" round={true} href="?">
                                    Close
                                </Button>
                            </div>
                        }
                    >
                        {decodeURIComponent(search.get("err")!)}
                    </CardWithHeader>
                </div>
            )) ||
                (search.get("msg") && (
                    <div style={{ marginBottom: "var(--u-04)" }}>
                        <CardWithHeader
                            round={true}
                            border={true}
                            header={
                                <div
                                    class={
                                        "full flex align-center justify-space-between"
                                    }
                                >
                                    <b
                                        style={{
                                            color: "var(--green3)",
                                        }}
                                    >
                                        Application Message
                                    </b>

                                    <Button type="border" round={true} href="?">
                                        Close
                                    </Button>
                                </div>
                            }
                        >
                            {decodeURIComponent(search.get("msg")!)}
                        </CardWithHeader>
                    </div>
                ))}
        </>
    );
}
