import React, { useState } from 'react';
import { AppShell } from './components';
import {
  activateServiceRecord, closeOverlay, completeIso12098PinValidation, continueFromLogin,
  goBack, goHome, goSettings, initialNavigationState, moveMainCard, openEntryOldRecordSearch,
  openIso12098PinValidation, openIso12098VoltageMeasurement, openIso7638VoltageMeasurement, openNewVehicleForm,
} from './navigation';
import {
  ConditionalValidationModal, LoginScreen, MainCarouselScreen, NewVehicleRecordScreen,
  RecordSearchModal, VehicleEntryScreen, VoltageMeasurementScreen,
} from './screens/phase5/group-a';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
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
        return <VoltageMeasurementScreen iso="7638" onSave={() => undefined} />;
      case 'iso12098-voltage-measurement':
        return <VoltageMeasurementScreen iso="12098" onConditionalPin={(pin) => setNavigation((state) => openIso12098PinValidation(state, pin))} onSave={() => undefined} />;
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
        <RecordSearchModal onClose={() => setNavigation(closeOverlay)} onRetest={() => setNavigation(activateServiceRecord)} />
      ) : null}
    </AppShell>
  );
}
