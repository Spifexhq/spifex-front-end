import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRequests } from 'src/api/requests';
import { Snackbar } from "@mui/material";
import MuiAlert from '@mui/material/Alert';
import InlineLoader from "@/components/common/Loaders/InlineLoader";
import './styles.css';

const EmailVerification = () => {
    // Captura os parâmetros da URL
    const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
    const navigate = useNavigate();
    const { verifyEmail } = useRequests();

    const [isVerifying, setIsVerifying] = useState(true);
    const [verificationMessage, setVerificationMessage] = useState('');
    const [snackBarOpen, setSnackBarOpen] = useState(false);

    useEffect(() => {
        const verifyUserEmail = async () => {
            try {
                const response = await verifyEmail(uidb64, token);
    
                if (response && response.detail) {
                    setVerificationMessage(response.detail);
                } else {
                    setVerificationMessage('Email verificado com sucesso!');
                }
            } catch (error) {
                if (error.response && error.response.data && error.response.data.detail) {
                    setVerificationMessage(error.response.data.detail);
                } else {
                    setVerificationMessage('Ocorreu um erro ao verificar seu email.');
                }
            } finally {
                setIsVerifying(false);
                setSnackBarOpen(true);
            }
        };
    
        verifyUserEmail();
    }, [uidb64, token, verifyEmail]);

    const handleGoToSignIn = () => {
        navigate('/signin');
    };

    const handleCloseSnackBar = () => {
        setSnackBarOpen(false);
    };

    return (
        <div className="email-verification-page">
            <div className="email-verification-container">
                {isVerifying ? (
                    <InlineLoader />
                ) : (
                    <>
                        <MuiAlert
                            className="email-verification-alert"
                            severity={verificationMessage.includes('sucesso') ? 'success' : 'error'}
                        >
                            {verificationMessage}
                        </MuiAlert>
                        <button
                            className="email-verification-button button-primary"
                            onClick={handleGoToSignIn}
                        >
                            Ir para Login
                        </button>
                    </>
                )}
            </div>
            <Snackbar
                open={snackBarOpen}
                autoHideDuration={6000}
                onClose={handleCloseSnackBar}
            >
                <MuiAlert
                    onClose={handleCloseSnackBar}
                    severity={verificationMessage.includes('sucesso') ? 'success' : 'error'}
                    sx={{ width: '100%' }}
                >
                    {verificationMessage}
                </MuiAlert>
            </Snackbar>
        </div>
    );
};

export default EmailVerification;