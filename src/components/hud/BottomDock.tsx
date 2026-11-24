"use client";
import { useMemo, useState } from "react";
import type { useBrickStore } from "@/hooks/useBrickStore";
import {
  BRICKS,
  COLOR_PALETTE,
} from "@/constants/bricks";
import type { BrickDefinition } from "@/types/lego";
import { Hash } from "lucide-react";

type Store = ReturnType<typeof useBrickStore>;

const CATS = [
  { key: "brick", label: "Bricks" },
  { key: "plate", label: "Plates" },
  { key: "tile", label: "Tiles" },
] as const;

// Small CSS badge that shows the stud footprint (e.g. 2x4) as a grid of squares
function DimensionBadge({ def }: { def: BrickDefinition }) {
  const cells: number[] = [];
  for (let i = 0; i < def.width * def.depth; i++) cells.push(i);
  return (
    <span
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${def.width}, 6px)`,
        gap: 1,
        height: 14,
      }}
      aria-hidden
    >
      {cells.map((i) => (
        <span key={i} style={{ width: 6, height: 6, background: "currentColor", borderRadius: 1, opacity: 0.5 }} />
      ))}
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

  const btnBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid var(--bc-btn-border)",
    background: "var(--bc-btn)",
    color: "var(--bc-text)",
    fontSize: 12,
    cursor: "pointer",
  };

  const panelStyle: React.CSSProperties = {
    background: "var(--bc-panel)",
    border: "1px solid var(--bc-btn-border)",
    borderRadius: 10,
    padding: 8,
    boxShadow: "var(--bc-shadow)",
    pointerEvents: "auto" as const,
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        right: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        zIndex: 10,
        pointerEvents: "none",
        fontFamily: "Arial, sans-serif",
        color: "var(--bc-text)",
      }}
    >
      {/* Left: category tabs + brick selector + rotation */}
      <div style={{ ...panelStyle, maxWidth: "min(480px, 70vw)" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              style={{
                ...btnBase,
                color: cat === c.key ? "var(--bc-active-text)" : "var(--bc-text)",
                border: cat === c.key ? "2px solid var(--bc-accent)" : "1px solid transparent",
                background: cat === c.key ? "var(--bc-active)" : "transparent",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, color: "var(--bc-text)" }}>
          {filtered.map((b) => {
            const active = b.id === selectedBrickId;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBrickId(b.id)}
                style={{
                  ...btnBase,
                  color: active ? "var(--bc-active-text)" : "var(--bc-text)",
                  border: active ? "2px solid var(--bc-accent)" : "1px solid var(--bc-btn-border)",
                  background: active ? "var(--bc-active)" : "var(--bc-btn)",
                }}
                title={b.name}
              >
                <DimensionBadge def={b} />
                <span style={{ fontWeight: 600, color: "var(--bc-text)" }}>{b.name}</span>
              </button>
            );
          })}
          <button
            onClick={rotate}
            style={{ ...btnBase, marginLeft: 4 }}
            title="Rotate (R)"
          >
            Rotate {rotation}&deg;
          </button>
        </div>
      </div>

      {/* Right: color swatches + brick counter */}
      <div
        style={{
          ...panelStyle,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 160 }}>
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: c,
                border: c === selectedColor ? "2px solid var(--bc-text)" : "1px solid var(--bc-btn-border)",
                cursor: "pointer",
              }}
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
