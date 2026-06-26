/* Reusable, lightweight SVG illustrations (crisp on any screen, no downloads). */

/** A sleek car illustration used on the login hero, dashboard hero and empty states. */
export function CarArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 210" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Car illustration">
      <defs>
        <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b8ff5" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="carGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0e7ff" />
          <stop offset="1" stopColor="#a5b4fc" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="210" cy="186" rx="172" ry="15" fill="#000000" opacity="0.10" />

      {/* body */}
      <path
        d="M44 150 C44 134 60 129 80 127 L116 96 C127 82 144 74 166 73 L250 73
           C280 73 303 86 321 108 L356 118 C382 123 392 134 392 150
           C392 159 386 164 377 164 L59 164 C50 164 44 158 44 150 Z"
        fill="url(#carBody)"
      />
      {/* highlight */}
      <path d="M70 152 L368 152" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2.5" strokeLinecap="round" />

      {/* windows */}
      <path d="M138 100 L168 82 L208 82 L208 100 Z" fill="url(#carGlass)" />
      <path d="M220 82 L246 82 C268 82 286 90 300 102 L220 102 Z" fill="url(#carGlass)" />

      {/* headlight + door line */}
      <rect x="382" y="134" width="9" height="9" rx="3" fill="#fde68a" />
      <path d="M214 102 L214 162" stroke="#3730a3" strokeOpacity="0.35" strokeWidth="2" />

      {/* wheels */}
      <g>
        <circle cx="130" cy="164" r="29" fill="#0f1729" />
        <circle cx="130" cy="164" r="13" fill="#cbd5e1" />
        <circle cx="306" cy="164" r="29" fill="#0f1729" />
        <circle cx="306" cy="164" r="13" fill="#cbd5e1" />
      </g>
    </svg>
  );
}

/** A small "empty box" illustration for empty states. */
export function EmptyArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="100" cy="120" rx="70" ry="10" fill="#000" opacity="0.06" />
      <rect x="56" y="46" width="88" height="62" rx="10" fill="#eef0fb" stroke="#d7dcf2" strokeWidth="2" />
      <path d="M56 64 H144" stroke="#d7dcf2" strokeWidth="2" />
      <circle cx="100" cy="86" r="13" fill="#c7cdf0" />
      <path d="M94 86 l4 4 l9 -10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
