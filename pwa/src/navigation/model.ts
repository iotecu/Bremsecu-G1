export const MAIN_CARD_KEYS = [
  'iso7638-voltage',
  'iso12098-voltage',
  'cable-test',
  'can-termination',
  'lamp-axle-lift',
  'reports',
  'settings',
  'battery-status',
] as const;

export const CAN_SUB_STATE_KEYS = [
  'tractor-iso7638',
  'tractor-iso12098',
  'trailer-iso7638',
  'trailer-iso12098',
] as const;

export type MainCardIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type CanSubSlide = 0 | 1 | 2 | 3;
export type CarouselDirection = -1 | 1;

export type RouteId =
  | 'vehicle-entry'
  | 'new-vehicle-form'
  | 'dashboard'
  | 'cable-menu'
  | 'can-menu'
  | 'battery-status'
  | 'iso7638-voltage-measurement'
  | 'iso12098-voltage-measurement'
  | 'iso12098-pin10-validation'
  | 'iso12098-pin11-validation'
  | 'iso12098-pin12-validation'
  | 'iso7638-cable-select'
  | 'iso7638-cable-measurement'
  | 'iso12098-cable-select'
  | 'iso12098-cable-measurement'
  | 'iso7638-can-tractor-safety'
  | 'iso7638-can-tractor-resistance'
  | 'iso12098-can-tractor-safety'
  | 'iso12098-can-tractor-resistance'
  | 'iso7638-can-trailer-safety'
  | 'iso7638-can-trailer-resistance'
  | 'iso12098-can-trailer-safety'
  | 'iso12098-can-trailer-resistance'
  | 'lamp-test-measurement'
  | 'axle-lift-safety'
  | 'report-result'
  | 'settings-detail';

export type OldRecordSearchOrigin = 'vehicle-entry' | 'reports';

export type SaveableRouteId =
  | 'iso7638-voltage-measurement'
  | 'iso12098-voltage-measurement'
  | 'iso7638-cable-measurement'
  | 'iso12098-cable-measurement'
  | 'iso7638-can-tractor-resistance'
  | 'iso12098-can-tractor-resistance'
  | 'iso7638-can-trailer-resistance'
  | 'iso12098-can-trailer-resistance'
  | 'lamp-test-measurement'
  | 'report-result';

export type NavigationOverlay =
  | { readonly kind: 'old-record-search'; readonly origin: OldRecordSearchOrigin }
  | { readonly kind: 'report-save'; readonly returnTo: 'report-result' }
  | { readonly kind: 'report-save-common'; readonly returnTo: SaveableRouteId };

export interface NavigationState {
  readonly route: RouteId;
  readonly activeCardIndex: MainCardIndex;
  readonly canSubSlide: CanSubSlide;
  readonly hasActiveServiceRecord: boolean;
  readonly overlay: NavigationOverlay | null;
}

export const initialNavigationState: NavigationState = {
  route: 'dashboard',
  activeCardIndex: 0,
  canSubSlide: 0,
  hasActiveServiceRecord: false,
  overlay: null,
};

const SAVEABLE_ROUTES: readonly SaveableRouteId[] = [
  'iso7638-voltage-measurement',
  'iso12098-voltage-measurement',
  'iso7638-cable-measurement',
  'iso12098-cable-measurement',
  'iso7638-can-tractor-resistance',
  'iso12098-can-tractor-resistance',
  'iso7638-can-trailer-resistance',
  'iso12098-can-trailer-resistance',
  'lamp-test-measurement',
  'report-result',
];

function isSaveableRoute(route: RouteId): route is SaveableRouteId {
  return SAVEABLE_ROUTES.includes(route as SaveableRouteId);
}

const PIN_VALIDATION_ROUTES: readonly RouteId[] = [
  'iso12098-pin10-validation',
  'iso12098-pin11-validation',
  'iso12098-pin12-validation',
];

const CAN_SAFETY_BY_SUB_SLIDE: readonly RouteId[] = [
  'iso7638-can-tractor-safety',
  'iso12098-can-tractor-safety',
  'iso7638-can-trailer-safety',
  'iso12098-can-trailer-safety',
];

