/**
 * StudioMascot.jsx
 * Native mobile interactive studio companion for E-Kodak Studio ("Kodak the Fox").
 * Re-exports the full 5-pose Bodyset Motion Kit (StudioMascotKit).
 */

import React from 'react';
import StudioMascotKit, { MASCOT_POSES } from './StudioMascotKit';

export { MASCOT_POSES };

export default function StudioMascot(props) {
  return <StudioMascotKit {...props} />;
}
