export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C2A8" />
          <stop offset="100%" stopColor="#C13584" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="54" height="54" rx="14" fill="url(#logo-g)" />
      <rect
        x="17"
        y="15"
        width="20"
        height="28"
        rx="4"
        fill="#0F1019"
        opacity="0.55"
        transform="rotate(-8 27 29)"
      />
      <rect x="27" y="19" width="20" height="28" rx="4" fill="#EDE6D6" transform="rotate(8 37 33)" />
    </svg>
  );
}
