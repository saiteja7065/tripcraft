// Small inline icons - a whole icon library for ~12 glyphs isn't worth the bytes.

function Svg({ children, size = 18, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconUp = (p) => <Svg {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Svg>
export const IconDown = (p) => <Svg {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></Svg>
export const IconTrash = (p) => <Svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></Svg>
export const IconUndo = (p) => <Svg {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></Svg>
export const IconShare = (p) => <Svg {...p}><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" /></Svg>
export const IconChevron = (p) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>
export const IconPin = (p) => <Svg {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>
export const IconSparkle = (p) => <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z" /></Svg>
export const IconAlert = (p) => <Svg {...p}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></Svg>
export const IconRefresh = (p) => <Svg {...p}><path d="M21 12a9 9 0 11-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></Svg>
export const IconSun = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
export const IconMoon = (p) => <Svg {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></Svg>
export const IconX = (p) => <Svg {...p}><path d="M18 6L6 18M6 6l12 12" /></Svg>
export const IconWifiOff = (p) => <Svg {...p}><path d="M2 2l20 20M8.5 16.5a5 5 0 017 0M5 12.9a10 10 0 015.2-2.8M19 12.9a10 10 0 00-2.3-1.6M2 8.8a15 15 0 014.2-2.6M22 8.8A15 15 0 0010.7 5M12 20h.01" /></Svg>
export const IconPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
