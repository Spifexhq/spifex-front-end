import React, { useRef, useEffect } from 'react';
import { PermissionMiddleware } from '@/middlewares';

interface SidebarProps {
  isOpen: boolean;
  handleOpenModal: (type: string) => void;
  handleOpenTransferenceModal: () => void;
  toggleSidebar: () => void;
  mode: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  handleOpenModal,
  handleOpenTransferenceModal,
  toggleSidebar,
  mode,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        toggleSidebar();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  return (
    <nav
      ref={sidebarRef}
      aria-label="Sidebar de Navegação"
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] z-10000 bg-white flex flex-col transition-all duration-300 border-r border-gray-200
        ${isOpen ? 'w-60' : 'w-16'}
        overflow-hidden`}
    >
      <div className="flex flex-col flex-grow p-3 space-y-2 select-none">
        {mode !== 'settled' && (
          <>
            <PermissionMiddleware codeName="add_cash_flow_entries">
              <PermissionMiddleware codeName="view_credit_modal_button">
                <button
                  onClick={() => handleOpenModal('credit')}
                  className="flex items-center justify-start bg-white rounded-lg transition-colors duration-200 hover:bg-gray-100 w-full p-1"
                >
                  <img src="/static/images/navbar/credit.svg" alt="" className="w-8 h-8 min-w-[32px] min-h-[32px]" />
                  {isOpen && <span className="ml-2">Recebimentos</span>}
                </button>
              </PermissionMiddleware>
            </PermissionMiddleware>

            <PermissionMiddleware codeName="view_debit_modal_button">
              <button
                onClick={() => handleOpenModal('debit')}
                className="flex items-center justify-start bg-white rounded-lg transition-colors duration-200 hover:bg-gray-100 w-full p-1"
              >
                <img src="/static/images/navbar/debit.svg" alt="" className="w-8 h-8 min-w-[32px] min-h-[32px]" />
                {isOpen && <span className="ml-2">Pagamentos</span>}
              </button>
            </PermissionMiddleware>

            <PermissionMiddleware codeName="add_transference">
              <button
                onClick={handleOpenTransferenceModal}
                className="flex items-center justify-start bg-white rounded-lg transition-colors duration-200 hover:bg-gray-100 w-full p-1"
              >
                <img src="/static/images/navbar/transference.svg" alt="" className="w-8 h-8 min-w-[32px] min-h-[32px]" />
                {isOpen && <span className="ml-2">Transferências</span>}
              </button>
            </PermissionMiddleware>
          </>
        )}
      </div>

      <div className="flex justify-center items-center w-full p-3">
        <button
          onClick={toggleSidebar}
          aria-label={isOpen ? 'Fechar Sidebar' : 'Abrir Sidebar'}
          className="border border-gray-300 hover:bg-gray-100 rounded-full p-1 transition-all duration-300 ml-auto"
        >
          {/* SVG inline, sem precisar de componente externo */}
          <svg
            className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
