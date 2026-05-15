"use client";

import { useState, useTransition } from "react";
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

  if (state.submitted && state.position !== null) {
    return (
      <div
        style={{
          padding: "20px 22px",
          borderRadius: 16,
          background: "rgba(255,255,255,.04)",
          border: ".5px solid var(--hair)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cn)",
            fontWeight: 900,
            fontSize: 28,
            lineHeight: 1,
            letterSpacing: ".01em",
            color: "var(--accent)",
          }}
        >
          YOU&rsquo;RE IN.
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            lineHeight: 1.5,
            letterSpacing: ".04em",
            color: "var(--dim)",
          }}
        >
          Position{" "}
          <span style={{ color: "var(--foreground)" }}>#{state.position}</span>{" "}
          of {state.position + 84}. We&rsquo;ll write before launch.
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          gap: 8,
        }}
      >
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          style={{
            flex: 1,
            background: "transparent",
            border: ".5px solid var(--hair)",
            outline: "none",
            minWidth: 0,
            height: 44,
            padding: "0 16px",
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            lineHeight: 1,
            letterSpacing: ".01em",
            color: "var(--foreground)",
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--foreground)",
            color: "var(--background)",
            border: "none",
            height: 44,
            padding: "0 18px",
            cursor: pending ? "default" : "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            lineHeight: 1,
            letterSpacing: ".24em",
            textTransform: "uppercase",
            borderRadius: 0,
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Joining…" : "Join"}
        </button>
      </form>
      {error && (
        <p
          aria-live="polite"
          style={{
            marginTop: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "var(--dim)",
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}
