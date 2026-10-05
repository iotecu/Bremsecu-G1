import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import { getInitialLocale, I18nProvider } from '../i18n';
import { FirmwareRuntime } from '../services/runtime';
import { FirmwareRuntimeProvider } from '../services/runtime-react';
import { createScreenTestServices, type ScreenTestScenario } from './services';
import '../styles.css';
import '../screens/phase5/phase5.css';
import './screen-test.css';

const params = new URLSearchParams(location.search);
if (!params.has('visual')) { params.set('visual', '1'); history.replaceState(null, '', '?' + params.toString()); }
const screen = Number(params.get('screen') ?? 1);
const scenario = params.get('scenario');
const fixturesEnabled = ['pass', 'multi-fail', 'pending'].includes(scenario ?? '');
const runtime = fixturesEnabled ? new FirmwareRuntime(createScreenTestServices(screen === 8 ? 'iso12098_voltage' : 'iso7638_voltage', scenario as ScreenTestScenario)) : null;

const names = [
  'Giriş','Araç / Test Girişi','Yeni Araç Kaydı','Eski Kayıt Arama','ISO7638 Voltaj Seçimi','ISO7638 Voltaj Ölçümü',
  'ISO12098 Voltaj Seçimi','ISO12098 Voltaj Ölçümü','Pin10 Doğrulama','Pin11 Doğrulama','Pin12 Doğrulama',
  'Kablo Testi Seçimi','ISO7638 Kablo Seçimi','ISO7638 Kablo Ölçümü','ISO12098 Kablo Seçimi','ISO12098 Kablo Ölçümü',
  'CAN Seçimi','7638 Çekici CAN','7638 Dorse CAN','12098 Çekici CAN','12098 Dorse CAN',
  '7638 Çekici Güvenlik','7638 Çekici Direnç','7638 Dorse Güvenlik','7638 Dorse Direnç',
  '12098 Çekici Güvenlik','12098 Çekici Direnç','12098 Dorse Güvenlik','12098 Dorse Direnç',
  'Lamba Seçimi','Lamba Ölçümü','Dingil Güvenliği','Raporlar','Rapor Sonucu','Rapor Kaydet','Test Sonucu Kaydet','Ayarlar','Ayar Ayrıntısı','Batarya','Rapor Kaydı Arama',
];
function target(nextScreen: number, nextScenario = '') {
  const query = new URLSearchParams({ visual: '1', screen: String(nextScreen) });
  if (nextScenario) query.set('scenario', nextScenario);
  return '?' + query.toString();
}
const root = document.getElementById('root');
if (!root) throw new Error('Missing screen-test root');
createRoot(root).render(
  <I18nProvider initialLocale={getInitialLocale()}>
    <aside className="screen-test-controls" aria-label="Ekran test paneli">
      <strong>EKRAN TESTİ · TÜM DEĞERLER ÖRNEKTİR · GERÇEK ÖLÇÜM YOK</strong>
      <label>Ekran <select aria-label="Test ekranını seç" value={screen} onChange={(event) => { location.href = target(Number(event.target.value)); }}>
        {names.map((name, index) => <option value={index + 1} key={name}>{String(index + 1).padStart(2, '0')} — {name}</option>)}
      </select></label>
      <nav aria-label="Örnek voltaj senaryoları">
        <a href={target(screen === 8 ? 8 : 6, 'pass')}>PASS örneği</a>
        <a href={target(screen === 8 ? 8 : 6, 'multi-fail')}>Çoklu FAIL</a>
        <a href={target(screen === 8 ? 8 : 6, 'pending')}>Sınıflandırma bekliyor</a>
        <a href={target(1)}>Akışı baştan gez</a>
      </nav>
      <small>Seçili ekran: {String(screen).padStart(2, '0')} · Sayfa yenilenince örnek kayıt ve senaryo verileri sıfırlanır.</small>
    </aside>
    {runtime ? <FirmwareRuntimeProvider runtime={runtime}><App /></FirmwareRuntimeProvider> : <App />}
  </I18nProvider>,
);
