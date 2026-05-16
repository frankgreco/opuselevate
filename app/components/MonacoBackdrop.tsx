import { getImageProps } from "next/image";

const common = {
  alt: "",
  sizes: "100vw",
};

export function MonacoBackdrop() {
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({
    ...common,
    src: "/monaco-desktop.jpg",
    width: 1280,
    height: 720,
  });
  const {
    props: { srcSet: mobileSet, ...rest },
  } = getImageProps({
    ...common,
    src: "/monaco-mobile.jpg",
    width: 720,
    height: 1280,
  });

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <picture>
        <source media="(min-width: 768px)" srcSet={desktopSet} />
        <source srcSet={mobileSet} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...rest}
          alt=""
          fetchPriority="high"
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </picture>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(12,12,12,0.35) 0%, rgba(12,12,12,0.55) 55%, var(--background) 100%)",
        }}
      />
    </div>
  );
}