const CAN_RESISTANCE_BY_SAFETY: Readonly<Partial<Record<RouteId, RouteId>>> = {
  'iso7638-can-tractor-safety': 'iso7638-can-tractor-resistance',
  'iso12098-can-tractor-safety': 'iso12098-can-tractor-resistance',
  'iso7638-can-trailer-safety': 'iso7638-can-trailer-resistance',
  'iso12098-can-trailer-safety': 'iso12098-can-trailer-resistance',
};

const CAN_SAFETY_BY_RESISTANCE: Readonly<Partial<Record<RouteId, RouteId>>> = {
  'iso7638-can-tractor-resistance': 'iso7638-can-tractor-safety',
  'iso12098-can-tractor-resistance': 'iso12098-can-tractor-safety',
  'iso7638-can-trailer-resistance': 'iso7638-can-trailer-safety',
  'iso12098-can-trailer-resistance': 'iso12098-can-trailer-safety',
};

function isMainCardIndex(value: number): value is MainCardIndex {
  return Number.isInteger(value) && value >= 0 && value < MAIN_CARD_KEYS.length;
}

function isCanSubSlide(value: number): value is CanSubSlide {
  return Number.isInteger(value) && value >= 0 && value < CAN_SUB_STATE_KEYS.length;
}

function withRoute(state: NavigationState, route: RouteId): NavigationState {
  if (state.overlay !== null) {
    return state;
  }

  return { ...state, route };
}

function toCarouselParent(
  state: NavigationState,
  activeCardIndex: MainCardIndex,
  canSubSlide = state.canSubSlide,
): NavigationState {
  return {
    ...state,
    route: 'dashboard',
    activeCardIndex,
    canSubSlide,
    overlay: null,
  };
}

export function openVehicleEntry(state: NavigationState): NavigationState {
  return state.overlay === null
    ? { ...state, route: 'vehicle-entry' }
    : state;
}

export function openNewVehicleForm(state: NavigationState): NavigationState {
  return state.route === 'vehicle-entry' && state.overlay === null
    ? { ...state, route: 'new-vehicle-form' }
    : state;
}

export function openEntryOldRecordSearch(state: NavigationState): NavigationState {
  return state.route === 'vehicle-entry' && state.overlay === null
    ? { ...state, overlay: { kind: 'old-record-search', origin: 'vehicle-entry' } }
    : state;
}

export function activateServiceRecord(state: NavigationState): NavigationState {
  if (
    state.route !== 'vehicle-entry' &&
    state.route !== 'new-vehicle-form' &&
    state.overlay?.kind !== 'old-record-search'
  ) {
    return state;
  }

  return {
    ...state,
    route: 'dashboard',
    hasActiveServiceRecord: true,
    overlay: null,
  };
}

export function enterTests(state: NavigationState): NavigationState {
  if (
    state.route !== 'vehicle-entry' ||
    state.overlay !== null ||
    !state.hasActiveServiceRecord
  ) {
    return state;
  }

  return { ...state, route: 'dashboard' };
}

export function setMainCard(
  state: NavigationState,
  activeCardIndex: MainCardIndex,
): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, activeCardIndex }
    : state;
}

export function moveMainCard(
  state: NavigationState,
  direction: CarouselDirection,
): NavigationState {
  if (state.route !== 'dashboard' || state.overlay !== null) {
    return state;
  }

  const nextIndex = state.activeCardIndex + direction;
  return isMainCardIndex(nextIndex)
    ? { ...state, activeCardIndex: nextIndex }
    : state;
}

export function setCanSubSlide(
  state: NavigationState,
  canSubSlide: CanSubSlide,
): NavigationState {
  return state.route === 'dashboard' && state.activeCardIndex === 3 && state.overlay === null
    ? { ...state, canSubSlide }
    : state;
}

export function moveCanSubSlide(
  state: NavigationState,
  direction: CarouselDirection,
): NavigationState {
  if (state.route !== 'dashboard' || state.activeCardIndex !== 3 || state.overlay !== null) {
    return state;
  }

  const nextSlide = state.canSubSlide + direction;
  return isCanSubSlide(nextSlide)
    ? { ...state, canSubSlide: nextSlide }
    : state;
}

