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

interface UserMenuProps {
  // Function to close the user menu
  onClose: () => void;

  // Function to trigger the help section
  onHelpClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onClose, onHelpClick }) => {
  const navigate = useNavigate();
  const { handleSignOut } = useAuth();

  // Handles the user logout process and redirects to the sign-in page
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
      {/* Company Settings */}
      <Link
        to="/settings"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Settings" src="src/assets/Icons/userMenu/settings.svg" className="w-5 h-5" />
        <span className="ml-2">Company Settings</span>
      </Link>

      {/* Personal Settings */}
      <Link
        to="/enterprise"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Personal Settings" src="src/assets/Icons/userMenu/enterprise-panel.svg" className="w-5 h-5" />
        <span className="ml-2">Personal Settings</span>
      </Link>

      {/* Notification Preferences */}
      <button
        onClick={onClose}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Notifications" src="src/assets/Icons/userMenu/notifications.svg" className="w-5 h-5" />
        <span className="ml-2">Notification Preferences</span>
      </button>

      {/* Help Section */}
      <button
        onClick={() => {
          onClose();
          onHelpClick();
        }}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <img alt="Help" src="src/assets/Icons/userMenu/help.svg" className="w-5 h-5" />
        <span className="ml-2">Help</span>
      </button>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
      >
        <img alt="Exit" src="src/assets/Icons/userMenu/exit.svg" className="w-5 h-5" />
        <span className="ml-2">Logout</span>
      </button>
    </div>
  );
};

export default UserMenu;
