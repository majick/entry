import BundlesDB from "../../../db/BundlesDB";
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
            name={BundlesDB.config.name || "bundles"}
            FooterComponent={() => (
                <Footer IncludeLoading={props.IncludeLoading || true} />
            )}
        />
    );
}
