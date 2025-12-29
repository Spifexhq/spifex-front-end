import { Suspense } from "react";
import TopProgress from "@/components/ui/Loaders/TopProgress";

const Loader = (Component: React.ComponentType) => (props: object) => (
    <Suspense fallback={<TopProgress active={true} />}>
        <Component {...props} />
    </Suspense>
);

export default Loader;
