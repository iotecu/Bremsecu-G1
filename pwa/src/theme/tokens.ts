import type { CSSProperties } from 'react';
import designTokensJson from './design-tokens.json';

export const designTokens = designTokensJson;

type TokenStyle = CSSProperties & Record<`--${string}`, string | number>;
const px = (value: number) => `${value}px`;

export const appShellTokenStyle: TokenStyle = {
  '--color-app': designTokens.colors.surface.app,
  '--color-card': designTokens.colors.surface.card,
  '--color-deep-panel': designTokens.colors.surface.deepPanel,
  '--color-modal-panel': designTokens.colors.surface.modalPanel,
  '--color-text-primary': designTokens.colors.text.primary,
  '--color-text-secondary': designTokens.colors.text.secondary,
  '--color-text-soft': designTokens.colors.text.soft,
  '--color-brand-red': designTokens.colors.brand.red,
  '--color-home-red': designTokens.colors.brand.homeRed,
  '--color-home-red-stroke': designTokens.colors.brand.homeRedStroke,
  '--color-success': designTokens.colors.state.success,
  '--color-danger': designTokens.colors.state.danger,
  '--color-stroke-panel': designTokens.colors.stroke.panel,
  '--color-bottom-nav-overlay': designTokens.colors.opacityReferences.bottomNavOverlay52,
  '--font-body': `${designTokens.typography.roles.body.family}, sans-serif`,
  '--font-module-title': `${designTokens.typography.roles.moduleTitle.family}, sans-serif`,
  '--module-title-size': px(designTokens.typography.roles.moduleTitle.sizePx),
  '--module-title-weight': designTokens.typography.roles.moduleTitle.weight,
  '--language-badge-size': px(designTokens.typography.roles.languageBadge.sizePx),
  '--language-badge-weight': designTokens.typography.roles.languageBadge.weight,
  '--selection-card-radius': px(designTokens.radii.selectionCardPx),
  '--language-badge-radius': px(designTokens.radii.languageBadgePx),
  '--reference-frame-width': px(designTokens.referenceGeometry.mobileFramePx.width),
  '--reference-frame-height': px(designTokens.referenceGeometry.mobileFramePx.height),
  '--bottom-nav-width': px(designTokens.referenceGeometry.bottomNavigationPx.width),
  '--bottom-nav-height': px(designTokens.referenceGeometry.bottomNavigationPx.height),
};
