import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/api";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import './styles.css';

const SignIn = () => {
    const navigate = useNavigate(); // Hook to programmatically navigate between routes

    // State variables to manage form inputs and feedback messages
    const [snackBarMessage, setSnackBarMessage] = useState("");
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { handleSignIn } = useAuth(); // Custom hook for authentication

    // Function to handle sign-in button click
    const handleSignInBtn = async () => {
        // Validate if both email and password fields are filled
        if (emailInput === "" || passwordInput === "") {
          setSnackBarMessage("Preencha todos os campos");
          return;
        }

        setIsLoading(true); // Start loading state

        try {
            await handleSignIn(emailInput, passwordInput);
            navigate('/cashflow');
          } catch (error) {
            setSnackBarMessage(error instanceof Error ? error.message : "Erro inesperado.");
          } finally {
            setIsLoading(false);
          }
        };

    return (
        <div className="sign-in">
            {/* Left section containing the form */}
            <div className="sign-in__section sign-in__section--left">
                <div className="sign-in__container">

                    {/* Logo */}
                    <div className="sign-in__logo-wrapper">
                        <a href="https://spifex.com" className="sign-in__logo-link">
                            <img
                                className="sign-in__logo"
                                alt="Logo"
                                src="src/assets/Icons/Logo/logo-black.svg"
                            />
                        </a>
                    </div>

                    {/* Form wrapper */}
                    <div className="sign-in__form-wrapper">
                        <div className="sign-in__header">
                            <span className="sign-in__title">Entre na sua conta Spifex</span>
                        </div>

                        {/* Sign-in form */}
                        <form className="sign-in__form">
                            <Input 
                                label="Email" 
                                placeholder="Digite seu email" 
                                type="email" 
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                disabled={isLoading}
                            />

                            <Input 
                                label="Senha" 
                                placeholder="Digite sua senha" 
                                type="password" 
                                value={passwordInput}
                                onChange={e => setPasswordInput(e.target.value)}
                                disabled={isLoading}
                                showTogglePassword
                            />

                            {/* Submit button */}
                            <div className="sign-in__button-wrapper">
                                <Button
                                    variant="primary"
                                    onClick={handleSignInBtn}
                                    loaderColor="#FFFFFF"
                                    isLoading={isLoading}
                                    style={{height: "50px", width: "100%"}}
                                >
                                    Entrar
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer with link to sign-up page */}
                    <div className="sign-in__footer">
                        <span className="sign-in__footer-text">Não possui conta?</span>
                        <Link to="/signup" className="sign-in__link">
                            Clique aqui.
                        </Link>
                    </div>
                </div>

                {/* Snackbar for displaying feedback messages */}
                <Snackbar
                    className="sign-in__snackbar"
                    open={snackBarMessage !== ""}
                    autoHideDuration={6000}
                    onClose={() => setSnackBarMessage("")}
                    >
                    <Alert
                        className="sign-in__alert"
                        severity={snackBarMessage.includes("sucesso") ? "success" : "error"}
                    >
                        {snackBarMessage}
                    </Alert>
                </Snackbar>
            </div>

            {/* Right section with background image */}
            <div className="sign-in__section sign-in__section--right">
                <img
                    className="sign-in__image"
                    alt="Background"
                    src="src/assets/Images/background/signin-background.svg"
                />
            </div>
        </div>
    );
};

export default SignIn;