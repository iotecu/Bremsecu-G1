import React, { type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { appShellTokenStyle } from '../theme';
import { BottomNavigation } from './BottomNavigation';
import { TopBrandBar } from './TopBrandBar';

interface AppShellProps {
  readonly children: ReactNode;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onSettings: () => void;
  readonly showBottomNavigation?: boolean;
  readonly showTopBrandBar?: boolean;
  readonly wifiConnected?: boolean;
}

export function AppShell({
  children, onBack, onHome, onSettings,
  showBottomNavigation = true, showTopBrandBar = true, wifiConnected = false,
}: AppShellProps) {
  const { availableLocales, locale, setLocale, t } = useI18n();
  return (
    <div className="app-shell" style={appShellTokenStyle}>
      <TopBrandBar
        availableLocales={availableLocales}
        compact={!showTopBrandBar}
        locale={locale}
        onLocaleChange={setLocale}
        title={t('app.title')}
        wifiConnected={wifiConnected}
      />
      <div className="app-shell__content">{children}</div>
      {showBottomNavigation ? (
        <BottomNavigation
          backLabel={t('navigation.back')} homeLabel={t('navigation.home')}
          onBack={onBack} onHome={onHome} onSettings={onSettings} settingsLabel={t('navigation.settings')}
        />
      ) : null}
    </div>
  );
}
