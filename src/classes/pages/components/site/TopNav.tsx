import EntryDB from "../../../db/EntryDB";
import { TopNav } from "fusion";
import Footer from "./Footer";

export default function _TopNav(props: {
    breadcrumbs?: string[];
    margin?: boolean;
    children?: any;
    border?: boolean;
    IncludeLoading?: boolean;
}) {
    return (
        <TopNav
            {...props}
            name={EntryDB.config.name || "entry"}
            FooterComponent={() => (
                <Footer IncludeLoading={props.IncludeLoading || true} />
            )}
        />
    );
}
