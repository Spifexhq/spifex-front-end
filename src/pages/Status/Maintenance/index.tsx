import React, { useEffect } from 'react';

import maintenance from '@/assets/Images/status/maintenance.svg';
import facebook from '@/assets/Images/status/facebook.svg';
import x from '@/assets/Images/status/x.svg';
import instagram from '@/assets/Images/status/instagram.svg';

const StatusMaintenance: React.FC = () => {
  useEffect(() => {
    document.title = 'Maintenance';
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center bg-white text-gray-800">
      <img src={maintenance} alt="Maintenance" className="w-72 mb-10 select-none pointer-events-none" />

      <h2 className="text-3xl font-semibold mb-2">O site está atualmente em manutenção</h2>

      <p className="text-gray-600 text-sm sm:text-base">
        Pedimos desculpas por qualquer inconveniente causado.
      </p>

      <hr className="w-full max-w-md border-t border-gray-200 my-10" />

      <div className="flex items-center justify-center space-x-6">
        <a
          href="https://www.facebook.com/spifexHQ"
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook"
        >
          <img src={facebook} alt="Facebook" className="w-6 h-6 select-none pointer-events-none" />
        </a>
        <a
          href="https://x.com/spifexHQ"
          target="_blank"
          rel="noopener noreferrer"
          title="Twitter"
        >
          <img src={x} alt="Twitter" className="w-6 h-6 select-none pointer-events-none" />
        </a>
        <a
          href="https://instagram.com/spifexhq"
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
        >
          <img src={instagram} alt="Instagram" className="w-6 h-6 select-none pointer-events-none" />
        </a>
      </div>
    </div>
  );
};

export default StatusMaintenance;
