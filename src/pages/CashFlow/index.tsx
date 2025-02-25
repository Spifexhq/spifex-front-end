import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import { CashFlowTable } from "@/components/CashFlowTable";
import Button from "@/components/Button"; // Supondo que você tenha esse componente de botão

const CashFlow = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado para armazenar filtros
  const [filters, setFilters] = useState({});

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (type: string) => {
    console.log("Abrindo modal do tipo:", type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 🔹 Função que ativa o filtro de exemplo
  const applyFilterExample = () => {
    setFilters({
      startDate: "2022-01-01",
      endDate: "2035-08-25",
      generalLedgerAccountId: [3,5],
      description: "",
      observation: "",
    });
  };

  return (
    <div className="flex">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={handleOpenModal}
        handleOpenTransferenceModal={() => null}
        mode="default"
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        {/* Navbar fixa no topo */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>

        {/* Conteúdo principal */}
        <div className="mt-[60px] px-10">
          {/* 🔥 Botão para aplicar filtro de exemplo */}
          <div className="mb-4 flex justify-end">
            <Button
              variant="primary"
              onClick={applyFilterExample}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              Aplicar Filtro (Exemplo)
            </Button>
          </div>

          {/* Tabela de fluxo de caixa, agora recebendo os filtros como prop */}
          <CashFlowTable filters={filters} />
        </div>

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} />
      </div>
    </div>
  );
};

export default CashFlow;
