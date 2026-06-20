/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      id="brand-logo-svg"
    >
      <defs>
        <linearGradient id="n-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--font-brand-accent, #ff5b00)" />
          <stop offset="100%" stopColor="#ff8c00" />
        </linearGradient>
        <filter id="glow-effect" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--font-brand-accent, #ff5b00)" floodOpacity="0.4" />
        </filter>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.12"
      />

      <g filter="url(#glow-effect)">
        <rect x="26" y="25" width="11" height="50" rx="5.5" fill="url(#n-gradient)" />
        <rect x="63" y="25" width="11" height="50" rx="5.5" fill="url(#n-gradient)" />
        <path
          d="M32 28 L68 62 M68 50 L68 65 L53 65"
          stroke="url(#n-gradient)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
