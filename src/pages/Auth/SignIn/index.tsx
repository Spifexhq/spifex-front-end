import { useEffect, useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";

import { useAuth } from "@/api";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";

import signInBackground from "@/assets/Images/background/signin-background.svg";
import logoBlack from "@/assets/Icons/Logo/logo-black.svg";

import "./styles.css";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const SignIn = () => {
  useEffect(() => {
    document.title = "Login | Spifex";
  }, []);
  
  const navigate = useNavigate();
  const { handleSignIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState<string | JSX.Element>("");

  const isFormIncomplete = !email || !password;

  const handleSubmit = async (e: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (isFormIncomplete) {
      setSnackBarMessage("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      await handleSignIn(email, password);
      navigate("/cashflow");
    } catch (error) {
      setSnackBarMessage(
        error instanceof Error ? error.message : "Erro inesperado. Tente novamente mais tarde."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------------

  return (
    <div className="sign-in">
      {/* Left section */}
      <div className="sign-in__section sign-in__section--left">
        <div className="sign-in__container">
          {/* Logo */}
          <div className="sign-in__logo-wrapper">
            <a href="https://spifex.com" className="sign-in__logo-link">
              <img className="sign-in__logo" alt="Logo" src={logoBlack} />
            </a>
          </div>

          {/* Form */}
          <div className="sign-in__form-wrapper">
            <div className="sign-in__header">
              <span className="sign-in__title">Entre na sua conta Spifex</span>
            </div>

            <form className="sign-in__form" onSubmit={handleSubmit}>
              <Input
                label="Email"
                placeholder="Digite seu email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
                autoCorrect="off"
              />

              <Input
                label="Senha"
                placeholder="Digite sua senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                showTogglePassword
                autoComplete="current-password"
                autoCorrect="off"
              />

              <div className="sign-in__button-wrapper">
                <Button
                  variant="primary"
                  type="submit"
                  onClick={handleSubmit}
                  loaderColor="#FFFFFF"
                  isLoading={isLoading}
                  disabled={isFormIncomplete || isLoading}
                  style={{ height: "50px", width: "100%" }}
                >
                  Entrar
                </Button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="sign-in__footer">
            <span className="sign-in__footer-text">Não possui conta?</span>
            <Link to="/signup" className="sign-in__link">
              Clique aqui.
            </Link>
          </div>
          <div className="sign-in__footer">
            <Link to="/forgot-password" className="sign-in__link">
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        {/* Snackbar */}
        <Snackbar
          className="sign-in__snackbar"
          open={snackBarMessage !== ""}
          autoHideDuration={6000}
          onClose={() => setSnackBarMessage("")}
        >
          <Alert
            className="sign-in__alert"
            severity={typeof snackBarMessage === "string" && snackBarMessage.includes("sucesso") ? "success" : "error"}
          >
            {snackBarMessage}
          </Alert>
        </Snackbar>
      </div>

      {/* Right section */}
      <div className="sign-in__section sign-in__section--right">
        <img className="sign-in__image" alt="Background" src={signInBackground} />
      </div>
    </div>
  );
};

export default SignIn;
