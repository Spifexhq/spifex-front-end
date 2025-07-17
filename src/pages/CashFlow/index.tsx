import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import CashFlowTable from "@/components/Table/CashFlowTable";
import Filter, { FilterData } from "@/components/Filter";
import BanksTable from "src/components/Table/BanksTable";
import { ModalType } from "@/components/Modal/Modal.types";

const CashFlow = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);

  const [filters, setFilters] = useState<FilterData>({});

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (type: ModalType) => {
    console.log("Abrindo modal do tipo:", type);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleApplyFilters = (newFilters: FilterData) => {
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

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-16"
        }`}
      >
        {/* Fixed Navbar */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>

        {/* Push main content below the fixed Navbar */}
        <div className="mt-[80px] px-10">
          {/* Filter + BanksTable side by side */}
          <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
            {/* Filter on the left */}
            <div className="flex-1 min-w-[250px]">
              <Filter onApply={handleApplyFilters} />
            </div>
            {/* BanksTable on the right */}
            <div className="flex-1 min-w-[250px]">
              <BanksTable selectedBankIds={filters.banksId} />
            </div>
          </div>

          {/* CashFlow Table */}
          <CashFlowTable filters={filters} />
        </div>

        {modalType && (
          <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            type={modalType}
          />
        )}
      </div>
    </div>
  );
};

export default CashFlow;
