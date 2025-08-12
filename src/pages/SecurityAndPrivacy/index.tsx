/* -------------------------------------------------------------------------- */
/*  File: src/pages/SecurityAndPrivacy.tsx                                    */
/*  Style: Navbar fixa + SidebarSettings, light borders, compact labels       */
/*  Notes: no backdrop-close; honors fixed heights; no horizontal overflow    */
/* -------------------------------------------------------------------------- */

import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";
import { User } from "src/models/auth";
import { validatePassword } from "src/lib";

/* --------------------------------- Helpers -------------------------------- */
function getInitials(name?: string) {
  if (!name) return "SC";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

const Row = ({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
    </div>
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
const SecurityAndPrivacy = () => {
  useEffect(() => {
    document.title = "Segurança e Privacidade";
  }, []);

  const { user: authUser } = useAuthContext();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState<string | JSX.Element>("");

  const [pwData, setPwData] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });

  /* ------------------------ Handlers ------------------------- */
  const openModal = () => setModalOpen(true);
  const closeModal = useCallback(() => {
    setPwData({ current_password: "", new_password: "", confirm: "" });
    setModalOpen(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPwData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const { current_password, new_password, confirm } = pwData;

    if (new_password !== confirm) {
      setSnackBarMessage("As senhas não coincidem.");
      return;
    }
    if (current_password === new_password) {
      setSnackBarMessage("A nova senha não pode ser igual à senha atual.");
      return;
    }
    const validation = validatePassword(new_password);
    if (!validation.isValid) {
      setSnackBarMessage(validation.message);
      return;
    }

    try {
      await api.changePassword({ current_password, new_password });
      closeModal();
      setSnackBarMessage("Senha alterada com sucesso.");
    } catch (err) {
      if (axios.isAxiosError(err))
        setSnackBarMessage(err.response?.data?.message ?? "Erro ao alterar senha.");
      else if (err instanceof Error)
        setSnackBarMessage(err.message);
      else
        setSnackBarMessage("Erro inesperado.");
    }
  };

  /* ------------------------ Load user ------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.getUser();
        setUser(resp.data.user);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ------------------------ UX hooks ------------------------ */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  if (loading) return <SuspenseLoader />;

  /* --------------------------- UI --------------------------- */
  return (
    <>
      {/* Navbar fixa + SidebarSettings (offsets) */}
      <Navbar />
      <SidebarSettings userName={authUser?.name ?? ""} activeItem="security" />

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(authUser?.name)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Configurações</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Segurança e privacidade</h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">Acesso e credenciais</span>
              </div>

              <div className="divide-y divide-gray-200">
                <Row
                  label="Senha"
                  value={
                    <>
                      Última alteração:&nbsp;
                      {user?.last_password_change
                        ? format(new Date(user.last_password_change), "d 'de' MMM, yyyy", { locale: ptBR })
                        : "nunca"}
                    </>
                  }
                  action={
                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={openModal}
                    >
                      Alterar senha
                    </Button>
                  }
                />
              </div>
            </div>
          </section>
        </div>

        {/* ---------------------- Modal ---------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">Alterar senha</h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <Input
                  label="Senha atual"
                  name="current_password"
                  type="password"
                  value={pwData.current_password}
                  onChange={handleChange}
                  showTogglePassword
                  required
                />
                <Input
                  label="Nova senha"
                  name="new_password"
                  type="password"
                  value={pwData.new_password}
                  onChange={handleChange}
                  showTogglePassword
                  required
                />
                <Input
                  label="Confirmar nova senha"
                  name="confirm"
                  type="password"
                  value={pwData.confirm}
                  onChange={handleChange}
                  showTogglePassword
                  required
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ----------------------- Snackbar ----------------------- */}
      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={5000}
        onClose={() => setSnackBarMessage("")}
      >
        <Alert
          severity={
            typeof snackBarMessage === "string" &&
            snackBarMessage.includes("sucesso")
              ? "success"
              : "error"
          }
        >
          {snackBarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SecurityAndPrivacy;
