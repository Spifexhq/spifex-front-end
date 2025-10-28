// src/pages/SignUp/index.tsx
import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "src/api/requests";
import { isApiError, validatePassword, useAutoCountry } from "src/lib";

import Snackbar from "src/components/ui/Snackbar";
import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";

import signUpBackground from "@/assets/Images/background/signup-background.svg";
import logoBlack from "@/assets/Icons/Logo/logo-black.svg";

import "./styles.css";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const SignUp = () => {
  useEffect(() => {
    document.title = "Sign Up | Spifex";
  }, []);

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { country: autoCountry } = useAutoCountry({ timeoutMs: 2500 });

  const isFormIncomplete = Object.values(form).some((v) => v === "");

  const handleInputChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    if (isFormIncomplete) {
      setSnack({ message: "Preencha todos os campos.", severity: "warning" });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setSnack({ message: "As senhas não coincidem.", severity: "warning" });
      return;
    }

    const { isValid, message } = validatePassword(form.password);
    if (!isValid) {
      setSnack({ message, severity: "warning" });
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        timezone,
        country: (autoCountry || "").toUpperCase(),
      });

      if (isApiError(res)) {
        const fallback =
          res.error.message ??
          (typeof res.error.detail === "string"
            ? res.error.detail
            : "Não foi possível concluir o cadastro.");
        setSnack({ message: fallback, severity: "error" });
        return;
      }

      setSnack({
        message: "Cadastro realizado com sucesso! Verifique seu email para ativar sua conta.",
        severity: "success",
      });

      setForm({ name: "", email: "", password: "", confirmPassword: "" });

      navigate(`/signup/redirect?ts=${Date.now()}`, {
        state: { email: form.email },
      });
    } catch {
      setSnack({
        message: "Ocorreu um erro ao tentar registrar. Tente novamente mais tarde.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="sign-up">
      {/* Left section */}
      <div className="sign-up__section sign-up__section--left">
        <img className="sign-up__image" alt="Background" src={signUpBackground} />
      </div>

      {/* Right section */}
      <div className="sign-up__section sign-up__section--right">
        <div className="sign-up__container">
          {/* Logo */}
          <div className="sign-up__logo-wrapper">
            <a href="https://spifex.com" className="sign-up__logo-link">
              <img className="sign-up__logo" alt="Logo" src={logoBlack} />
            </a>
          </div>

          {/* Form */}
          <div className="sign-up__form-wrapper">
            <div className="sign-up__header">
              <span className="sign-up__title">Crie sua conta Spifex</span>
            </div>

            <form className="sign-up__form" onSubmit={handleSubmit}>
              <Input
                label="Nome"
                placeholder="Digite seu nome"
                type="text"
                value={form.name}
                onChange={handleInputChange("name")}
                disabled={isLoading}
              />

              <Input
                label="Email"
                placeholder="Digite seu email"
                type="email"
                value={form.email}
                onChange={handleInputChange("email")}
                disabled={isLoading}
                autoComplete="off"
                autoCorrect="off"
              />

              <div className="sign-up__form-passwords-wrapper">
                <Input
                  label="Senha"
                  placeholder="Digite sua senha"
                  type="password"
                  value={form.password}
                  onChange={handleInputChange("password")}
                  disabled={isLoading}
                  showTogglePassword
                  autoComplete="new-password"
                  autoCorrect="off"
                />
                <Input
                  label="Confirme sua senha"
                  placeholder="Confirme sua senha"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleInputChange("confirmPassword")}
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  disabled={isLoading}
                  showTogglePassword
                  autoComplete="new-password"
                  autoCorrect="off"
                />
              </div>

              <div className="sign-up__button-wrapper">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  type="submit"
                  loaderColor="#FFFFFF"
                  isLoading={isLoading}
                  disabled={isFormIncomplete || isLoading}
                  style={{ height: "50px", width: "100%" }}
                >
                  Registrar
                </Button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="sign-up__footer">
            <span className="sign-up__footer-text">Já tem conta?</span>
            <Link to="/signin" className="sign-up__link">
              Clique aqui.
            </Link>
          </div>
        </div>

        {/* Snackbar only (no Alert) */}
        <Snackbar
          className="sign-up__snackbar"
          open={!!snack}
          autoHideDuration={6000}
          onClose={() => setSnack(null)}
          severity={snack?.severity}
          message={snack?.message}
          anchor={{ vertical: "bottom", horizontal: "center" }}
          pauseOnHover
          showCloseButton
        />
      </div>
    </div>
  );
};

export default SignUp;
