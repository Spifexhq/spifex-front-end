import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import CashFlowTable from "@/components/Table/CashFlowTable";
import Filter, { FilterData } from "@/components/Filter";

// Make sure your Table's prop type expects `filters` of type `CashFlowFilters`
const CashFlow = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Store filters in the parent
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

  // Receives new filters from child and updates state
  const handleApplyFilters = (newFilters: FilterData) => {
    // FilterData is compatible with CashFlowFilters if they share the same fields
    setFilters(newFilters);
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

      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-16"
        }`}
      >
        {/* Navbar fixa no topo */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>

        {/* Conteúdo principal */}
        <div className="mt-[60px] px-10">
          {/* Our new Filter Card */}
          <Filter onApply={handleApplyFilters} />

          {/* Tabela de fluxo de caixa, agora recebendo os filters do estado */}
          <CashFlowTable filters={filters} />
        </div>

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} />
      </div>
    </div>
  );
};

export default CashFlow;
