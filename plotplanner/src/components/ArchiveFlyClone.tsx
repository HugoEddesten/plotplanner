import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Text, Badge } from "@mantine/core";

interface Props {
  fromRect: DOMRect;
  toRect: DOMRect;
  plantName: string;
  onDone: () => void;
}

/**
 * A fixed-position visual stand-in for the cell modal, flown from its own
 * spot toward a target element (the History button) via CSS custom
 * properties consumed by the .archive-fly-clone keyframes in index.css.
 * Rendered through a portal so `position: fixed` is relative to the
 * viewport rather than any transformed Mantine Modal ancestor.
 */
export default function ArchiveFlyClone({ fromRect, toRect, plantName, onDone }: Props) {
  const elRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
    const scale = Math.max(toRect.height / fromRect.height, 0.05);

    el.style.setProperty("--dx", `${dx}px`);
    el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--s", scale.toFixed(3));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.classList.add("archive-fly-clone");
    if (reduced) el.classList.add("archive-fly-reduced");

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };

    el.addEventListener("animationend", finish, { once: true });
    // Safety net: animationend can be missed (element hidden mid-flight,
    // interrupted animation, etc.) — never let the modal get stuck open.
    const fallback = window.setTimeout(finish, reduced ? 260 : 760);

    return () => {
      el.removeEventListener("animationend", finish);
      window.clearTimeout(fallback);
    };
    // Deliberately run once: this clone is mounted fresh for exactly one
    // flight, and fromRect/toRect/onDone only make sense at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      ref={elRef}
      style={{
        position: "fixed",
        left: fromRect.left,
        top: fromRect.top,
        width: fromRect.width,
        height: fromRect.height,
        zIndex: 10000,
        pointerEvents: "none",
      }}
    >
      <Box
        style={{
          width: "100%",
          height: "100%",
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          boxShadow: "0 12px 32px -8px rgb(43 74 44 / 0.28)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <Text size="xs" c="dimmed">
          Archived
        </Text>
        <Badge color="green" size="lg" radius="sm">
          {plantName}
        </Badge>
      </Box>
    </div>,
    document.body,
  );
}
