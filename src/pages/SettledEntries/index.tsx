import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Modal } from "@/components/Modal";
import SettledEntriesTable from "@/components/Table/SettledEntriesTable";
import Filter, { FilterData } from "@/components/Filter";
import BanksTable from "src/components/Table/BanksTable";
import { ModalType } from "@/components/Modal/Modal.types";
import { Entry } from '@/models/Entries';

const Settled = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const [filters, setFilters] = useState<FilterData>({});

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (type: ModalType) => {
    console.log("Abrindo modal do tipo:", type);
    setModalType(type);
    setIsModalOpen(true);
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

          {/* Settled Entries Table */}
          <SettledEntriesTable filters={filters} bankIds={filters.banksId} />
        </div>

        {modalType && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingEntry(null);
            }}
            type={modalType}
            initialEntry={editingEntry}
            onSave={() => {
              setIsModalOpen(false);
              setEditingEntry(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Settled;
