import ReactDOM from 'react-dom/client';
import { App } from './App';
import { Provider } from 'react-redux';
import { store } from '@/redux';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

// Detect browser language
const browserLang = navigator.language || navigator.languages[0];

// Set 'en' for English or 'pt-BR' for Brazilian Portuguese
const lang = browserLang.startsWith('pt') ? 'pt-BR' : 'en';

// Update the lang attribute in HTML
document.documentElement.lang = lang;

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );
}
