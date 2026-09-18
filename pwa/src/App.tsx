import React, { useState } from 'react';
import { AppShell } from './components';
import {
  activateServiceRecord, closeOverlay, completeAxleLiftSafety, completeIso12098PinValidation, confirmCanSafety,
  continueFromLogin, goBack, goHome, goSettings, initialNavigationState, moveCanSubSlide, moveMainCard,
  openAxleLiftSafety, openCableBranch, openCanSafety, openCommonSaveOverlay, openEntryOldRecordSearch,
  openIso12098PinValidation, openIso12098VoltageMeasurement, openIso7638VoltageMeasurement, openLampMeasurement,
  openNewVehicleForm, openReportFromOldRecordSearch, openReportSave, openReports, openSettingsDetail, retestFromReport, startCableMeasurement,
} from './navigation';
import {
  ConditionalValidationModal, LoginScreen, MainCarouselScreen, NewVehicleRecordScreen,
  RecordSearchModal, VehicleEntryScreen, VoltageMeasurementScreen,
} from './screens/phase5/group-a';
import {
  CableMeasurementScreen, CableRootCard, CableSelectionScreen, CanTerminationRootCard,
  TerminationResultScreen, TerminationSafetyScreen,
} from './screens/phase5/group-b';
import {
  AxleLiftSafetyScreen, CommonSaveModal, LampMeasurementScreen, LampRootCard,
  ReportResultScreen, ReportSaveModal, ReportsRootCard,
} from './screens/phase5/group-c';
import {
  BatteryStatusCard, SettingsDetailScreen, SettingsRootCard,
} from './screens/phase5/group-d';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
}

function canRouteInfo(route: string): {
  iso: '7638' | '12098';
  side: 'tractor' | 'trailer';
  socket: 1 | 2 | 3 | 4;
} | null {
  switch (route) {
    case 'iso7638-can-tractor-safety':
    case 'iso7638-can-tractor-resistance':
      return { iso: '7638', side: 'tractor', socket: 1 };
    case 'iso12098-can-tractor-safety':
    case 'iso12098-can-tractor-resistance':
      return { iso: '12098', side: 'tractor', socket: 2 };
    case 'iso7638-can-trailer-safety':
    case 'iso7638-can-trailer-resistance':
      return { iso: '7638', side: 'trailer', socket: 3 };
    case 'iso12098-can-trailer-safety':
    case 'iso12098-can-trailer-resistance':
      return { iso: '12098', side: 'trailer', socket: 4 };
    default:
      return null;
  }
}

