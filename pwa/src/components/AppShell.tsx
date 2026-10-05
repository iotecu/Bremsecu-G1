import React, {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useI18n } from '../i18n';
import { appShellTokenStyle } from '../theme';
import { BottomNavigation } from './BottomNavigation';
import { TopBrandBar } from './TopBrandBar';

const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

interface AppShellProps {
  readonly children: ReactNode;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onSettings: () => void;
  readonly showBottomNavigation?: boolean;
  readonly showTopBrandBar?: boolean;
  readonly wifiConnected?: boolean;
}

function viewportMetrics(): { scale: number; frameHeight: number } {
  if (typeof window === 'undefined') return { scale: 1, frameHeight: REFERENCE_HEIGHT };

  const scale = Math.min(
    1,
    Math.max(320 / REFERENCE_WIDTH, window.innerWidth / REFERENCE_WIDTH),
  );
  const frameHeight = Math.max(
    REFERENCE_HEIGHT,
    window.innerHeight / scale,
  );

  return { scale, frameHeight };
}

export function AppShell({
  children, onBack, onHome, onSettings,
  showBottomNavigation = true, showTopBrandBar = true, wifiConnected = false,
}: AppShellProps) {
  const { availableLocales, locale, setLocale, t } = useI18n();
  const [metrics, setMetrics] = useState(viewportMetrics);

  useLayoutEffect(() => {
    const update = () => setMetrics(viewportMetrics());
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  const { scale, frameHeight } = metrics;
  const frameStyle = {
    ...appShellTokenStyle,
    minHeight: `${frameHeight}px`,
    transform: `scale(${scale})`,
  } as CSSProperties;

  return (
    <div
      className="app-shell-viewport"
      data-reference-width={REFERENCE_WIDTH}
      data-reference-height={REFERENCE_HEIGHT}
      data-scale={scale}
      data-frame-height={frameHeight}
    >
      <div className="app-shell" style={frameStyle}>
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
    </div>
  );
}
