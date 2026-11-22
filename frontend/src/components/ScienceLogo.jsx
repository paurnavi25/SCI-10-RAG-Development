export default function ScienceLogo({ size = 'md', className = '' }) {
  const dims =
    size === 'sm'
      ? { box: 'w-8 h-8 rounded-lg', svg: 18 }
      : size === 'lg'
        ? { box: 'w-14 h-14 rounded-2xl', svg: 30 }
        : { box: 'w-10 h-10 rounded-xl', svg: 22 };

  return (
    <div
      className={`${dims.box} bg-forest text-cream-100 flex items-center justify-center flex-shrink-0 shadow-card select-none ${className}`}
      aria-label="Science AI Tutor Logo"
    >
      <svg
        width={dims.svg}
        height={dims.svg}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {/* Atom orbital rings */}
        <ellipse
          cx="16"
          cy="16"
          rx="12"
          ry="5"
          transform="rotate(-30 16 16)"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeOpacity="0.85"
        />
        <ellipse
          cx="16"
          cy="16"
          rx="12"
          ry="5"
          transform="rotate(30 16 16)"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeOpacity="0.85"
        />
        <ellipse
          cx="16"
          cy="16"
          rx="12"
          ry="5"
          transform="rotate(90 16 16)"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeOpacity="0.55"
        />
        {/* Nucleus */}
        <circle cx="16" cy="16" r="2.75" fill="#9BAF95" />
        {/* Electron dots */}
        <circle cx="25.5" cy="11" r="1.4" fill="currentColor" />
        <circle cx="6.5" cy="21" r="1.4" fill="currentColor" />
      </svg>
    </div>
  );
}

