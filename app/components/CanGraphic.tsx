export function CanGraphic() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -translate-y-8 scale-110 bg-[radial-gradient(ellipse_at_center,rgba(212,165,116,0.18),transparent_65%)] blur-2xl" />
      <svg
        viewBox="0 0 200 480"
        className="relative h-[460px] w-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
        aria-label="Opus Elevate can"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#0e0e0e" />
            <stop offset="0.12" stopColor="#1f1f1f" />
            <stop offset="0.45" stopColor="#2e2e2e" />
            <stop offset="0.78" stopColor="#171717" />
            <stop offset="1" stopColor="#070707" />
          </linearGradient>
          <linearGradient id="topGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#2a2a2a" />
            <stop offset="0.35" stopColor="#6f6f6f" />
            <stop offset="0.65" stopColor="#a0a0a0" />
            <stop offset="1" stopColor="#1a1a1a" />
          </linearGradient>
          <linearGradient id="bandGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#8a6a44" />
            <stop offset="0.5" stopColor="#d4a574" />
            <stop offset="1" stopColor="#6e542f" />
          </linearGradient>
        </defs>

        {/* Top lid */}
        <ellipse cx="100" cy="30" rx="70" ry="14" fill="url(#topGrad)" />
        <ellipse cx="100" cy="30" rx="62" ry="10" fill="#0a0a0a" opacity="0.4" />

        {/* Top rim */}
        <rect x="30" y="28" width="140" height="8" fill="#1a1a1a" />

        {/* Body */}
        <rect x="30" y="36" width="140" height="400" fill="url(#bodyGrad)" />

        {/* Side highlight + shadow */}
        <rect x="34" y="36" width="2" height="400" fill="rgba(255,255,255,0.06)" />
        <rect x="164" y="36" width="3" height="400" fill="rgba(0,0,0,0.6)" />

        {/* Accent bands */}
        <rect x="30" y="198" width="140" height="1.5" fill="url(#bandGrad)" />
        <rect x="30" y="284" width="140" height="1.5" fill="url(#bandGrad)" />

        {/* Wordmark */}
        <text
          x="100"
          y="244"
          textAnchor="middle"
          fill="#f5f1e8"
          className="font-sans"
          style={{ fontSize: 22, fontWeight: 900, letterSpacing: 6 }}
        >
          OPUS
        </text>
        <text
          x="100"
          y="266"
          textAnchor="middle"
          fill="#d4a574"
          className="font-mono"
          style={{ fontSize: 7, letterSpacing: 4 }}
        >
          ELEVATE
        </text>

        {/* Spec line */}
        <text
          x="100"
          y="160"
          textAnchor="middle"
          fill="#8a8a85"
          className="font-mono"
          style={{ fontSize: 6, letterSpacing: 3 }}
        >
          VOL. 01 · CITRUS
        </text>

        {/* Volume meta */}
        <text
          x="100"
          y="408"
          textAnchor="middle"
          fill="#8a8a85"
          className="font-mono"
          style={{ fontSize: 6, letterSpacing: 2 }}
        >
          12 FL OZ · 355 ML
        </text>

        {/* Bottom rim */}
        <rect x="30" y="432" width="140" height="4" fill="#0a0a0a" />
        <ellipse cx="100" cy="436" rx="70" ry="6" fill="#000" opacity="0.7" />
      </svg>
    </div>
  );
}
