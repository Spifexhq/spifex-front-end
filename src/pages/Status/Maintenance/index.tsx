import './styles.css';

function StatusMaintenance() {
  return (
    <>
      <head>
        <title>Status - Maintenance</title>
      </head>

      <div className="container">
        <div className="main-content">
          <div className="text-center">
            <h2 className="title">O site está atualmente em manutenção</h2>
            <h3 className="subtitle">Pedimos desculpas por qualquer inconveniente causado</h3>

            <div className="image-container">
              <img
                alt="Maintenance"
                height="250"
                src="src/assets/Images/status/maintenance.svg"
              />
            </div>
          </div>

          <hr className="divider" />

          <div className="social-media-container">
            <a
              href="https://www.facebook.com/spifexHQ"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              title="Facebook"
            >
              <img src="/static/icons/facebook.svg" alt="Facebook" />
            </a>

            <a
              href="https://x.com/spifexHQ"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              title="Twitter"
            >
              <img src="/static/icons/twitter.svg" alt="Twitter" />
            </a>

            <a
              href="https://instagram.com/spifexhq"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              title="Instagram"
            >
              <img src="/static/icons/instagram.svg" alt="Instagram" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default StatusMaintenance;
