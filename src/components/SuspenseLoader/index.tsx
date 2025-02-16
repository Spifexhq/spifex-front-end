import { useEffect } from 'react';
import NProgress from 'nprogress';
import './styles.css';

type Props = {
    noLoadNp?: boolean;
    noLoadProgress?: boolean;
};

const SuspenseLoader = ({ noLoadNp = false, noLoadProgress = false }: Props) => {
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
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {!noLoadProgress && (
                <div className="SuspenseLoader-cubes">
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
