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
}

export function AppShell({
  children,
  onBack,
  onHome,
  onSettings,
  showBottomNavigation = true,
}: AppShellProps) {
  const { locale, t } = useI18n();

  return (
    <div className="app-shell" style={appShellTokenStyle}>
      <TopBrandBar locale={locale} title={t('app.title')} />
      <div className="app-shell__content">{children}</div>
      {showBottomNavigation ? (
        <BottomNavigation
          backLabel={t('navigation.back')}
          homeLabel={t('navigation.home')}
          onBack={onBack}
          onHome={onHome}
          onSettings={onSettings}
          settingsLabel={t('navigation.settings')}
        />
      ) : null}
    </div>
  );
}
