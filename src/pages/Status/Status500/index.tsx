import React, { useEffect } from 'react';
import error500 from '@/assets/Images/status/500.svg';
import facebook from '@/assets/Images/status/facebook.svg';
import x from '@/assets/Images/status/x.svg';
import instagram from '@/assets/Images/status/instagram.svg';

const Status500: React.FC = () => {
  useEffect(() => {
    document.title = 'Status - 500';
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center bg-white text-gray-800">
      <img src={error500} alt="500" className="w-72 mb-8" />

      <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
        Houve um erro, por favor tente novamente mais tarde
      </h2>

      <p className="text-gray-600 mb-6 text-sm sm:text-base max-w-md">
        O servidor encontrou um erro interno e não pôde completar sua solicitação.
      </p>

      <a
        href="/cashflow"
        className="inline-block px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
      >
        Voltar à página inicial
      </a>

      <hr className="w-full max-w-md border-t border-gray-200 my-10" />

      <div className="flex items-center justify-center space-x-6">
        <a
          href="https://www.facebook.com/spifexHQ"
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook"
        >
          <img src={facebook} alt="Facebook" className="w-6 h-6" />
        </a>
        <a
          href="https://x.com/spifexHQ"
          target="_blank"
          rel="noopener noreferrer"
          title="Twitter"
        >
          <img src={x} alt="Twitter" className="w-6 h-6" />
        </a>
        <a
          href="https://instagram.com/spifexhq"
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
        >
          <img src={instagram} alt="Instagram" className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
};

export default Status500;
