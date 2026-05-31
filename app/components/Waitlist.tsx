"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { joinWaitlist } from "../actions/waitlist";

export type WaitlistState = {
  submitted: boolean;
  position: number | null;
};

type WaitlistProps = {
  state: WaitlistState;
  onSubmitted: (position: number) => void;
  inputId?: string;
};

const CN: CSSProperties = { fontFamily: "var(--font-cn)" };
const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };
// Gold tier accent (Drive) — used for the success headline.
const ACCENT = "#a8843e";

const BASE_POSITION = 2106;

function hashEmail(email: string): number {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = (h * 31 + email.charCodeAt(i)) >>> 0;
  }
  return BASE_POSITION + (h % 400);
}

export function Waitlist({ state, onSubmitted, inputId }: WaitlistProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", value);
      const result = await joinWaitlist({ ok: false, message: "" }, fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSubmitted(hashEmail(value.toLowerCase()));
    });
  }

  // Success — squared panel matching the facts-label card.
  if (state.submitted && state.position !== null) {
    return (
      <div
        style={{
          width: "min(360px, 86vw)",
          padding: "20px 18px",
          background: "rgba(255,255,255,0.02)",
          border: ".5px solid var(--hair)",
          textAlign: "left",
          // Shrink the whole panel ~20% uniformly while leaving every internal
          // responsive unit (min()/vw/etc.) untouched — see the form below.
          transform: "scale(0.8)",
          transformOrigin: "top center",
        }}
      >
        <div
          style={{
            ...CN,
            fontWeight: 900,
            fontSize: 30,
            lineHeight: 0.9,
            letterSpacing: ".01em",
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          YOU&rsquo;RE IN.
        </div>
        <div
          style={{
            ...MONO,
            marginTop: 8,
            fontSize: 11,
            lineHeight: 1.5,
            letterSpacing: ".04em",
            color: "var(--dim)",
          }}
        >
          Position{" "}
          <span style={{ color: "var(--silver)" }}>#{state.position}</span>{" "}
          of {state.position + 84}. We&rsquo;ll write before launch.
        </div>
      </div>
    );
  }

  // Supplement-facts panel: heavy header + rule, email entry line, CTA bar
  // bleeding to the panel edges.
  return (
    <form
      onSubmit={onSubmit}
      style={{
        width: "min(360px, 86vw)",
        background: "rgba(255,255,255,0.02)",
        border: ".5px solid var(--hair)",
        padding: "16px 18px 0",
        textAlign: "left",
        // Shrink the whole panel (box + input + button + type) ~20% uniformly.
        // A scale keeps all the responsive sizing — width min(360px, 86vw), the
        // em/px paddings, the calc() button bleed — intact, just rendered at 0.8.
        transform: "scale(0.8)",
        transformOrigin: "top center",
      }}
    >
      <div
        style={{
          ...CN,
          fontWeight: 900,
          fontSize: 30,
          lineHeight: 0.9,
          textTransform: "uppercase",
          letterSpacing: "-.01em",
          color: "var(--silver)",
        }}
      >
        Early Access
      </div>
      <div style={{ height: 6 }} />
      <div style={{ height: 6, background: "var(--silver)" }} />

      <div
        style={{
          ...MONO,
          fontSize: 8,
          letterSpacing: ".28em",
          textTransform: "uppercase",
          color: "var(--dim)",
          padding: "12px 0 6px",
        }}
      >
        Your Email
      </div>
      <input
        id={inputId}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        aria-label="Email address"
        style={{
          ...MONO,
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid rgba(255,255,255,0.25)",
          outline: "none",
          padding: "0 0 10px",
          fontSize: 13,
          letterSpacing: ".04em",
          color: "var(--foreground)",
        }}
      />

      <button
        type="submit"
        disabled={pending}
        style={{
          ...MONO,
          width: "calc(100% + 36px)",
          marginLeft: -18,
          marginTop: 16,
          height: 50,
          border: "none",
          borderTop: ".5px solid var(--hair)",
          background: pending ? "rgba(196,196,196,0.6)" : "var(--silver)",
          color: "#000",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".24em",
          textTransform: "uppercase",
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Submitting…" : "Join the Waitlist"}
      </button>

      {error && (
        <p
          aria-live="polite"
          style={{
            ...MONO,
            margin: "12px 0 16px",
            fontSize: 10,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--dim)",
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