export default function App() {
  const [navigation, setNavigation] = useState(initialNavigationState);
  const wifiConnected = isVisualDevelopment() && navigation.route !== 'login';

  const body = (() => {
    switch (navigation.route) {
      case 'login':
        return <LoginScreen onContinue={() => setNavigation(continueFromLogin)} />;
      case 'vehicle-entry':
        return <VehicleEntryScreen onNewVehicle={() => setNavigation(openNewVehicleForm)} onOldRecord={() => setNavigation(openEntryOldRecordSearch)} />;
      case 'new-vehicle-form':
        return <NewVehicleRecordScreen onSave={() => setNavigation(activateServiceRecord)} />;
      case 'test-carousel':
        if (navigation.activeCardIndex === 2) {
          return <CableRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onOpenBranch={(branch) => setNavigation((state) => openCableBranch(state, branch))} />;
        }
        if (navigation.activeCardIndex === 3) {
          return <CanTerminationRootCard canSubSlide={navigation.canSubSlide} onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onMoveSub={(direction) => setNavigation((state) => moveCanSubSlide(state, direction))} onStart={() => setNavigation(openCanSafety)} />;
        }
        if (navigation.activeCardIndex === 4) {
          return <LampRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onStart={() => setNavigation(openLampMeasurement)} />;
        }
        if (navigation.activeCardIndex === 5) {
          return <ReportsRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onOpen={() => setNavigation(openReports)} />;
        }
        if (navigation.activeCardIndex === 6) {
          return <SettingsRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onOpen={() => setNavigation(openSettingsDetail)} />;
        }
        if (navigation.activeCardIndex === 7) {
          return <BatteryStatusCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} />;
        }
        return (
          <MainCarouselScreen
            activeCardIndex={navigation.activeCardIndex}
            onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))}
            onStart={() => {
              if (navigation.activeCardIndex === 0) setNavigation(openIso7638VoltageMeasurement);
              if (navigation.activeCardIndex === 1) setNavigation(openIso12098VoltageMeasurement);
            }}
          />
        );
      case 'iso7638-voltage-measurement':
        return <VoltageMeasurementScreen iso="7638" onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso12098-voltage-measurement':
        return <VoltageMeasurementScreen iso="12098" onConditionalPin={(pin) => setNavigation((state) => openIso12098PinValidation(state, pin))} onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso12098-pin10-validation':
      case 'iso12098-pin11-validation':
      case 'iso12098-pin12-validation': {
        const pin = navigation.route === 'iso12098-pin10-validation' ? 10 : navigation.route === 'iso12098-pin11-validation' ? 11 : 12;
        return (
          <>
            <VoltageMeasurementScreen iso="12098" onConditionalPin={() => undefined} onSave={() => undefined} />
            <ConditionalValidationModal pin={pin} onUnavailable={() => setNavigation(completeIso12098PinValidation)} onConfirm={() => setNavigation(completeIso12098PinValidation)} />
          </>
        );
      }
      case 'iso7638-cable-select':
        return <CableSelectionScreen iso="7638" onStart={() => setNavigation(startCableMeasurement)} />;
      case 'iso12098-cable-select':
        return <CableSelectionScreen iso="12098" onStart={() => setNavigation(startCableMeasurement)} />;
      case 'iso7638-cable-measurement':
        return <CableMeasurementScreen iso="7638" onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso12098-cable-measurement':
        return <CableMeasurementScreen iso="12098" onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso7638-can-tractor-safety':
      case 'iso12098-can-tractor-safety':
      case 'iso7638-can-trailer-safety':
      case 'iso12098-can-trailer-safety': {
        const info = canRouteInfo(navigation.route)!;
        return <TerminationSafetyScreen {...info} onContinue={() => setNavigation(confirmCanSafety)} />;
      }
      case 'iso7638-can-tractor-resistance':
      case 'iso12098-can-tractor-resistance':
      case 'iso7638-can-trailer-resistance':
      case 'iso12098-can-trailer-resistance': {
        const info = canRouteInfo(navigation.route)!;
        return <TerminationResultScreen iso={info.iso} side={info.side} onSave={() => setNavigation(openCommonSaveOverlay)} />;
      }
      case 'lamp-test-measurement':
        return <LampMeasurementScreen onAxleLift={() => setNavigation(openAxleLiftSafety)} onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'axle-lift-safety':
        return <AxleLiftSafetyScreen onCancel={() => setNavigation(completeAxleLiftSafety)} onConfirm={() => setNavigation(completeAxleLiftSafety)} />;
      case 'report-result':
        return <ReportResultScreen onRetest={() => setNavigation(retestFromReport)} onSaveReport={() => setNavigation(openReportSave)} />;
      case 'settings-detail':
        return <SettingsDetailScreen onSave={() => setNavigation(goHome)} />;
      default:
        return <MainCarouselScreen activeCardIndex={navigation.activeCardIndex} onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onStart={() => undefined} />;
    }
  })();

  return (
    <AppShell
      onBack={() => setNavigation(goBack)}
      onHome={() => setNavigation(goHome)}
      onSettings={() => setNavigation(goSettings)}
      showBottomNavigation
      showTopBrandBar={navigation.route !== 'login'}
      wifiConnected={wifiConnected}
    >
      {body}
      {navigation.overlay?.kind === 'old-record-search' ? (
        <RecordSearchModal
          context={navigation.overlay.origin === 'reports' ? 'reports' : 'entry'}
          onClose={() => setNavigation(closeOverlay)}
          onInspect={navigation.overlay.origin === 'reports' ? () => setNavigation(openReportFromOldRecordSearch) : undefined}
          onRetest={() => setNavigation(activateServiceRecord)}
        />
      ) : null}
      {navigation.overlay?.kind === 'report-save' ? (
        <ReportSaveModal onCancel={() => setNavigation(closeOverlay)} onSave={() => setNavigation(closeOverlay)} />
      ) : null}
      {navigation.overlay?.kind === 'report-save-common' ? (
        <CommonSaveModal
          onReturn={() => setNavigation(closeOverlay)}
          onExitWithoutSave={() => setNavigation(goHome)}
          onSaveAndExit={() => setNavigation(goHome)}
        />
      ) : null}
    </AppShell>
  );
}
