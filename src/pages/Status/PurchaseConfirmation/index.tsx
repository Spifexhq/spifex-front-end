// src/pages/Status/PurchaseConfirmation/index.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { request } from "@/lib/http";
import { useAuth } from "@/api";

import Snackbar from "src/components/ui/Snackbar";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Button from "src/components/ui/Button";

type ToastSeverity = "success" | "error" | "info" | "warning";

interface PurchaseDetails {
  item: string;
  amount: string;
  date: string;
  transactionId: string;
}

const fmtDate = (epochSecondsAsString: string, locale = navigator.language) => {
  const n = Number(epochSecondsAsString);
  if (!Number.isFinite(n)) return "—";
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
};

const PurchaseConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleInitUser } = useAuth();

  const [toast, setToast] = useState<{ message: React.ReactNode; severity: ToastSeverity } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const sessionId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get("session_id");
  }, [location.search]);

  useEffect(() => {
    document.title = "Compra Confirmada";
  }, []);

  useEffect(() => {
    const fetchPurchaseDetails = async () => {
      if (!sessionId) {
        setToast({ message: "Sessão inválida.", severity: "error" });
        setPurchaseDetails(null);
        setIsFetching(false);
        return;
      }

      setIsFetching(true);

      try {
        const res = await request<{ purchase_details: PurchaseDetails }>(
          "billing/purchase-details/",
          "GET",
          { session_id: sessionId },
        );

        const details = res.data?.purchase_details;

        if (!details) {
          setToast({ message: "Não foi possível recuperar os detalhes da compra.", severity: "error" });
          setPurchaseDetails(null);
          return;
        }

        setPurchaseDetails(details);

        await handleInitUser();
      } catch (err) {
        console.error("Erro ao buscar detalhes da compra:", err);

        const msg =
          err instanceof Error
            ? err.message
            : "Erro ao recuperar detalhes da compra.";

        setToast({ message: msg, severity: "error" });
        setPurchaseDetails(null);
      } finally {
        setIsFetching(false);
      }
    };

    fetchPurchaseDetails();
  }, [sessionId, handleInitUser]);

  const handleRedirect = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
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
        <TopProgress active={true} variant="center" />
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
            <Button variant="outline" onClick={() => navigate("/")}>
              Ir para início
            </Button>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
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

  const purchaseDate = fmtDate(purchaseDetails.date);

  return (
    <div className="flex flex-col bg-white">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">

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
                <span className="text-gray-900">{purchaseDate}</span>
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
                {isLoading ? "Carregando..." : "Voltar"}
              </Button>
            </div>
          </div>
        </div>
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
