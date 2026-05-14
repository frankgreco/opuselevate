"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinWaitlist, type WaitlistState } from "../actions/waitlist";

const initialState: WaitlistState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex items-center justify-center gap-3 rounded-full bg-foreground px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-background transition-transform hover:scale-[1.02] disabled:opacity-60"
    >
      {pending ? "Joining…" : "Join"}
      {!pending && (
        <span className="transition-transform group-hover:translate-x-1">
          →
        </span>
      )}
    </button>
  );
}

export function WaitlistForm() {
  const [state, formAction] = useActionState(joinWaitlist, initialState);

  return (
    <div id="waitlist" className="space-y-3">
      <form
        action={formAction}
        className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="your@email.com"
          aria-label="Email address"
          className="flex-1 rounded-full border border-border bg-transparent px-5 py-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <SubmitButton />
      </form>
      <p
        aria-live="polite"
        className={`min-h-4 font-mono text-xs uppercase tracking-[0.2em] ${
          state.ok ? "text-accent" : "text-muted"
        }`}
      >
        {state.message}
      </p>
    </div>
  );
}
