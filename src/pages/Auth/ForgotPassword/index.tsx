import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/requests";
import Snackbar from "src/components/ui/Snackbar";
import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";

type Snack = { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" } | null;

const ForgotPassword = () => {
  useEffect(() => { document.title = "Esqueci minha senha | Spifex"; }, []);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setSnack({ message: "Informe seu email.", severity: "warning" });
      return;
    }
    setIsLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      setSnack({
        message: "Se existir uma conta com este email, enviaremos um link para redefinir a senha.",
        severity: "info",
      });
      setEmail("");
    } catch (err) {
      setSnack({
        message: err instanceof Error ? err.message : "Erro ao solicitar redefinição.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-2">Esqueci minha senha</h1>
      <p className="text-sm text-gray-600 mb-4">
        Digite seu email. Se houver uma conta, enviaremos um link para redefinição.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          label="Email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" variant="primary" loaderColor="#FFFFFF" isLoading={isLoading} disabled={!email || isLoading}>
          Enviar link
        </Button>
      </form>

      <div className="mt-4 text-sm">
        <Link to="/signin" className="text-blue-600 hover:underline">Voltar ao login</Link>
      </div>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </div>
  );
};

export default ForgotPassword;
