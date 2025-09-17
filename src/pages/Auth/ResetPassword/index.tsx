import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/api/requests";
import { validatePassword } from "src/lib";
import Snackbar from "@/components/Snackbar";
import Button from "@/components/Button";
import Input from "@/components/Input";

type Snack = { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" } | null;

const ResetPassword = () => {
  useEffect(() => { document.title = "Redefinir senha | Spifex"; }, []);
  const navigate = useNavigate();
  const { uidb64 = "", token = "" } = useParams();

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!p1 || !p2) {
      setSnack({ message: "Preencha os dois campos de senha.", severity: "warning" });
      return;
    }
    if (p1 !== p2) {
      setSnack({ message: "As senhas não coincidem.", severity: "warning" });
      return;
    }
    const v = validatePassword(p1);
    if (!v.isValid) {
      setSnack({ message: v.message, severity: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      await api.confirmPasswordReset(uidb64, token, p1);
      setSnack({ message: "Senha alterada com sucesso! Faça login.", severity: "success" });
      navigate("/signin");
    } catch (err) {
      setSnack({
        message: err instanceof Error ? err.message : "Link inválido ou expirado.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-2">Definir nova senha</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          label="Nova senha"
          type="password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          showTogglePassword
          disabled={isLoading}
        />
        <Input
          label="Confirme a senha"
          type="password"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          showTogglePassword
          disabled={isLoading}
        />
        <Button type="submit" variant="primary" loaderColor="#FFFFFF" isLoading={isLoading} disabled={isLoading}>
          Salvar nova senha
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

export default ResetPassword;
