import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/api';

interface UserMenuProps {
  onClose: () => void;
  onHelpClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onClose, onHelpClick }) => {
  const navigate = useNavigate();
  const { handleSignOut } = useAuth();

  const handleLogout = () => {
    handleSignOut();
    onClose();
    setTimeout(() => {
      navigate('/signin');
    }, 100);
  };

  return (
    <div
      className={
        'user-menu absolute top-[85%] z-50 w-64 max-w-[calc(100vw-1rem)] bg-white ' +
        'shadow-lg rounded-md py-1 border-[0.5px] border-[#d6d6d6] ' +
        'right-2'
      }
    >
      <Link
        to="/settings"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Settings" src="src/assets/Icons/userMenu/settings.svg" className="w-5 h-5" />
        <span className="ml-2">Configurações da Empresa</span>
      </Link>
      <Link
        to="/enterprise"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Personal Settings" src="src/assets/Icons/userMenu/enterprise-panel.svg" className="w-5 h-5" />
        <span className="ml-2">Configurações Pessoais</span>
      </Link>
      <button
        onClick={onClose}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Notifications" src="src/assets/Icons/userMenu/notifications.svg" className="w-5 h-5" />
        <span className="ml-2">Preferências de Notificação</span>
      </button>
      <button
        onClick={() => {
          onClose();
          onHelpClick();
        }}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Help" src="src/assets/Icons/userMenu/help.svg" className="w-5 h-5" />
        <span className="ml-2">Ajuda</span>
      </button>
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
      >
        <img alt="Exit" src="src/assets/Icons/userMenu/exit.svg" className="w-5 h-5" />
        <span className="ml-2">Sair</span>
      </button>
    </div>
  );
};

export default UserMenu;
