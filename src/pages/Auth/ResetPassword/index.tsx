import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/api/requests";
import { validatePassword } from "src/lib"; // você já usa esse helper
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Button from "@/components/Button";
import Input from "@/components/Input";

const ResetPassword = () => {
  useEffect(() => { document.title = "Redefinir senha | Spifex"; }, []);
  const navigate = useNavigate();
  const { uidb64 = "", token = "" } = useParams();

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<string | JSX.Element>("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!p1 || !p2) {
      setSnack("Preencha os dois campos de senha.");
      return;
    }
    if (p1 !== p2) {
      setSnack("As senhas não coincidem.");
      return;
    }
    const v = validatePassword(p1);
    if (!v.isValid) {
      setSnack(v.message);
      return;
    }

    setIsLoading(true);
    try {
      await api.confirmPasswordReset(uidb64, token, p1);
      setSnack("Senha alterada com sucesso! Faça login.");
      navigate("/signin");
    } catch (err) {
      setSnack(err instanceof Error ? err.message : "Link inválido ou expirado.");
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

      <Snackbar open={!!snack} onClose={() => setSnack("")} autoHideDuration={6000}>
        <Alert severity={typeof snack === "string" && snack.includes("sucesso") ? "success" : "error"}>
            {snack}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ResetPassword;
