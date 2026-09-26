export function AegisMark({
  size = 28,
  className = "",
  glow = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const id = "aegis-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`${glow ? "drop-shadow-[0_0_14px_rgba(139,156,255,0.55)]" : ""} ${className}`}
      aria-label="Aegis"
      role="img"
    >
      <defs>
        <linearGradient id={id} x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b9cff" />
          <stop offset="1" stopColor="#4ade9c" />
        </linearGradient>
      </defs>
      <path
        d="M32 6 L54 15.5 V32.5 C54 45.5 44.5 54.5 32 59 C19.5 54.5 10 45.5 10 32.5 V15.5 Z"
        stroke={`url(#${id})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M32 21 L42 26.75 V38.25 L32 44 L22 38.25 V26.75 Z"
        stroke={`url(#${id})`}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark font-serif font-medium tracking-[0.02em] ${className}`}>
      AEGIS
    </span>
  );
}
