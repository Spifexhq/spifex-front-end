import './styles.css';

function Status404() {
  return (
    <>
      <head>
        <title>Status - 404</title>
      </head>

      <div className="container">
        <div className="main-content">
          <div className="image-container">
            <img alt="404" height="180" src="src/assets/Images/status/404.svg" />
          </div>
          <h2 className="title">Esta página não existe</h2>
          <h4 className="subtitle">
            Ela pode ter sido removida ou movida para outro endereço
          </h4>

          <div className="button-container">
            <a href="/cashflow" className="btn-outline">
              Voltar à página inicial
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

export default Status404;
