import { useState, useEffect, FC, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@/api';
import { AuthMiddleware } from '@/middlewares';
import { SuspenseLoader } from '@/components/Loaders';
import Navbar from 'src/components/Navbar';

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
            <Navbar />
            <div
                className='spifex-layout__container'
                style={{
                    flex: 1,
                    height: '100%',
                }}
            >
                <div
                    className='spifex-layout__content'
                    style={{
                        position: 'relative',
                        zIndex: 5,
                        display: 'block',
                        flex: 1
                    }}
                >
                    <div
                        className='spifex-layout__outlet'
                        style={{ display: 'block' }}>
                        <Outlet />
                    </div>
                </div>
            </div>
        </AuthMiddleware>
    );
};

export default SpifexLayout;