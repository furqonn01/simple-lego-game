"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlacedBrick, Rotation, ToolMode } from "@/types/lego";

const STORAGE_KEY = "brickcraft_save_v1";

function loadSave(): PlacedBrick[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlacedBrick[]) : [];
  } catch {
    return [];
  }
}

export function useBrickStore() {
  const [placed, setPlaced] = useState<PlacedBrick[]>([]);
  const [selectedBrickId, setSelectedBrickId] = useState<string>("brick-2x4");
  const [selectedColor, setSelectedColor] = useState<string>("#e11d48");
  const [rotation, setRotation] = useState<Rotation>(0);
  const [toolMode, setToolMode] = useState<ToolMode>("build");

  // Undo / Redo stacks of placed-brick snapshots
  const past = useRef<PlacedBrick[][]>([]);
  const future = useRef<PlacedBrick[][]>([]);
  const loadedRef = useRef(false);

  // Lazy-load the save exactly once
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setPlaced(loadSave());
  }, []);

  // Persist on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(placed));
    } catch {
      /* storage full/unavailable — ignore */
    }
  }, [placed]);

  const commit = useCallback((next: PlacedBrick[]) => {
    setPlaced((prev) => {
      past.current = [...past.current, prev];
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    setPlaced((cur) => {
      future.current = [cur, ...future.current];
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    setPlaced((cur) => {
      past.current = [...past.current, cur];
      return next;
    });
  }, []);

  const rotate = useCallback(() => {
    setRotation((r) => (((r + 90) % 360) as Rotation));
  }, []);

  // Keyboard bindings
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "r" || e.key === "R") {
        rotate();
        return;
      }
      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, rotate]);

  const canUndo = useMemo(
    () => past.current.length > 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed]
  );
  const canRedo = useMemo(
    () => future.current.length > 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed]
  );

  return {
    placed,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedBrickId,
    setSelectedBrickId,
    selectedColor,
    setSelectedColor,
    rotation,
    rotate,
    toolMode,
    setToolMode,
  };
}
