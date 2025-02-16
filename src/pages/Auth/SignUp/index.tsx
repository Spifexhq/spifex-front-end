import { useState } from "react";
import { Link } from "react-router-dom";
import { useRequests } from "src/api/requests";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";
import './styles.css';

const SignUp = () => {
    // Custom hook to handle API requests
    const { signUp } = useRequests();

    // State variables for form inputs
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    
    // State to manage loading and feedback messages
    const [isLoading, setIsLoading] = useState(false);
    const [snackBarMessage, setSnackBarMessage] = useState("");

    // Function to handle sign-up button click
    const handleSignUpBtn = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); // Prevent default form submission behavior
    
        // Validate if all fields are filled
        if (nameInput === '' || emailInput === '' || passwordInput === '' || confirmPasswordInput === '') {
            setSnackBarMessage('Preencha todos os campos');
            return;
        }
    
        // Validate if password and confirm password match
        if (passwordInput !== confirmPasswordInput) {
            setSnackBarMessage('As senhas não coincidem');
            return;
        }
    
        setIsLoading(true); // Start loading state
    
        try {
            // Make API request to register the user
            const response = await signUp({ name: nameInput, email: emailInput, password: passwordInput });
    
            if (response.detail) {
                setSnackBarMessage(response.detail);
                return;
            }
    
            setSnackBarMessage('Cadastro realizado com sucesso! Verifique seu email para ativar sua conta.');
            setNameInput('');
            setEmailInput('');
            setPasswordInput('');
            setConfirmPasswordInput('');
        } catch {
            setSnackBarMessage('Ocorreu um erro ao tentar registrar. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="sign-up">
            {/* Left section with background image */}
            <div className="sign-up__section sign-up__section--left">
                <img
                    className="sign-up__image"
                    alt="Background"
                    src="src/assets/Images/background/signup-background.svg"
                />
            </div>

            {/* Right section with form */}
            <div className="sign-up__section sign-up__section--right">
                <div className="sign-up__container">

                    {/* Logo */}
                    <div className="sign-up__logo-wrapper">
                        <a href="https://spifex.com" className="sign-up__logo-link">
                            <img
                                className="sign-up__logo"
                                alt="Logo"
                                src="src/assets/Icons/Logo/logo-black.svg"
                            />
                        </a>
                    </div>

                    {/* Form wrapper */}
                    <div className="sign-up__form-wrapper">
                        <div className="sign-up__header">
                            <span className="sign-up__title">Crie sua conta Spifex</span>
                        </div>

                        {/* Sign-up form */}
                        <form className="sign-up__form">
                            <Input
                                label="Nome"
                                placeholder="Digite seu nome"
                                type="text"
                                value={nameInput}
                                onChange={e => setNameInput(e.target.value)}
                                disabled={isLoading}
                            />

                            <Input
                                label="Email" 
                                placeholder="Digite seu email" 
                                type="email" 
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                disabled={isLoading}
                                autoComplete="off"
                                autoCorrect="off"
                            />

                            <div className="sign-up__form-passwords-wrapper">
                                <Input
                                    label="Senha"
                                    placeholder="Digite sua senha"
                                    type="password"
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    disabled={isLoading}
                                    showTogglePassword
                                    autoComplete="new-password"
                                    autoCorrect="off"
                                />
                                <Input
                                    label="Confirme sua senha"
                                    placeholder="Confirme sua senha"
                                    type="password"
                                    value={confirmPasswordInput}
                                    onChange={e => setConfirmPasswordInput(e.target.value)}
                                    onPaste={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()} 
                                    disabled={isLoading}
                                    showTogglePassword
                                    autoComplete="new-password"
                                    autoCorrect="off"
                                />
                            </div>

                            {/* Submit button */}
                            <div className="sign-up__button-wrapper">
                                <Button
                                    variant="primary"
                                    onClick={handleSignUpBtn}
                                    isLoading={isLoading}
                                    style={{height: "50px", width: "100%"}}
                                >
                                    Registrar
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer with link to sign-in page */}
                    <div className="sign-up__footer">
                        <span className="sign-up__footer-text">Já tem conta?</span>
                        <Link to="/signin" className="sign-up__link">
                            Clique aqui.
                        </Link>
                    </div>
                </div>

                {/* Snackbar for showing feedback messages */}
                <Snackbar
                    className="sign-up__snackbar"
                    open={snackBarMessage !== ""}
                    autoHideDuration={6000}
                    onClose={() => setSnackBarMessage("")}
                >
                    <Alert
                        className="sign-up__alert"
                        severity={snackBarMessage.includes("sucesso") ? "success" : "error"}
                    >
                        {snackBarMessage}
                    </Alert>
                </Snackbar>
            </div>
        </div>
    );
};

export default SignUp;
