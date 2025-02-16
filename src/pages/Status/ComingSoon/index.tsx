import { useEffect, useState } from 'react';
import './styles.css';

interface TimeLeft {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

function StatusComingSoon() {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = +new Date(`2025-12-31T23:59:59`) - +new Date();
    let timeLeft: TimeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    // Atualiza o contador a cada segundo
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(timer);
  }, []);

  const timerComponents: JSX.Element[] = [];

  (Object.keys(timeLeft) as (keyof TimeLeft)[]).forEach((interval) => {
    if (timeLeft[interval] === undefined) {
      return;
    }

    timerComponents.push(
      <div className="timer-box" key={interval}>
        <h1 className="timer-number">{timeLeft[interval]}</h1>
        <h3 className="timer-label">{interval}</h3>
      </div>
    );
  });

  return (
    <>
      <head>
        <title>Status - Coming Soon</title>
      </head>

      <div className="container">
        <div className="main-content">
          <div className="text-center">
            <h1 className="title">Em breve</h1>
            <h3 className="subtitle">
              Estamos trabalhando nos últimos detalhes antes do nosso lançamento!
            </h3>

            <div className="image-container">
              <img
                alt="Coming Soon"
                height="200"
                src="src/assets/Images/status/coming-soon.svg"
              />
            </div>
          </div>

          <div className="timer-container">
            {timerComponents.length ? timerComponents : <>O tempo acabou!</>}
          </div>
        </div>
      </div>
    </>
  );
}

export default StatusComingSoon;
