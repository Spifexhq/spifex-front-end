// src/index.tsx
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { Provider } from 'react-redux';
import { store } from '@/redux';
import { BrowserRouter } from 'react-router-dom';
import "@/lib/i18n";
import i18n from '@/lib/i18n';
import { CookieProvider } from "@/contexts/CookieProvider";
import { ThemeProvider, applyThemeClass, resolveInitialTheme } from "@/theme/ThemeProvider";
import "@/shared/esc/initGlobalEsc";
import './index.css';

applyThemeClass(resolveInitialTheme());

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng || 'en';
});

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <Provider store={store}>
      <CookieProvider>
        <ThemeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </CookieProvider>
    </Provider>
  );
}
