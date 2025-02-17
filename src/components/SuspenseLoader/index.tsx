import { useEffect } from 'react';
import NProgress from 'nprogress';
import './styles.css';

type Props = {
    noLoadNp?: boolean;
    noLoadProgress?: boolean;
    className?: string;
};

const SuspenseLoader = ({ noLoadNp = false, noLoadProgress = false, className }: Props) => {
    useEffect(() => {
        if (!noLoadNp) {
            NProgress.start();

            return () => {
                NProgress.done();
            };
        }
    }, [noLoadNp]);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
        >
            {!noLoadProgress && (
                <div className={`SuspenseLoader-cubes ${className ?? "w-15 h-15"}`}>
                    <div className="sk-cube sk-cube1"></div>
                    <div className="sk-cube sk-cube2"></div>
                    <div className="sk-cube sk-cube3"></div>
                    <div className="sk-cube sk-cube4"></div>
                    <div className="sk-cube sk-cube5"></div>
                    <div className="sk-cube sk-cube6"></div>
                    <div className="sk-cube sk-cube7"></div>
                    <div className="sk-cube sk-cube8"></div>
                    <div className="sk-cube sk-cube9"></div>
                </div>
            )}
        </div>
    );
}

export default SuspenseLoader;