export function openIso7638VoltageMeasurement(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.activeCardIndex === 0
    ? withRoute(state, 'iso7638-voltage-measurement')
    : state;
}

export function openDashboardVoltage(
  state: NavigationState,
  iso: '7638' | '12098',
): NavigationState {
  if (state.route !== 'dashboard' || state.overlay !== null) {
    return state;
  }

  return {
    ...state,
    route: iso === '7638' ? 'iso7638-voltage-measurement' : 'iso12098-voltage-measurement',
  };
}

export function openCableMenu(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'cable-menu' }
    : state;
}

export function openCanMenu(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'can-menu' }
    : state;
}

export function openDashboardLamp(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'lamp-test-measurement' }
    : state;
}

export function openDashboardReports(state: NavigationState): NavigationState {
  if (state.route !== 'dashboard' || state.overlay !== null) {
    return state;
  }

  return state.hasActiveServiceRecord
    ? { ...state, route: 'report-result' }
    : { ...state, overlay: { kind: 'old-record-search', origin: 'reports' } };
}

export function openDashboardSettings(state: NavigationState): NavigationState {
  return state.overlay === null
    ? { ...state, route: 'settings-detail' }
    : state;
}

export function openBatteryStatus(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'battery-status' }
    : state;
}

export function openCanSafetyChoice(
  state: NavigationState,
  canSubSlide: CanSubSlide,
): NavigationState {
  if (state.route !== 'can-menu' || state.overlay !== null) {
    return state;
  }

  const route = CAN_SAFETY_BY_SUB_SLIDE[canSubSlide];
  return route ? { ...state, route, canSubSlide } : state;
}

export function openIso12098VoltageMeasurement(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.activeCardIndex === 1
    ? withRoute(state, 'iso12098-voltage-measurement')
    : state;
}

export function openIso12098PinValidation(
  state: NavigationState,
  pin: 10 | 11 | 12,
): NavigationState {
  if (state.route !== 'iso12098-voltage-measurement' || state.overlay !== null) {
    return state;
  }

  const route: RouteId =
    pin === 10
      ? 'iso12098-pin10-validation'
      : pin === 11
        ? 'iso12098-pin11-validation'
        : 'iso12098-pin12-validation';

  return { ...state, route };
}

export function completeIso12098PinValidation(state: NavigationState): NavigationState {
  return PIN_VALIDATION_ROUTES.includes(state.route) && state.overlay === null
    ? { ...state, route: 'iso12098-voltage-measurement' }
    : state;
}

export function openCableBranch(
  state: NavigationState,
  branch: 'iso7638' | 'iso12098',
): NavigationState {
  if (
    state.overlay !== null ||
    (state.route !== 'cable-menu' && !(state.route === 'dashboard' && state.activeCardIndex === 2))
  ) {
    return state;
  }

  return {
    ...state,
    route: branch === 'iso7638' ? 'iso7638-cable-select' : 'iso12098-cable-select',
  };
}

export function startCableMeasurement(state: NavigationState): NavigationState {
  if (state.overlay !== null) {
    return state;
  }

  if (state.route === 'iso7638-cable-select') {
    return { ...state, route: 'iso7638-cable-measurement' };
  }

  if (state.route === 'iso12098-cable-select') {
    return { ...state, route: 'iso12098-cable-measurement' };
  }

  return state;
}

export function openCanSafety(state: NavigationState): NavigationState {
  if (state.route !== 'dashboard' || state.activeCardIndex !== 3 || state.overlay !== null) {
    return state;
  }

  const route = CAN_SAFETY_BY_SUB_SLIDE[state.canSubSlide];
  return route ? { ...state, route } : state;
}

export function confirmCanSafety(state: NavigationState): NavigationState {
  if (state.overlay !== null) {
    return state;
  }

  const route = CAN_RESISTANCE_BY_SAFETY[state.route];
  return route ? { ...state, route } : state;
}

export function openLampMeasurement(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.activeCardIndex === 4
    ? withRoute(state, 'lamp-test-measurement')
    : state;
}

export function openAxleLiftSafety(state: NavigationState): NavigationState {
  return state.route === 'lamp-test-measurement' && state.overlay === null
    ? { ...state, route: 'axle-lift-safety' }
    : state;
}

