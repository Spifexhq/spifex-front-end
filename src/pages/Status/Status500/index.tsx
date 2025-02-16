import './styles.css';

function Status500() {
  return (
    <>
      <head>
        <title>Status - 500</title>
      </head>

      <div className="container">
        <div className="main-content">
          <div className="image-container">
            <img
              alt="500"
              height="260"
              src="src/assets/Images/status/500.svg"
            />
          </div>

          <h2 className="title">
            Houve um erro, por favor tente novamente mais tarde
          </h2>

          <h4 className="subtitle">
            O servidor encontrou um erro interno e não pôde completar sua solicitação
          </h4>

          <div className="button-container">
            <a href="/cashflow" className="btn-contained">
              Voltar
            </a>
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
    </>
  );
}

export default Status500;
