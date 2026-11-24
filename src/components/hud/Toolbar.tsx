"use client";
import {
  BRICKS,
  COLOR_PALETTE,
} from "@/constants/bricks";
import type { ToolMode } from "@/types/lego";
import type { useBrickStore } from "@/hooks/useBrickStore";
import {
  Undo2,
  Redo2,
  RotateCw,
  Hammer,
  Eraser,
  PaintBucket,
  Hash,
} from "lucide-react";

type Store = ReturnType<typeof useBrickStore>;

export function Toolbar({ store }: { store: Store }) {
  const {
    selectedBrickId,
    setSelectedBrickId,
    selectedColor,
    setSelectedColor,
    rotation,
    rotate,
    toolMode,
    setToolMode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = store;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 10,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Brick selector (grouped by category) */}
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 10,
          maxWidth: 220,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Brick</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {BRICKS.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBrickId(b.id)}
              style={{
                padding: "4px 6px",
                fontSize: 12,
                borderRadius: 6,
                border:
                  b.id === selectedBrickId
                    ? "2px solid #3b82f6"
                    : "1px solid #cbd5e1",
                background:
                  b.id === selectedBrickId ? "#dbeafe" : "#fff",
                cursor: "pointer",
                minWidth: 44,
              }}
              title={`${b.name} (${b.category})`}
            >
              <span style={{ fontWeight: 700 }}>{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color + rotation + tool */}
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: c,
                border:
                  c === selectedColor
                    ? "2px solid #1e293b"
                    : "1px solid #cbd5e1",
                cursor: "pointer",
              }}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={rotate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <RotateCw size={14} />
            {rotation}&deg;
          </button>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(
            [
              ["build", Hammer, "Build"],
              ["erase", Eraser, "Erase"],
              ["paint", PaintBucket, "Paint"],
            ] as [ToolMode, typeof Hammer, string][]
          ).map(([mode, Icon, label]) => (
            <button
              key={mode}
              onClick={() => setToolMode(mode)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 6,
                border:
                  toolMode === mode
                    ? "2px solid #3b82f6"
                    : "1px solid #cbd5e1",
                background: toolMode === mode ? "#dbeafe" : "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: canUndo ? "#fff" : "#f1f5f9",
              fontSize: 12,
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.5,
            }}
          >
            <Undo2 size={14} />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: canRedo ? "#fff" : "#f1f5f9",
              fontSize: 12,
              cursor: canRedo ? "pointer" : "not-allowed",
              opacity: canRedo ? 1 : 0.5,
            }}
          >
            <Redo2 size={14} />
            Redo
          </button>
          <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
            <Hash size={12} />
            {store.placed.length}
          </span>
        </div>
      </div>
    </div>
  );
}