export function completeAxleLiftSafety(state: NavigationState): NavigationState {
  return state.route === 'axle-lift-safety' && state.overlay === null
    ? { ...state, route: 'lamp-test-measurement' }
    : state;
}

export function openReports(state: NavigationState): NavigationState {
  if (state.route !== 'dashboard' || state.activeCardIndex !== 5 || state.overlay !== null) {
    return state;
  }

  return state.hasActiveServiceRecord
    ? { ...state, route: 'report-result' }
    : { ...state, overlay: { kind: 'old-record-search', origin: 'reports' } };
}

export function openReportFromOldRecordSearch(state: NavigationState): NavigationState {
  return state.overlay?.kind === 'old-record-search' && state.overlay.origin === 'reports'
    ? {
        ...state,
        route: 'report-result',
        overlay: null,
      }
    : state;
}

export function retestFromReport(state: NavigationState): NavigationState {
  return state.route === 'report-result' && state.overlay === null
    ? { ...state, route: 'dashboard' }
    : state;
}

export function openReportSave(state: NavigationState): NavigationState {
  return state.route === 'report-result' && state.overlay === null
    ? { ...state, overlay: { kind: 'report-save', returnTo: 'report-result' } }
    : state;
}

export function openSettingsDetail(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.activeCardIndex === 6
    ? withRoute(state, 'settings-detail')
    : state;
}

export function openCommonSaveOverlay(state: NavigationState): NavigationState {
  if (state.overlay !== null || !isSaveableRoute(state.route)) {
    return state;
  }

  return {
    ...state,
    overlay: { kind: 'report-save-common', returnTo: state.route },
  };
}

export function closeOverlay(state: NavigationState): NavigationState {
  return state.overlay === null ? state : { ...state, overlay: null };
}

export function goHome(state: NavigationState): NavigationState {
  return { ...state, route: 'dashboard', overlay: null };
}

export function goSettings(state: NavigationState): NavigationState {
  return {
    ...state,
    route: 'dashboard',
    activeCardIndex: 6,
    overlay: null,
  };
}

export function goBack(state: NavigationState): NavigationState {
  if (state.overlay !== null) {
    return { ...state, overlay: null };
  }

  switch (state.route) {
    case 'vehicle-entry':
      return { ...state, route: 'dashboard' };
    case 'new-vehicle-form':
      return { ...state, route: 'vehicle-entry' };
    case 'dashboard':
      return state;
    case 'cable-menu':
    case 'can-menu':
    case 'battery-status':
      return { ...state, route: 'dashboard', overlay: null };
    case 'iso7638-voltage-measurement':
      return { ...state, route: 'dashboard', overlay: null };
    case 'iso12098-voltage-measurement':
      return { ...state, route: 'dashboard', overlay: null };
    case 'iso12098-pin10-validation':
    case 'iso12098-pin11-validation':
    case 'iso12098-pin12-validation':
      return { ...state, route: 'iso12098-voltage-measurement' };
    case 'iso7638-cable-select':
    case 'iso12098-cable-select':
      return { ...state, route: 'cable-menu', overlay: null };
    case 'iso7638-cable-measurement':
      return { ...state, route: 'iso7638-cable-select' };
    case 'iso12098-cable-measurement':
      return { ...state, route: 'iso12098-cable-select' };
    case 'iso7638-can-tractor-safety':
    case 'iso12098-can-tractor-safety':
    case 'iso7638-can-trailer-safety':
    case 'iso12098-can-trailer-safety':
      return { ...state, route: 'can-menu', overlay: null };
    case 'iso7638-can-tractor-resistance':
    case 'iso12098-can-tractor-resistance':
    case 'iso7638-can-trailer-resistance':
    case 'iso12098-can-trailer-resistance': {
      const parentRoute = CAN_SAFETY_BY_RESISTANCE[state.route];
      return parentRoute ? { ...state, route: parentRoute } : state;
    }
    case 'lamp-test-measurement':
      return { ...state, route: 'dashboard', overlay: null };
    case 'axle-lift-safety':
      return { ...state, route: 'lamp-test-measurement' };
    case 'report-result':
    case 'settings-detail':
      return { ...state, route: 'dashboard', overlay: null };
  }
}
