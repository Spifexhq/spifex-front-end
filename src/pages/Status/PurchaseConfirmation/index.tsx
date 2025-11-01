import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuth, apiRequest } from "@/api";
import Snackbar from "src/components/ui/Snackbar";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import logo from "@/assets/Icons/Logo/logo-black.svg";
import bgImage from "@/assets/Images/background/purchase-success.svg";
import Button from "src/components/ui/Button";

interface PurchaseDetails {
  item: string;
  amount: string;
  date: string;          // epoch seconds (string)
  transactionId: string;
}

const PurchaseConfirmation: React.FC = () => {
  useEffect(() => {
    document.title = "Confirmação de Compra";
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { handleInitUser } = useAuth();

  const [toast, setToast] = useState<{ message: React.ReactNode; severity: "success" | "error" | "info" | "warning" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const query = new URLSearchParams(location.search);
  const sessionId = query.get("session_id");

  useEffect(() => {
    document.title = "Compra Confirmada";

    const fetchPurchaseDetails = async () => {
      if (!sessionId) {
        setToast({ message: "Sessão inválida.", severity: "error" });
        setIsFetching(false);
        return;
      }

      try {
        const response = await apiRequest<{ purchase_details: PurchaseDetails }>(
          "payments/get-purchase-details/",
          "GET",
          { session_id: sessionId },
          true
        );

        if (response.status === "error") {
          setToast({ message: response.message || "Erro ao recuperar detalhes da compra.", severity: "error" });
        } else if (response.data?.purchase_details) {
          setPurchaseDetails(response.data.purchase_details);
          await handleInitUser();
        } else {
          setToast({ message: "Não foi possível recuperar os detalhes da compra.", severity: "error" });
        }
      } catch (err) {
        console.error("Erro ao buscar detalhes da compra:", err);
        setToast({ message: "Erro ao recuperar detalhes da compra.", severity: "error" });
      } finally {
        setIsFetching(false);
      }
    };

    fetchPurchaseDetails();
  }, [sessionId, handleInitUser]);

  const handleRedirect = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate("/settings/subscription-management");
    } catch (err) {
      console.error("Erro ao redirecionar:", err);
      setToast({ message: "Ocorreu um erro ao redirecionar. Tente novamente.", severity: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <TopProgress active={true} variant='center' />
      </div>
    );
  }

  if (!purchaseDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-md p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Não foi possível confirmar sua compra</h1>
          <p className="text-sm text-gray-600 mb-4">Verifique o link ou tente novamente mais tarde.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Ir para início</Button>
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        </div>

        <Snackbar
          open={!!toast}
          onClose={() => setToast(null)}
          autoHideDuration={6000}
          message={toast?.message}
          severity={toast?.severity ?? "info"}
          anchor={{ vertical: "bottom", horizontal: "center" }}
          showCloseButton
          pauseOnHover
        />
      </div>
    );
  }

  const purchaseDate = new Date(Number(purchaseDetails.date) * 1000);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left side */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <a href="https://spifex.com" aria-label="Ir para o site da Spifex">
              <img src={logo} alt="Spifex" className="h-10 mx-auto" />
            </a>
          </div>

          <div className="bg-white rounded-md border border-gray-200 p-6">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Assinatura Confirmada!
            </h1>

            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-700">
                <span className="font-medium">Item:</span>
                <span className="text-gray-900">{purchaseDetails.item}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span className="font-medium">Valor:</span>
                <span className="text-gray-900">{purchaseDetails.amount}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span className="font-medium">Data:</span>
                <span className="text-gray-900">
                  {isNaN(purchaseDate.getTime())
                    ? "—"
                    : purchaseDate.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span className="font-medium">ID da Transação:</span>
                <span className="text-gray-900">{purchaseDetails.transactionId}</span>
              </div>
            </div>

            <div className="mt-8">
              <Button
                onClick={handleRedirect}
                disabled={isLoading}
                className="w-full h-12"
                aria-label="Voltar para gerenciamento de assinatura"
              >
                {isLoading ? <TopProgress active={true} variant='center' /> : "Voltar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side image */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-6">
        <img
          src={bgImage}
          alt="Compra confirmada"
          className="max-h-[650px] w-auto object-contain select-none pointer-events-none"
        />
      </div>

      {/* Snackbar */}
      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={6000}
        message={toast?.message}
        severity={toast?.severity ?? "info"}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        showCloseButton
        pauseOnHover
      />
    </div>
  );
};

export default PurchaseConfirmation;
