import React from "react";

/* Set de iconos SVG inline (trazo 1.8, estilo redondeado) */

const PATHS: Record<string, React.ReactNode> = {
  logo: (
    <path d="M3 12v-3M8 17V7M13 15V9M18 19V5M23 13v-2" strokeLinecap="round" transform="translate(-1.5 0)" />
  ),
  orchestra: (
    <>
      <circle cx="9" cy="7.5" r="2.6" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" strokeLinecap="round" />
      <circle cx="16.8" cy="8.5" r="2" />
      <path d="M15.5 13.6c2.9-.4 5 1.3 5.6 4.4" strokeLinecap="round" />
      <path d="M12.5 3.5c1.8-.8 3.4-.6 4.8.4" strokeLinecap="round" />
    </>
  ),
  studio: (
    <>
      <path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2" strokeLinecap="round" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="19" cy="16" r="2" />
    </>
  ),
  works: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 3.8a8.2 8.2 0 0 1 8.2 8.2" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  concert: (
    <>
      <path d="M4 18c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
      <circle cx="12" cy="6.5" r="2.2" />
      <path d="M2.5 18h19" strokeLinecap="round" />
      <path d="M12 2v1.6M5.4 4.6l1.1 1.1M18.6 4.6l-1.1 1.1" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.2 5 7.6 4.6 4.5 4.8v13.4c3.1-.2 5.7.2 7.5 1.7 1.8-1.5 4.4-1.9 7.5-1.7V4.8c-3.1-.2-5.7.2-7.5 1.7z" strokeLinejoin="round" />
      <path d="M12 6.5v13.4" strokeLinecap="round" />
      <path d="M6.8 8.6c1.2 0 2.2.15 3.1.5M6.8 11.4c1.2 0 2.2.15 3.1.5" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  play: <path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" strokeLinecap="round" />
      <path d="M6.5 7l.8 12a1.8 1.8 0 0 0 1.8 1.7h5.8a1.8 1.8 0 0 0 1.8-1.7L17.5 7" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8A1.8 1.8 0 0 1 4.8 3h8.4A1.8 1.8 0 0 1 15 4.8V5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10M7.5 10.5L12 15l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 19.5h15" strokeLinecap="round" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="9" cy="9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17z" strokeLinejoin="round" />
      <path d="M14.5 8l1.5 1.5" strokeLinecap="round" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M3.8 12h16.4M12 3.8c2.5 2.2 3.8 5 3.8 8.2s-1.3 6-3.8 8.2c-2.5-2.2-3.8-5-3.8-8.2s1.3-6 3.8-8.2z" />
    </>
  ),
  metronome: (
    <>
      <path d="M9 4h6l3 16H6z" strokeLinejoin="round" />
      <path d="M12 14L17.5 6" strokeLinecap="round" />
      <path d="M7 20h10" strokeLinecap="round" />
    </>
  ),
  note: (
    <>
      <circle cx="8.5" cy="17.5" r="2.8" />
      <path d="M11.3 17.5V5.5l7-1.8v11.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15.5" cy="15.3" r="2.8" />
    </>
  ),
  arrow: <path d="M5 12h14M13.5 6.5L19 12l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />,
  spark: (
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" strokeLinejoin="round" />
  ),
  check: <path d="M4.5 12.5l5 5L19.5 7" strokeLinecap="round" strokeLinejoin="round" />,
  x: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  wave: <path d="M3 12c1.5 0 1.5-5 3-5s1.5 10 3 10 1.5-10 3-10 1.5 10 3 10 1.5-5 3-5h3" strokeLinecap="round" />,
  faders: (
    <>
      <path d="M6 4v16M12 4v16M18 4v16" strokeLinecap="round" opacity="0.45" />
      <rect x="3.6" y="12" width="4.8" height="3.4" rx="1" fill="currentColor" stroke="none" />
      <rect x="9.6" y="6" width="4.8" height="3.4" rx="1" fill="currentColor" stroke="none" />
      <rect x="15.6" y="14" width="4.8" height="3.4" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" strokeLinecap="round" />
    </>
  ),
  knob: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 12l4.4-4.4" strokeLinecap="round" />
      <path d="M4.6 17.8a9 9 0 0 1 0-11.6M19.4 6.2a9 9 0 0 1 0 11.6" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 4l8 4.2-8 4.2-8-4.2z" strokeLinejoin="round" />
      <path d="M4 12.4l8 4.2 8-4.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
      <path d="M4 16l8 4.2 8-4.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
    </>
  ),
};

export function Icon({ name, size = 18, className = "", strokeWidth = 1.8 }: {
  name: string; size?: number; className?: string; strokeWidth?: number;
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.note}
    </svg>
  );
}
