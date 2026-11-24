"use client";
import { useMemo, useState } from "react";
import type { useBrickStore } from "@/hooks/useBrickStore";
import {
  BRICKS,
  COLOR_PALETTE,
} from "@/constants/bricks";
import type { BrickDefinition } from "@/types/lego";
import { Hash, RotateCw } from "lucide-react";
import styles from "./BottomDock.module.css";

type Store = ReturnType<typeof useBrickStore>;

const CATS = [
  { key: "brick", label: "Bricks" },
  { key: "plate", label: "Plates" },
  { key: "tile", label: "Tiles" },
] as const;

// Clean CSS badge that shows the stud footprint or smooth tile cleanly inside the button
function DimensionBadge({ def }: { def: BrickDefinition }) {
  if (def.category === "tile") {
    // Smooth tile preview (no studs)
    const w = def.width === 1 ? 6 : 12;
    const h = def.depth === 2 ? 12 : 7;
    return (
      <span
        style={{
          width: 14,
          height: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-hidden
      >
        <span
          style={{
            width: w,
            height: h,
            borderRadius: 2,
            border: "1px solid currentColor",
            background: "currentColor",
            opacity: 0.45,
          }}
        />
      </span>
    );
  }

  // Bricks & plates with studs: scale stud size and gap so height NEVER overflows 16px
  const maxDim = Math.max(def.width, def.depth);
  const studSize = maxDim >= 4 ? 2.8 : maxDim === 3 ? 3.4 : 4.2;
  const gap = maxDim >= 4 ? 1 : 1.2;

  const cells: number[] = [];
  for (let i = 0; i < def.width * def.depth; i++) cells.push(i);

  return (
    <span
      style={{
        width: 14,
        height: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
      aria-hidden
    >
      <span
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${def.width}, ${studSize}px)`,
          gap: `${gap}px`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cells.map((i) => (
          <span
            key={i}
            style={{
              width: studSize,
              height: studSize,
              background: "currentColor",
              borderRadius: 1,
              opacity: 0.6,
            }}
          />
        ))}
      </span>
    </span>
  );
}

export function BottomDock({ store }: { store: Store }) {
  const {
    placed,
    selectedBrickId,
    setSelectedBrickId,
    selectedColor,
    setSelectedColor,
    rotation,
    rotate,
  } = store;
  const [cat, setCat] = useState<(typeof CATS)[number]["key"]>("brick");

  const filtered = useMemo(
    () => BRICKS.filter((b) => b.category === cat),
    [cat]
  );

  return (
    <div className={styles.dockContainer}>
      {/* Left: category tabs + brick selector + rotation (+ mobile colors) */}
      <div className={`${styles.panel} ${styles.leftPanel}`}>
        {/* Category tabs + Rotate button */}
        <div className={styles.categoryRow}>
          <div className={styles.categoryTabs}>
            {CATS.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`${styles.btnBase} ${cat === c.key ? styles.btnActive : ""}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button
            onClick={rotate}
            className={styles.btnBase}
            title="Rotate piece (R)"
          >
            <RotateCw size={13} />
            <span>{rotation}&deg;</span>
          </button>
        </div>

        {/* Brick pieces (swipeable on mobile, wraps on wide screens) */}
        <div className={styles.brickList}>
          {filtered.map((b) => {
            const active = b.id === selectedBrickId;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBrickId(b.id)}
                className={`${styles.btnBase} ${active ? styles.btnActive : ""}`}
                title={b.name}
              >
                <DimensionBadge def={b} />
                <span style={{ fontWeight: 600 }}>{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile color swatches + brick counter */}
        <div className={styles.mobileColorRow}>
          <div className={styles.mobileSwatches}>
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`${styles.swatch} ${styles.swatchMobile} ${c === selectedColor ? styles.swatchActive : ""}`}
                style={{ background: c }}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--bc-muted)", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            <Hash size={12} />
            {placed.length}
          </span>
        </div>
      </div>

      {/* Right (Desktop only): color swatches + brick counter */}
      <div className={`${styles.panel} ${styles.rightPanel}`}>
        <div className={styles.swatchGrid}>
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              className={`${styles.swatch} ${c === selectedColor ? styles.swatchActive : ""}`}
              style={{ background: c }}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--bc-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          <Hash size={12} />
          Total Bricks: {placed.length}
        </span>
      </div>
    </div>
  );
}
