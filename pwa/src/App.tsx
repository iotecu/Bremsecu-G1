import React from 'react';

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
  return (
    <main data-product="BREMSECU G1 REV-2">
      <h1>BREMSECU G1 REV-2</h1>
      <p>Approved PWA implementation scaffold.</p>
      <p>Visual authority: docs/figma/</p>
      <p>Engineering authority: docs/engineering/</p>
    </main>
  );
}
