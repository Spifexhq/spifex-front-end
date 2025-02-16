import { Suspense } from "react";
import SuspenseLoader from "@/components/SuspenseLoader";

const Loader = (Component: React.ComponentType) => (props: object) => (
    <Suspense fallback={<SuspenseLoader />}>
        <Component {...props} />
    </Suspense>
);

export default Loader;
