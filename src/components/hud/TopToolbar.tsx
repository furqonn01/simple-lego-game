"use client";
import { useState, useRef, useEffect } from "react";
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
  MoreVertical,
  X,
} from "lucide-react";
import { requestCameraPreset } from "./types";
import { useTheme } from "@/context/ThemeContext";
import styles from "./TopToolbar.module.css";

type Store = ReturnType<typeof useBrickStore>;

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
  const cells = new Set<string>();
  for (const b of out) {
    const def = DEF_MAP.get(b.definitionId)!;
    const dims = getEffectiveDimensions(def, b.rotation);
    const x0 = b.gx, x1 = b.gx + dims.effWidth - 1;
    const z0 = b.gz, z1 = b.gz + dims.effDepth - 1;
    const y0 = b.gy, y1 = b.gy + def.heightInPlates - 1;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onClickOutside);
    return () => window.removeEventListener("pointerdown", onClickOutside);
  }, [mobileMenuOpen]);

  const handleExport = () => {
    const data = JSON.stringify(placed, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brickcraft-blueprint.json";
    a.click();
    URL.revokeObjectURL(url);
    setMobileMenuOpen(false);
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
        setMobileMenuOpen(false);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClear = () => {
    if (placed.length === 0) return;
    if (confirm(`Clear all ${placed.length} bricks? This can be undone.`)) {
      store.commit([]);
      setMobileMenuOpen(false);
    }
  };

  const toolBtn = (mode: "build" | "paint" | "erase", Icon: typeof Box, label: string) => {
    const active = toolMode === mode;
    return (
      <button
        key={mode}
        onClick={() => setToolMode(mode)}
        className={`${styles.btn} ${styles.segBtn} ${active ? styles.btnActive : ""}`}
        title={`${label} Mode`}
      >
        <Icon size={14} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className={styles.toolbarContainer}>
      {/* Left panel: Build / Paint / Erase modes */}
      <div className={styles.panel}>
        <div className={styles.seg}>
          {toolBtn("build", Box, "Build")}
          {toolBtn("paint", PaintBucket, "Paint")}
          {toolBtn("erase", Eraser, "Erase")}
        </div>

        {/* Desktop Undo/Redo & Rotate */}
        <div className={styles.desktopOnly}>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={undo}
              disabled={!canUndo}
              className={styles.btn}
              style={{ opacity: canUndo ? 1 : 0.4 }}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} /> Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={styles.btn}
              style={{ opacity: canRedo ? 1 : 0.4 }}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={14} /> Redo
            </button>
          </div>
          <button onClick={rotate} className={styles.btn} title="Rotate piece (R)">
            <RotateCw size={14} /> {rotation}&deg;
          </button>
        </div>
      </div>

      {/* Right panel: Desktop full tools + Mobile compact actions */}
      <div className={styles.panel} ref={popoverRef}>
        {/* Desktop: Camera + Blueprint + Grid + Theme */}
        <div className={styles.desktopOnly}>
          <div className={styles.seg}>
            <button onClick={() => requestCameraPreset("iso")} className={styles.btn} title="Isometric view">
              <Camera size={14} /> Iso
            </button>
            <button onClick={() => requestCameraPreset("top")} className={styles.btn} title="Top view">
              <LayoutGrid size={14} /> Top
            </button>
            <button onClick={() => requestCameraPreset("front")} className={styles.btn} title="Front view">
              <Maximize2 size={14} /> Front
            </button>
            <button onClick={() => requestCameraPreset("reset")} className={styles.btn} title="Reset view (Space)">
              Reset
            </button>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleExport} className={styles.btn} title="Export blueprint">
              <Download size={14} /> Export
            </button>
            <button onClick={handleImport} className={styles.btn} title="Import blueprint">
              <Upload size={14} /> Import
            </button>
            <button
              onClick={handleClear}
              className={styles.btn}
              style={{
                borderColor: "var(--bc-danger-border)",
                background: "var(--bc-danger-bg)",
                color: "var(--bc-danger-text)",
              }}
              title="Clear all bricks"
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
          <button
            onClick={toggleGrid}
            className={`${styles.btn} ${showGrid ? styles.btnActive : ""}`}
            title="Toggle grid overlay (G)"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={toggleTheme}
            className={styles.btn}
            title="Toggle theme"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <span style={{ fontSize: 12, color: "var(--bc-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Hash size={12} />
            {placed.length}
          </span>
        </div>

        {/* Mobile: Compact Undo, Redo, Theme, and Menu */}
        <div className={styles.mobileOnly}>
          <button
            onClick={undo}
            disabled={!canUndo}
            className={styles.btn}
            style={{ opacity: canUndo ? 1 : 0.4 }}
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={styles.btn}
            style={{ opacity: canRedo ? 1 : 0.4 }}
            title="Redo"
          >
            <Redo2 size={16} />
          </button>
          <button
            onClick={toggleTheme}
            className={styles.btn}
            title="Theme"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className={`${styles.btn} ${mobileMenuOpen ? styles.btnActive : ""}`}
            title="Menu & Camera"
          >
            {mobileMenuOpen ? <X size={16} /> : <MoreVertical size={16} />}
          </button>
        </div>

        {/* Mobile Dropdown Popover */}
        {mobileMenuOpen && (
          <div className={styles.popover}>
            <div className={styles.popoverSection}>
              <div className={styles.popoverTitle}>Camera Views</div>
              <div className={styles.popoverRow}>
                <button
                  onClick={() => {
                    requestCameraPreset("iso");
                    setMobileMenuOpen(false);
                  }}
                  className={styles.btn}
                >
                  <Camera size={13} /> Iso
                </button>
                <button
                  onClick={() => {
                    requestCameraPreset("top");
                    setMobileMenuOpen(false);
                  }}
                  className={styles.btn}
                >
                  <LayoutGrid size={13} /> Top
                </button>
                <button
                  onClick={() => {
                    requestCameraPreset("front");
                    setMobileMenuOpen(false);
                  }}
                  className={styles.btn}
                >
                  <Maximize2 size={13} /> Front
                </button>
                <button
                  onClick={() => {
                    requestCameraPreset("reset");
                    setMobileMenuOpen(false);
                  }}
                  className={styles.btn}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className={styles.popoverSection}>
              <div className={styles.popoverTitle}>Blueprint & Tools</div>
              <div className={styles.popoverRow}>
                <button onClick={handleExport} className={styles.btn}>
                  <Download size={13} /> Export
                </button>
                <button onClick={handleImport} className={styles.btn}>
                  <Upload size={13} /> Import
                </button>
                <button
                  onClick={handleClear}
                  className={styles.btn}
                  style={{
                    borderColor: "var(--bc-danger-border)",
                    background: "var(--bc-danger-bg)",
                    color: "var(--bc-danger-text)",
                  }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
            </div>

            <div className={styles.popoverSection}>
              <div className={styles.popoverTitle}>Display</div>
              <div className={styles.popoverRow}>
                <button
                  onClick={() => {
                    toggleGrid();
                  }}
                  className={`${styles.btn} ${showGrid ? styles.btnActive : ""}`}
                >
                  <LayoutGrid size={13} /> Grid: {showGrid ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--bc-muted)", display: "flex", alignItems: "center", gap: 4, paddingTop: 4, borderTop: "1px solid var(--bc-divider)" }}>
              <Hash size={12} />
              Total Placed: <strong>{placed.length}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
