/* -------------------------------------------------------------------------- */
/*  File: src/pages/SecurityAndPrivacy.tsx                                    */
/* -------------------------------------------------------------------------- */

import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import Navbar            from "@/components/Navbar";
import SidebarSettings   from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input             from "@/components/Input";
import Button            from "@/components/Button";
import Snackbar          from "@/components/Snackbar";
import Alert             from "@/components/Alert";

import { api }             from "src/api/requests";
import { useAuthContext }  from "@/contexts/useAuthContext";
import { User }            from "src/models/auth";
import { validatePassword } from "@/utils/validatePassword";

/* -------------------------------------------------------------------------- */

const SecurityAndPrivacy = () => {
  const { user: authUser } = useAuthContext();

  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState<string | JSX.Element>("");

  const [pwData, setPwData] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });

  /* ------------------------ Handlers ------------------------- */
  const openModal  = () => setModalOpen(true);
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
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
      <Navbar />
      <SidebarSettings userName={authUser?.name ?? ""} activeItem="security" />
      <Outlet />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-3xl mx-auto p-8">
          <h2 className="text-xl font-semibold mb-6">Segurança e privacidade</h2>

          <div className="border rounded-lg divide-y">
            <div className="flex items-center justify-between py-4 px-4">
              <div>
                <p className="text-sm text-gray-500">Senha</p>
                <p className="text-base font-medium text-gray-900">
                  Última alteração:&nbsp;
                  {user?.last_password_change
                    ? format(
                        new Date(user.last_password_change),
                        "d 'de' MMM, yyyy",
                        { locale: ptBR }
                      )
                    : "nunca"}
                </p>
              </div>
              <Button variant="outline" onClick={openModal}>
                Alterar senha
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------- Modal ---------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Alterar senha</h3>
              <button
                className="text-2xl text-gray-400 hover:text-gray-700"
                onClick={closeModal}
              >
                &times;
              </button>
            </header>

            <form
              className="space-y-4"
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

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="cancel" type="button" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
