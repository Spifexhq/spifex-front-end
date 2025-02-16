import React, { useState, useEffect } from "react";
import { Snackbar } from "@mui/material";
import MuiAlert from '@mui/material/Alert';
import { useNavigate, useLocation } from "react-router-dom";
import ModalSection from "@/components/common/ModalSection";
import InlineLoader from "@/components/InlineLoader";
import { apiRequest } from '@/api';
import './styles.css';
import { useSubscription } from "@/utils/subscription";

interface PurchaseDetails {
    item: string;
    amount: string;
    date: string;
    transactionId: string;
}

const PurchaseConfirmation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [snackBarMessage, setSnackBarMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(true);
    const { handleFetchSubscriptionStatus } = useSubscription();

    const query = new URLSearchParams(location.search);
    const sessionId = query.get('session_id');

    useEffect(() => {
        const fetchPurchaseDetails = async () => {
            if (!sessionId) {
                setSnackBarMessage('Sessão inválida.');
                setIsFetching(false);
                return;
            }

            try {
                const response = await apiRequest<{ purchase_details: PurchaseDetails }>(
                    'payments/get-purchase-details/',
                    'GET',
                    { session_id: sessionId },
                    true
                );

                if (response.detail) {
                    setSnackBarMessage(response.detail);
                } else if (response.data) {
                    setPurchaseDetails(response.data.purchase_details);

                    // Chamar handleFetchSubscriptionStatus aqui
                    await handleFetchSubscriptionStatus();
                } else {
                    setSnackBarMessage('Não foi possível obter os detalhes da compra.');
                }
            } catch (error) {
                setSnackBarMessage('Não foi possível obter os detalhes da compra.');
            } finally {
                setIsFetching(false);
            }
        };

        fetchPurchaseDetails();
    }, [sessionId, handleFetchSubscriptionStatus]);

    const handleRedirect = async () => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            navigate('/subscription-management');
        } catch (error) {
            setSnackBarMessage('Ocorreu um erro ao redirecionar. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return <InlineLoader />;
    }

    if (!purchaseDetails) {
        return (
            <div className="purchase-confirmation-page">
                <Snackbar
                    open={snackBarMessage !== ''}
                    autoHideDuration={6000}
                    onClose={() => setSnackBarMessage('')}
                >
                    <MuiAlert severity="error">
                        {snackBarMessage}
                    </MuiAlert>
                </Snackbar>
            </div>
        );
    }

    return (
        <div className="purchase-confirmation-page">
            <div className="purchase-confirmation-page__left">
                <div className="purchase-confirmation__container">
                    <div className="purchase-confirmation__logo-container">
                        <a href="https://spifex.com">
                            <img
                                className="purchase-confirmation__logo"
                                alt="Logo"
                                src="src/assets/Icons/Logo/logo-black.svg"
                            />
                        </a>
                    </div>
                    <div className="purchase-confirmation__content">
                        <div className="purchase-confirmation__header">
                            <h2>Compra Confirmada!</h2>
                        </div>
                        <div className="purchase-confirmation__details">
                            <ModalSection>
                                <label>Item</label>
                                <span>{purchaseDetails.item}</span>
                            </ModalSection>
                            <ModalSection>
                                <label>Valor</label>
                                <span>{purchaseDetails.amount}</span>
                            </ModalSection>
                            <ModalSection>
                                <label>Data</label>
                                <span>{new Date(Number(purchaseDetails.date) * 1000).toLocaleDateString()}</span>
                            </ModalSection>
                            <ModalSection>
                                <label>ID da Transação</label>
                                <span>{purchaseDetails.transactionId}</span>
                            </ModalSection>
                        </div>
                        <div className="purchase-confirmation__buttons-container">
                            <button
                                onClick={handleRedirect}
                                disabled={isLoading}
                                className="purchase-confirmation__button button-primary"
                            >
                                {isLoading ? <InlineLoader /> : 'Voltar'}
                            </button>
                        </div>
                    </div>
                </div>
                <Snackbar
                    className="purchase-confirmation__snackbar"
                    open={snackBarMessage !== ''}
                    autoHideDuration={6000}
                    onClose={() => setSnackBarMessage('')}
                >
                    <MuiAlert className="sign-in__snackbar-alert" severity="error">
                        {snackBarMessage}
                    </MuiAlert>
                </Snackbar>
            </div>
            <div className="purchase-confirmation-page__right">
                <img
                    className="purchase-confirmation-page__image"
                    alt="Background"
                    src="src/assets/Images/background/purchase-success.svg"
                />
            </div>
        </div>
    );
}

export default PurchaseConfirmation;
