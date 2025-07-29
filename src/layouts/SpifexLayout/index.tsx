import { useState, useEffect, FC, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@/api';
import { AuthMiddleware } from '@/middlewares';
import { SuspenseLoader } from '@/components/Loaders';

interface SpifexLayoutProps {
    children?: ReactNode;
}

const SpifexLayout: FC<SpifexLayoutProps> = () => {    
    const { handleInitUser } = useAuth();

    const [loadingAuth, setLoadingAuth] = useState(true)

    useEffect(() => {
        const authenticateUser = async () => {
            await handleInitUser();
            setLoadingAuth(false)
        }

        authenticateUser();
    }, [handleInitUser])

    if (loadingAuth) {
        return (
            <SuspenseLoader noLoadNp />
        )
    } 

    return (
        <AuthMiddleware>
            <div
                style={{
                    flex: 1,
                    height: '100%',
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        zIndex: 5,
                        display: 'block',
                        flex: 1
                    }}
                >
                    <div
                        style={{ display: 'block' }}>
                        <Outlet />
                    </div>
                </div>
            </div>
        </AuthMiddleware>
    );
};

export default SpifexLayout;