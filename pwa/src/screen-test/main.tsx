import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { getInitialLocale, I18nProvider } from '../i18n';
import { FirmwareRuntime } from '../services/runtime';
import { FirmwareRuntimeProvider } from '../services/runtime-react';
import { createScreenTestServices, type ScreenTestScenario } from './services';
import '../styles.css';
import '../screens/phase5/phase5.css';
const params = new URLSearchParams(location.search);
if (!params.has('visual')) { params.set('visual','1'); history.replaceState(null,'','?'+params); }
const scenario = params.get('scenario');
const runtime = new FirmwareRuntime(createScreenTestServices(Number(params.get('screen')) === 8 ? 'iso12098_voltage':'iso7638_voltage', ['pass','multi-fail','pending'].includes(scenario ?? '') ? scenario as ScreenTestScenario:'pass', { monitorHost:true, autoStart:params.has('screen') }));
const root = document.getElementById('root');
if (!root) throw new Error('Missing screen-test root');
createRoot(root).render(<I18nProvider initialLocale={getInitialLocale()}><FirmwareRuntimeProvider runtime={runtime}><App /></FirmwareRuntimeProvider></I18nProvider>);
