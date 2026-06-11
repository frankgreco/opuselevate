// Single source of truth for the three-phase stack. Rendered by the hero
// beats (components/Elevate.tsx) and published to LLM crawlers
// (llms.txt/route.ts) — keep dosages/phases here so the two can't drift.

export type Ingredient = {
  /** Short display name used in the hero beats. */
  name: string;
  mg: number;
  /** Long-form name for llms.txt (defaults to `name`). */
  fullName?: string;
  /** Dosage note appended in llms.txt, e.g. the caffeine split. */
  note?: string;
};

export type StackPhase = {
  tag: string;
  name: string;
  /** Active window, uppercase for the hero ("0–20 MIN"). */
  range: string;
  hue: string;
  ings: Ingredient[];
};

export const STACK: StackPhase[] = [
  {
    tag: "01",
    name: "Energy",
    range: "0–20 MIN",
    hue: "#d97a4a",
    ings: [
      { name: "Caffeine", mg: 120, note: "60/40 anhydrous and guarana" },
      { name: "Taurine", mg: 750 },
      { name: "ALCAR", mg: 500, fullName: "Acetyl-L-Carnitine (ALCAR)" },
    ],
  },
  {
    tag: "02",
    name: "Drive",
    range: "30–120 MIN",
    hue: "#a8843e",
    ings: [
      { name: "L-Tyrosine", mg: 500 },
      { name: "Rhodiola", mg: 300 },
    ],
  },
  {
    tag: "03",
    name: "Flow",
    range: "60–240 MIN",
    hue: "#5a8a9e",
    ings: [
      { name: "L-Theanine", mg: 200 },
      { name: "Alpha-GPC", mg: 300 },
    ],
  },
];
