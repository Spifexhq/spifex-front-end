import { useState } from "react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Modal from '@/components/Modal';
import { CashFlowTable } from "@/components/CashFlowTable";

const CashFlow = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (type: string) => {
    console.log('Abrindo modal do tipo:', type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={handleOpenModal}
        handleOpenTransferenceModal={() => null}
        mode="default"
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        {/* Navbar fixa no topo */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>

        {/* Conteúdo com rolagem abaixo da Navbar */}
        <div className="mt-[60px] h-[calc(100vh-60px)] overflow-y-auto px-8">
          <div className="mt-30">
              <CashFlowTable />
          </div>
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
        </div>
    </div>
  );
};

export default CashFlow;
