"use client";
import type { useBrickStore } from "@/hooks/useBrickStore";
import { DEF_MAP } from "@/constants/bricks";
import type { PlacedBrick, Rotation } from "@/types/lego";
import { getEffectiveDimensions } from "@/utils/grid";
import {
  Undo2,
  Redo2,
  RotateCw,
  Download,
  Upload,
  Trash2,
  Maximize2,
  LayoutGrid,
  Box,
  Camera,
  Eraser,
  PaintBucket,
  Hash,
  Sun,
  Moon,
} from "lucide-react";
import { requestCameraPreset } from "./types";
import { useTheme } from "@/context/ThemeContext";

type Store = ReturnType<typeof useBrickStore>;

// Validation for blueprint import — rejects unknown bricks / out-of-bounds / collisions
function validateBlueprint(raw: unknown): PlacedBrick[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PlacedBrick[] = [];
  for (const b of raw) {
    if (
      !b ||
      typeof b.instanceId !== "string" ||
      typeof b.definitionId !== "string" ||
      !DEF_MAP.has(b.definitionId) ||
      !Number.isInteger(b.gx) ||
      !Number.isInteger(b.gz) ||
      !Number.isInteger(b.gy) ||
      b.gy < 0 ||
      (b.rotation !== 0 && b.rotation !== 90 && b.rotation !== 180 && b.rotation !== 270) ||
      typeof b.color !== "string"
    ) {
      return null;
    }
    out.push({
      instanceId: b.instanceId,
      definitionId: b.definitionId,
      gx: b.gx,
      gy: b.gy,
      gz: b.gz,
      rotation: b.rotation as Rotation,
      color: b.color,
    });
  }
  // No cell may be occupied by two bricks
  const cells = new Set<string>();
  for (const b of out) {
    const def = DEF_MAP.get(b.definitionId)!;
    const dims = getEffectiveDimensions(def, b.rotation);
    const x0 = b.gx, x1 = b.gx + dims.effWidth - 1;
    const z0 = b.gz, z1 = b.gz + dims.effDepth - 1;
    const y0 = b.gy, y1 = b.gy + def.heightInPlates - 1;
    // Same bounds as isValidPlacement: footprint within [-16, 15]
    if (x0 < -16 || z0 < -16 || x1 > 32 - 16 || z1 > 32 - 16) return null;
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++)
        for (let y = y0; y <= y1; y++) {
          const key = `${x},${y},${z}`;
          if (cells.has(key)) return null;
          cells.add(key);
        }
  }
  return out;
}

const btn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid var(--bc-btn-border)",
  background: "var(--bc-btn)",
  color: "var(--bc-text)",
  fontSize: 12,
  cursor: "pointer",
};

const seg: React.CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 2,
  background: "var(--bc-seg)",
  borderRadius: 8,
  color: "var(--bc-text)",
};

const panel: React.CSSProperties = {
  background: "var(--bc-panel)",
  border: "1px solid var(--bc-btn-border)",
  borderRadius: 10,
  padding: 8,
  boxShadow: "var(--bc-shadow)",
};

export function TopToolbar({
  store,
  showGrid,
  toggleGrid,
}: {
  store: Store;
  showGrid: boolean;
  toggleGrid: () => void;
}) {
  const {
    placed,
    undo,
    redo,
    canUndo,
    canRedo,
    toolMode,
    setToolMode,
    rotation,
    rotate,
  } = store;
  const { theme, toggle: toggleTheme } = useTheme();

  const handleExport = () => {
    const data = JSON.stringify(placed, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brickcraft-blueprint.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch {
          alert("Invalid JSON blueprint");
          return;
        }
        const valid = validateBlueprint(parsed);
        if (!valid) {
          alert("Blueprint failed validation (unknown brick, out of bounds, or collision).");
          return;
        }
        store.commit(valid);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClear = () => {
    if (placed.length === 0) return;
    if (confirm(`Clear all ${placed.length} bricks? This can be undone.`)) {
      store.commit([]);
    }
  };

  const toolBtn = (mode: "build" | "paint" | "erase", Icon: typeof Box, label: string) => (
    <button
      key={mode}
      onClick={() => setToolMode(mode)}
      style={{
        ...btn,
        color: toolMode === mode ? "var(--bc-active-text)" : "var(--bc-text)",
        border: toolMode === mode ? "2px solid var(--bc-accent)" : "1px solid transparent",
        background: toolMode === mode ? "var(--bc-active)" : "transparent",
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
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
      {/* Left: tool + undo/redo + rotation */}
      <div style={{ ...panel, display: "flex", alignItems: "center", gap: 10, pointerEvents: "auto" }}>
        <div style={seg}>
          {toolBtn("build", Box, "Build")}
          {toolBtn("paint", PaintBucket, "Paint")}
          {toolBtn("erase", Eraser, "Erase")}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={undo} disabled={!canUndo} style={{ ...btn, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "not-allowed", background: canUndo ? "var(--bc-btn)" : "var(--bc-btn-disabled)" }}>
            <Undo2 size={14} /> Undo
          </button>
          <button onClick={redo} disabled={!canRedo} style={{ ...btn, opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "not-allowed", background: canRedo ? "var(--bc-btn)" : "var(--bc-btn-disabled)" }}>
            <Redo2 size={14} /> Redo
          </button>
        </div>
        <button onClick={rotate} style={btn} title="Rotate (R)">
          <RotateCw size={14} /> {rotation}&deg;
        </button>
      </div>

      {/* Right: camera + blueprint + grid */}
      <div style={{ ...panel, display: "flex", alignItems: "center", gap: 10, pointerEvents: "auto" }}>
        <div style={seg}>
          <button onClick={() => requestCameraPreset("iso")} style={btn} title="Isometric view"><Camera size={14} /> Iso</button>
          <button onClick={() => requestCameraPreset("top")} style={btn} title="Top view"><LayoutGrid size={14} /> Top</button>
          <button onClick={() => requestCameraPreset("front")} style={btn} title="Front view"><Maximize2 size={14} /> Front</button>
          <button onClick={() => requestCameraPreset("reset")} style={btn} title="Reset view (Space)">Reset</button>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={handleExport} style={btn} title="Export blueprint"><Download size={14} /> Export</button>
          <button onClick={handleImport} style={btn} title="Import blueprint"><Upload size={14} /> Import</button>
          <button onClick={handleClear} style={{ ...btn, border: "1px solid var(--bc-danger-border)", background: "var(--bc-danger-bg)", color: "var(--bc-danger-text)" }} title="Clear board"><Trash2 size={14} /> Clear</button>
        </div>
        <button
          onClick={toggleGrid}
          style={{ ...btn, color: showGrid ? "var(--bc-active-text)" : "var(--bc-text)", opacity: showGrid ? 1 : 0.5, background: showGrid ? "var(--bc-active)" : "var(--bc-btn)", border: showGrid ? "2px solid var(--bc-accent)" : "1px solid var(--bc-btn-border)" }}
          title="Toggle grid (G)"
        >
          <LayoutGrid size={14} />
        </button>
        <button onClick={toggleTheme} style={btn} title="Toggle theme" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <span style={{ fontSize: 12, color: "var(--bc-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          <Hash size={12} />
          {placed.length}
        </span>
      </div>
    </div>
  );
}
