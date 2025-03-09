import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRequests } from "@/api/requests";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import { InlineLoader } from "@/components/Loaders";
import "./styles.css";

const EmailVerification = () => {
    const { uidb64, token } = useParams<{ uidb64?: string; token?: string }>();
    const navigate = useNavigate();
    const { verifyEmail } = useRequests();

    const [isVerifying, setIsVerifying] = useState(true);
    const [verificationMessage, setVerificationMessage] = useState("");
    const [snackBarMessage, setSnackBarMessage] = useState("");

    useEffect(() => {
        const verifyUserEmail = async () => {
            if (!uidb64 || !token) {
                setVerificationMessage("Parâmetros inválidos.");
                setSnackBarMessage("Parâmetros inválidos.");
                setIsVerifying(false);
                return;
            }

            try {
                const response = await verifyEmail(uidb64, token);

                if (response?.status === "error") {
                    setVerificationMessage(response.message);
                    setSnackBarMessage(response.message);
                } else if (response?.status === "success") {
                    setVerificationMessage("Email verificado com sucesso!");
                    setSnackBarMessage("Email verificado com sucesso!");
                } else {
                    setVerificationMessage("Resposta inesperada da API.");
                    setSnackBarMessage("Erro desconhecido.");
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro ao verificar seu email.";
                setVerificationMessage(errorMessage);
                setSnackBarMessage(errorMessage);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyUserEmail();
    }, [uidb64, token, verifyEmail]);

    return (
        <div className="email-verification">
            <div className="email-verification__section email-verification__section--left">
                <div className="email-verification__container">
                    <div className="email-verification__content">
                        {isVerifying ? (
                            <InlineLoader />
                        ) : (
                            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4">
                                <div className="max-w-md w-full bg-white p-6 shadow-md rounded-md text-center">
                                    <h1 className="text-2xl font-semibold text-gray-800 mb-4">
                                        {verificationMessage.includes("sucesso")
                                            ? "Seu email foi verificado com sucesso!"
                                            : "Erro na verificação do email"}
                                    </h1>
                                    <p className="text-gray-600 mb-6">
                                        {verificationMessage.includes("sucesso")
                                            ? "Agora você pode entrar na sua conta."
                                            : "Verifique o link ou tente novamente mais tarde."}
                                    </p>
                                    {verificationMessage.includes("sucesso") && (
                                        <Button
                                            variant="primary"
                                            onClick={() => navigate("/signin")}
                                            style={{ height: "50px", width: "100%" }}
                                        >
                                            Ir para Login
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <Snackbar
                    className="email-verification__snackbar"
                    open={snackBarMessage !== ""}
                    autoHideDuration={6000}
                    onClose={() => setSnackBarMessage("")}
                >
                    <Alert
                        className="email-verification__alert"
                        severity={snackBarMessage.includes("sucesso") ? "success" : "error"}
                    >
                        {snackBarMessage}
                    </Alert>
                </Snackbar>
            </div>
        </div>
    );
};

export default EmailVerification;
