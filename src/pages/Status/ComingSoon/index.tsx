import { useEffect, useState } from 'react';

import comingSoon from '@/assets/Images/status/coming-soon.svg';
import facebook from '@/assets/Images/status/facebook.svg';
import x from '@/assets/Images/status/x.svg';
import instagram from '@/assets/Images/status/instagram.svg';

interface TimeLeft {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

const StatusComingSoon: React.FC = () => {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = +new Date('2025-12-31T23:59:59') - +new Date();
    let timeLeft: TimeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    document.title = 'Status - Coming Soon';

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timerComponents = (Object.keys(timeLeft) as (keyof TimeLeft)[]).map((interval) => {
    if (timeLeft[interval] === undefined) return null;

    return (
      <div
        key={interval}
        className="flex flex-col items-center bg-gray-100 rounded-lg px-4 py-3 shadow text-gray-700"
      >
        <h1 className="text-3xl font-bold">{timeLeft[interval]}</h1>
        <span className="text-xs uppercase tracking-widest">{interval}</span>
      </div>
    );
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center bg-white text-gray-800">
      <img src={comingSoon} alt="Coming Soon" className="w-64 mb-10" />

      <h1 className="text-4xl font-bold mb-2">Em breve</h1>

      <p className="text-gray-600 mb-6 text-sm sm:text-base max-w-lg">
        Estamos trabalhando nos últimos detalhes antes do nosso lançamento!
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {timerComponents.length > 0 ? (
          timerComponents
        ) : (
          <p className="col-span-4 text-red-500">O tempo acabou!</p>
        )}
      </div>

      <a
        href="/cashflow"
        className="inline-block px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
      >
        Voltar à página anterior
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

export default StatusComingSoon;
