"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
};

export function Reveal({ children, className, style, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.setAttribute("data-rev", "1");

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    // Safety net: ensure content always reveals even if IO never fires
    // (iOS Safari can miss events in some scroll/restore states).
    const fallback = window.setTimeout(show, 1200);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show();
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-rev=""
      className={className}
      style={{
        ...style,
        transitionDelay: delay ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
