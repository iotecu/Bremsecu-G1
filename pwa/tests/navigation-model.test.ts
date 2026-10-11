import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAN_SUB_STATE_KEYS,
  MAIN_CARD_KEYS,
  activateServiceRecord,
  closeOverlay,
  completeAxleLiftSafety,
  completeIso12098PinValidation,
  confirmCanSafety,
  continueFromLogin,
  enterTests,
  goBack,
  goHome,
  goSettings,
  initialNavigationState,
  moveCanSubSlide,
  moveMainCard,
  openAxleLiftSafety,
  openCanSafety,
  openCommonSaveOverlay,
  openEntryOldRecordSearch,
  openIso12098PinValidation,
  openIso12098VoltageMeasurement,
  openReports,
  openSettingsDetail,
  setCanSubSlide,
  setMainCard,
} from '../src/navigation/model';

test('authority order is encoded exactly for main and nested carousels', () => {
  assert.deepEqual(MAIN_CARD_KEYS, [
    'iso7638-voltage',
    'iso12098-voltage',
    'cable-test',
    'can-termination',
    'lamp-axle-lift',
    'reports',
    'settings',
    'battery-status',
  ]);
  assert.deepEqual(CAN_SUB_STATE_KEYS, [
    'tractor-iso7638',
    'tractor-iso12098',
    'trailer-iso7638',
    'trailer-iso12098',
  ]);
});

test('entry flow requires an active service record before tests', () => {
  const vehicleEntry = continueFromLogin(initialNavigationState);
  assert.equal(vehicleEntry.route, 'vehicle-entry');
  assert.strictEqual(enterTests(vehicleEntry), vehicleEntry);

  const active = activateServiceRecord(vehicleEntry);
  assert.equal(active.hasActiveServiceRecord, true);
  assert.equal(active.route, 'test-carousel');
});

test('main carousel moves one card per action and stops at boundaries', () => {
  let state = { ...initialNavigationState, route: 'test-carousel' as const };
  state = moveMainCard(state, 1);
  assert.equal(state.activeCardIndex, 1);
  state = moveMainCard(state, 1);
  assert.equal(state.activeCardIndex, 2);

  const last = setMainCard(state, 7);
  assert.equal(moveMainCard(last, 1).activeCardIndex, 7);
  const first = setMainCard(last, 0);
  assert.equal(moveMainCard(first, -1).activeCardIndex, 0);
});

test('nested CAN selector is isolated from the parent carousel', () => {
  let state = {
    ...initialNavigationState,
    route: 'test-carousel' as const,
    activeCardIndex: 3 as const,
  };
  state = moveCanSubSlide(state, 1);
  assert.equal(state.canSubSlide, 1);
  assert.equal(state.activeCardIndex, 3);

  state = setCanSubSlide(state, 3);
  const atBoundary = moveCanSubSlide(state, 1);
  assert.equal(atBoundary.canSubSlide, 3);
  assert.equal(atBoundary.activeCardIndex, 3);
});

test('CAN safety and back preserve the selected nested CAN context', () => {
  const carousel = {
    ...initialNavigationState,
    route: 'test-carousel' as const,
    activeCardIndex: 3 as const,
    canSubSlide: 2 as const,
  };
  const safety = openCanSafety(carousel);
  assert.equal(safety.route, 'iso7638-can-trailer-safety');

  const resistance = confirmCanSafety(safety);
  assert.equal(resistance.route, 'iso7638-can-trailer-resistance');
  assert.equal(goBack(resistance).route, 'iso7638-can-trailer-safety');

  const parent = goBack(safety);
  assert.equal(parent.route, 'test-carousel');
  assert.equal(parent.activeCardIndex, 3);
  assert.equal(parent.canSubSlide, 2);
});

test('conditional pin and axle-lift flows return to their approved parents', () => {
  const voltageCarousel = {
    ...initialNavigationState,
    route: 'test-carousel' as const,
    activeCardIndex: 1 as const,
  };
  const voltage = openIso12098VoltageMeasurement(voltageCarousel);
  const pin11 = openIso12098PinValidation(voltage, 11);
  assert.equal(pin11.route, 'iso12098-pin11-validation');
  assert.equal(completeIso12098PinValidation(pin11).route, 'iso12098-voltage-measurement');

  const lamp = {
    ...initialNavigationState,
    route: 'lamp-test-measurement' as const,
    activeCardIndex: 4 as const,
  };
  const safety = openAxleLiftSafety(lamp);
  assert.equal(safety.route, 'axle-lift-safety');
  assert.equal(completeAxleLiftSafety(safety).route, 'lamp-test-measurement');
});

test('old-record search remains an overlay with its origin context', () => {
  const vehicleEntry = continueFromLogin(initialNavigationState);
  const entrySearch = openEntryOldRecordSearch(vehicleEntry);
  assert.deepEqual(entrySearch.overlay, {
    kind: 'old-record-search',
    origin: 'vehicle-entry',
  });
  assert.equal(closeOverlay(entrySearch).route, 'vehicle-entry');

  const reportsCard = {
    ...initialNavigationState,
    route: 'test-carousel' as const,
    activeCardIndex: 5 as const,
  };
  const reportSearch = openReports(reportsCard);
  assert.deepEqual(reportSearch.overlay, {
    kind: 'old-record-search',
    origin: 'reports',
  });
  assert.equal(reportSearch.route, 'test-carousel');
});

test('shared save element is modeled as an overlay, never as a route', () => {
  const measurement = {
    ...initialNavigationState,
    route: 'iso12098-voltage-measurement' as const,
    activeCardIndex: 1 as const,
  };
  const withOverlay = openCommonSaveOverlay(measurement);
  assert.deepEqual(withOverlay.overlay, {
    kind: 'report-save-common',
    returnTo: 'iso12098-voltage-measurement',
  });
  assert.equal(withOverlay.route, 'iso12098-voltage-measurement');
  assert.equal(closeOverlay(withOverlay).route, 'iso12098-voltage-measurement');
});

test('bottom navigation semantics follow Back, Home and Settings authority', () => {
  const detail = {
    ...initialNavigationState,
    route: 'settings-detail' as const,
    activeCardIndex: 6 as const,
  };
  const back = goBack(detail);
  assert.equal(back.route, 'test-carousel');
  assert.equal(back.activeCardIndex, 6);

  const home = goHome({ ...detail, route: 'iso12098-pin10-validation' });
  assert.equal(home.route, 'test-carousel');
  assert.equal(home.overlay, null);

  const settings = goSettings({ ...detail, route: 'iso12098-pin10-validation' });
  assert.equal(settings.route, 'test-carousel');
  assert.equal(settings.activeCardIndex, 6);
  assert.equal(openSettingsDetail(settings).route, 'settings-detail');
});
