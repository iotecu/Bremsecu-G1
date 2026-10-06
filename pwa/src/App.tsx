import React from 'react';
import SettingsScreen from './screens/SettingsScreen';

export type ScreenId =
  | 'first-contact'
  | 'test-entry'
  | 'new-vehicle-record'
  | 'voltage'
  | 'cable'
  | 'lamp'
  | 'termination'
  | 'report'
  | 'settings';

export default function App() {
  return <SettingsScreen />;
}
