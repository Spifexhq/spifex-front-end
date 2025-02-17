/**
 * Navbar.tsx
 * 
 * This component renders a responsive navigation bar that adapts to mobile and desktop views.
 * 
 * Features:
 * - Supports a mobile drawer with smooth animations
 * - Provides user menu with outside click detection
 * - Uses permission-based navigation links (via `PermissionMiddleware`)
 * - Includes a simulated AI assistant modal
 * - Detects screen width to toggle mobile vs. desktop layout
 * - Closes user menu when clicking outside
 * 
 * Usage:
 * ```tsx
 * <Navbar />
 * ```
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { PermissionMiddleware } from '@/middlewares';
import { useAuthContext } from "@/contexts/useAuthContext";

import UserMenu from '@/components/UserMenu';
import SimulatedAI from '@/components/SimulatedAI';

const Navbar: React.FC = () => {
  // States for user menu, AI modal, and mobile drawer
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSimulatedAIOpen, setIsSimulatedAIOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const location = useLocation();
  const { isSuperUser, isSubscribed } = useAuthContext();

  // Detect if the device is in mobile mode (screen width < 640px)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to check if the current route is active
  const isActive = (path: string) => location.pathname === path;

  // Toggle Drawer ensuring User Menu is closed
  const handleDrawerToggle = () => {
    if (userMenuOpen) {
      setUserMenuOpen(false);
    }
    setDrawerOpen((prev) => !prev);
  };

  // Toggle User Menu ensuring Drawer is closed
  const handleUserMenuToggle = () => {
    if (drawerOpen) {
      setDrawerOpen(false);
    }
    setUserMenuOpen((prev) => !prev);
  };

  // Reference for UserMenu to detect outside clicks
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close UserMenu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers for Simulated AI modal
  const handleHelpClick = () => setIsSimulatedAIOpen(true);
  const handleSimulatedAIClose = () => setIsSimulatedAIOpen(false);

  return (
    <>
      {/* Top fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main flex container */}
          <div className="flex justify-between items-center h-16">
            
            {/* Left section: Mobile Menu Button + Logo */}
            <div className="flex items-center">
              
              {/* Mobile: Hamburger icon visible only on mobile */}
              {isMobile && (
                <button
                  onClick={handleDrawerToggle}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}

              {/* Logo (Visible on both mobile and desktop) */}
              <Link to="/cashflow" className="text-xl font-bold ml-2">
                Spifex
              </Link>
            </div>

            {/* Desktop: Navigation Links (hidden on mobile) */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                <PermissionMiddleware codeName="view_cash_flow_button" isPage={false}>
                  <Link
                    to="/cashflow"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/cashflow') ? 'text-orange-500 font-bold' : 'text-gray-800'
                    }`}
                  >
                    Fluxo de Caixa
                  </Link>
                </PermissionMiddleware>
                <PermissionMiddleware codeName="view_settled_button" isPage={false}>
                  <Link
                    to="/settled"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/settled') ? 'text-orange-500 font-bold' : 'text-gray-800'
                    }`}
                  >
                    Realizado
                  </Link>
                </PermissionMiddleware>
                {(isSubscribed || isSuperUser) && (
                  <PermissionMiddleware codeName="view_report_button" isPage={false}>
                    <Link
                      to="/reports"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        isActive('/reports') ? 'text-orange-500 font-bold' : 'text-gray-800'
                      }`}
                    >
                      Relatórios
                    </Link>
                  </PermissionMiddleware>
                )}
              </div>
            )}

            {/* User Menu Button (visible on both mobile and desktop) */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={handleUserMenuToggle}
                className="flex items-center justify-center px-4 py-2 rounded-md text-gray-600 hover:text-gray-800 text-sm font-medium focus:outline-none"
              >
                Menu
                <svg
                  className={`h-4 w-4 ml-2 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  role="none"
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="m12 6.662 9.665 8.59-1.33 1.495L12 9.337l-8.335 7.41-1.33-1.495L12 6.662Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {userMenuOpen && (
                <UserMenu onClose={() => setUserMenuOpen(false)} onHelpClick={handleHelpClick} />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Simulated AI Modal */}
      <SimulatedAI isOpen={isSimulatedAIOpen} onClose={handleSimulatedAIClose} />
    </>
  );
};

export default Navbar;
