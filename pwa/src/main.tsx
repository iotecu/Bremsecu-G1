import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyDocumentLocale, getInitialLocale, I18nProvider } from './i18n';
import './styles.css';
import './screens/phase5/phase5.css';

const initialLocale = getInitialLocale();
applyDocumentLocale(initialLocale);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Application root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider initialLocale={initialLocale}>
      <App />
    </I18nProvider>
  </StrictMode>,
);
