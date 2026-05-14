"use client";

import { useRef, useState } from "react";

type Can3DProps = {
  width?: number;
  hint?: boolean;
  accent?: string;
};

export function Can3D({
  width = 190,
  hint = true,
  accent = "#dcdcdc",
}: Can3DProps) {
  const [angle, setAngle] = useState(-12);
  const dragging = useRef<{ startX: number; startAngle: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const height = Math.round(width * 2.8);

  function startDrag(clientX: number) {
    dragging.current = { startX: clientX, startAngle: angle };
    setIsDragging(true);
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    startDrag(e.clientX);

    const move = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragging.current.startX;
      setAngle(dragging.current.startAngle + dx * 0.6);
    };
    const up = () => {
      dragging.current = null;
      setIsDragging(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function onTouchStart(e: React.TouchEvent) {
    startDrag(e.touches[0].clientX);

    const move = (ev: TouchEvent) => {
      if (!dragging.current) return;
      const dx = ev.touches[0].clientX - dragging.current.startX;
      setAngle(dragging.current.startAngle + dx * 0.6);
    };
    const up = () => {
      dragging.current = null;
      setIsDragging(false);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        width,
        height,
        position: "relative",
        perspective: "1400px",
        cursor: "grab",
        userSelect: "none",
        touchAction: "pan-y",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `rotateY(${angle}deg)`,
          transition: isDragging
            ? "none"
            : "transform .6s cubic-bezier(.2,.7,.3,1)",
        }}
      >
        <WireFace side="front" width={width} height={height} accent={accent} />
        <WireFace side="back" width={width} height={height} accent={accent} />
      </div>
      {hint && (
        <div
          style={{
            position: "absolute",
            bottom: -28,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            lineHeight: 1,
            letterSpacing: ".16em",
            color: "rgba(255,255,255,.4)",
            textTransform: "uppercase",
            pointerEvents: "none",
          }}
        >
          drag to rotate
        </div>
      )}
    </div>
  );
}

function WireFace({
  side,
  width,
  height,
  accent,
}: {
  side: "front" | "back";
  width: number;
  height: number;
  accent: string;
}) {
  const isFront = side === "front";
  const mono = "var(--font-mono)";
  const cn = "var(--font-cn)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `rotateY(${isFront ? 0 : 180}deg) translateZ(1px)`,
        backfaceVisibility: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 220 580"
        width={width * 0.7}
        height={height * 0.95}
        aria-hidden
      >
        <g fill="none" stroke={accent} strokeWidth=".8">
          <ellipse cx="110" cy="14" rx="86" ry="9" />
          <line x1="24" y1="14" x2="24" y2="558" />
          <line x1="196" y1="14" x2="196" y2="558" />
          <ellipse cx="110" cy="558" rx="86" ry="9" />
          <line
            x1="24"
            y1="32"
            x2="196"
            y2="32"
            strokeDasharray="2 3"
            opacity=".5"
          />
          <line
            x1="24"
            y1="540"
            x2="196"
            y2="540"
            strokeDasharray="2 3"
            opacity=".5"
          />
          <g opacity=".7" strokeWidth=".5">
            <line x1="210" y1="14" x2="216" y2="14" />
            <line x1="210" y1="558" x2="216" y2="558" />
            <line x1="213" y1="14" x2="213" y2="558" />
          </g>
        </g>
        <text
          x="220"
          y="290"
          fontSize="7"
          fill={accent}
          fontFamily={mono}
          letterSpacing="1"
          transform="rotate(90 220 290)"
        >
          168 MM
        </text>
        {isFront ? (
          <g fill={accent} fontFamily={mono} textAnchor="middle">
            <text x="110" y="100" fontSize="8" letterSpacing="2">
              BEYOND OPUS
            </text>
            <text
              x="110"
              y="180"
              fontSize="32"
              fontWeight="700"
              fontFamily={cn}
              letterSpacing="6"
            >
              ELEVATE
            </text>
            <text x="110" y="200" fontSize="8" letterSpacing="2">
              SPEC 00 · 330ML
            </text>
            {["ENERGY", "DRIVE", "FLOW"].map((t, i) => (
              <g key={t}>
                <line
                  x1="40"
                  y1={310 + i * 60}
                  x2="180"
                  y2={310 + i * 60}
                  stroke={accent}
                  strokeWidth=".4"
                  opacity=".4"
                />
                <text x="110" y={328 + i * 60} fontSize="10" letterSpacing="4">
                  {t}
                </text>
              </g>
            ))}
          </g>
        ) : (
          <g fill={accent} fontFamily={mono}>
            <text
              x="110"
              y="60"
              fontSize="7"
              letterSpacing="1.5"
              textAnchor="middle"
            >
              SPEC SHEET · REV.04
            </text>
            {SPEC.map(([k, v], i) => (
              <g key={k}>
                <text x="40" y={120 + i * 22} fontSize="8" letterSpacing="1">
                  {k}
                </text>
                <text
                  x="180"
                  y={120 + i * 22}
                  fontSize="8"
                  letterSpacing="1"
                  textAnchor="end"
                >
                  {v}
                </text>
                <line
                  x1="40"
                  y1={124 + i * 22}
                  x2="180"
                  y2={124 + i * 22}
                  stroke={accent}
                  strokeWidth=".3"
                  opacity=".3"
                />
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

const SPEC: ReadonlyArray<readonly [string, string]> = [
  ["CAL", "10 KCAL"],
  ["CAF", "180 MG"],
  ["NA", "30 MG"],
  ["L-TYR", "500 MG"],
  ["L-THE", "200 MG"],
  ["ALCAR", "750 MG"],
  ["RHODIO", "300 MG"],
  ["αGPC", "300 MG"],
];
