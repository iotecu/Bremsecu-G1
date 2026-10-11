import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyDocumentLocale, getInitialLocale, I18nProvider } from './i18n';
import {
  createBrowserFirmwareRuntime,
  FirmwareRuntimeProvider,
} from './services/runtime-react';
import { registerServiceWorker } from './pwa/register-service-worker';
import './styles.css';
import './screens/phase5/phase5.css';

const initialLocale = getInitialLocale();
applyDocumentLocale(initialLocale);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Application root element was not found.');
}

const firmwareRuntime = createBrowserFirmwareRuntime();
const visualParams = new URLSearchParams(window.location.search);
const visualHarness =
  (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
  visualParams.get('visual') === '1';

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider initialLocale={initialLocale}>
      {visualHarness ? (
        <App />
      ) : (
        <FirmwareRuntimeProvider runtime={firmwareRuntime}>
          <App />
        </FirmwareRuntimeProvider>
      )}
    </I18nProvider>
  </StrictMode>,
);

registerServiceWorker();
