/**
 * UserMenu.tsx
 * 
 * This component renders a dropdown menu for user-related actions.
 * 
 * Features:
 * - Provides links for company and personal settings
 * - Allows the user to configure notification preferences
 * - Opens the help section when requested
 * - Supports logging out with a redirect to the sign-in page
 * - Uses Tailwind CSS for styling and positioning
 * 
 * Usage:
 * ```tsx
 * <UserMenu onClose={handleClose} onHelpClick={handleHelpClick} />
 * ```
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/api';
import settingsIcon from '@/assets/Icons/userMenu/settings.svg';
import personalIcon from '@/assets/Icons/userMenu/enterprise-panel.svg';
import notificationsIcon from '@/assets/Icons/userMenu/notifications.svg';
import helpIcon from '@/assets/Icons/userMenu/help.svg';
import exitIcon from '@/assets/Icons/userMenu/exit.svg';

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
      className="user-menu absolute top-[85%] z-50 w-64 max-w-[calc(100vw-1rem)] bg-white 
                 shadow-lg rounded-md py-1 border-[0.5px] border-[#d6d6d6] right-2"
    >
      {/* Configurações da Empresa */}
      <Link
        to="/settings/company-settings"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Settings" src={settingsIcon} className="w-5 h-5" />
        <span className="ml-2">Configurações da Empresa</span>
      </Link>

      {/* Configurações Pessoais */}
      <Link
        to="/settings/personal"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Personal Settings" src={personalIcon} className="w-5 h-5" />
        <span className="ml-2">Configurações Pessoais</span>
      </Link>

      {/* Notificações */}
      <button
        onClick={onClose}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Notifications" src={notificationsIcon} className="w-5 h-5" />
        <span className="ml-2">Notificações</span>
      </button>

      {/* Ajuda */}
      <button
        onClick={() => {
          onClose();
          onHelpClick();
        }}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Help" src={helpIcon} className="w-5 h-5" />
        <span className="ml-2">Ajuda</span>
      </button>

      {/* Sair */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
      >
        <img alt="Exit" src={exitIcon} className="w-5 h-5" />
        <span className="ml-2">Sair</span>
      </button>
    </div>
  );
};

export default UserMenu;

