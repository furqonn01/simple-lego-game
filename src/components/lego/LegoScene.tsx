"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Baseplate } from "./Baseplate";
import { BrickMesh } from "./BrickMesh";
import { GhostBrick } from "./GhostBrick";
import { Table } from "./Table";
import { TopToolbar } from "@/components/hud/TopToolbar";
import { BottomDock } from "@/components/hud/BottomDock";
import { useTheme } from "@/context/ThemeContext";
import type { CameraPreset } from "@/components/hud/types";
import type { PlacedBrick, Rotation, BrickDefinition } from "@/types/lego";
import {
  DEF_MAP,
  getBrickById,
} from "@/constants/bricks";import {
  computeStackHeight,
  getEffectiveDimensions,
  isValidPlacement,
  worldToGrid,
} from "@/utils/grid";
import { useBrickStore } from "@/hooks/useBrickStore";

const DRAG_THRESHOLD = 5; // px — below this a pointer down/up counts as a click

type Store = ReturnType<typeof useBrickStore>;

// Subtle Web Audio "click/pop" on successful placement — no external assets
function usePopSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      /* audio unavailable — ignore */
    }
  }, []);
}

// Consumes camera-preset requests from the HUD via a DOM CustomEvent
function CameraPresetController() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target?: { set: (x: number, y: number, z: number) => void };
    update: () => void;
  } | null;

  const apply = useCallback(
    (preset: CameraPreset) => {
      let pos: [number, number, number] = [14, 14, 14];
      switch (preset) {
        case "top":
          pos = [0, 32, 0.01];
          break;
        case "front":
          pos = [0, 4, 22];
          break;
        case "iso":
        case "reset":
        default:
          pos = [14, 14, 14];
          break;
      }
      camera.position.set(...pos);
      if (controls) {
        controls.target?.set(0, -4, 0);
        controls.update();
      }
    },
    [camera, controls]
  );

  useEffect(() => {
    const onPreset = (e: Event) => {
      apply((e as CustomEvent<CameraPreset>).detail);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        apply("reset");
      }
    };
    window.addEventListener("brickcraft:set-camera", onPreset);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("brickcraft:set-camera", onPreset);
      window.removeEventListener("keydown", onKey);
    };
  }, [apply]);

  return null;
}

function GridOverlay() {
  const { theme } = useTheme();
  const a = theme === "dark" ? 0x94a3b8 : 0x475569;
  const b = theme === "dark" ? 0x334155 : 0x94a3b8;
  return <gridHelper args={[32, 32, a, b]} position={[0, 0.01, 0]} />;
}

function Scene({ store, showGrid }: { store: Store; showGrid: boolean }) {
  const { placed, commit, selectedBrickId, selectedColor, rotation, toolMode } =
    store;
  const { theme } = useTheme();

  const activeDef = getBrickById(selectedBrickId);
  const defs = DEF_MAP;
  const pop = usePopSound();

  const [ghost, setGhost] = useState<{
    gx: number;
    gy: number;
    gz: number;
    valid: boolean;
  } | null>(null);

  // Per-brick hover highlight for erase/paint modes
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const downPos = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const p = e.nativeEvent as PointerEvent;
    downPos.current = { x: p.clientX, y: p.clientY };
  };

  const isClick = useCallback((e: ThreeEvent<MouseEvent>): boolean => {
    const d = downPos.current;
    if (!d) return true;
    const p = e.nativeEvent as MouseEvent;
    return Math.hypot(p.clientX - d.x, p.clientY - d.y) < DRAG_THRESHOLD;
  }, []);

  const stackAt = useCallback(
    (gx: number, gz: number, def: BrickDefinition, rot: Rotation) => {
      const dims = getEffectiveDimensions(def, rot);
      return computeStackHeight(gx, gz, dims.effWidth, dims.effDepth, placed, defs);
    },
    [placed, defs]
  );

  const applyAt = useCallback(
    (gx: number, gz: number) => {
      const gy = stackAt(gx, gz, activeDef, rotation);
      if (!isValidPlacement(gx, gy, gz, activeDef, rotation, placed, defs)) return;
      const brick: PlacedBrick = {
        instanceId: crypto.randomUUID(),
        definitionId: activeDef.id,
        gx,
        gy,
        gz,
        rotation,
        color: selectedColor,
      };
      commit([...placed, brick]);
      pop();
    },
    [stackAt, activeDef, rotation, placed, defs, commit, selectedColor, pop]
  );

  const applyToBrick = useCallback(
    (target: PlacedBrick) => {
      if (toolMode === "erase") {
        commit(placed.filter((b) => b.instanceId !== target.instanceId));
        setHoveredId(null);
      } else if (toolMode === "paint") {
        commit(
          placed.map((b) =>
            b.instanceId === target.instanceId
              ? { ...b, color: selectedColor }
              : b
          )
        );
      }
    },
    [toolMode, placed, commit, selectedColor]
  );

  // Hover: ghost preview only in build mode
  const handleHover = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (toolMode !== "build") {
        setGhost(null);
        return;
      }
      const { gx, gz } = worldToGrid(e.point, activeDef, rotation);
      const gy = stackAt(gx, gz, activeDef, rotation);
      const valid = isValidPlacement(
        gx,
        gy,
        gz,
        activeDef,
        rotation,
        placed,
        defs
      );
      setGhost({ gx, gy, gz, valid });
    },
    [toolMode, activeDef, rotation, stackAt, placed, defs]
  );

  const handleBrickMove = useCallback(
    (b: PlacedBrick) => (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (toolMode === "erase" || toolMode === "paint")
        setHoveredId(b.instanceId);
    },
    [toolMode]
  );
  const handleBrickOut = useCallback(() => setHoveredId(null), []);

  const handlePlateClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!isClick(e)) return;
      if (toolMode !== "build") return;
      const { gx, gz } = worldToGrid(e.point, activeDef, rotation);
      applyAt(gx, gz);
    },
    [isClick, toolMode, activeDef, rotation, applyAt]
  );

  const handleBrickClick = useCallback(
    (brick: PlacedBrick) =>
      (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (!isClick(e)) return;
        if (toolMode === "erase" || toolMode === "paint") {
          applyToBrick(brick);
        }
      },
    [isClick, toolMode, applyToBrick]
  );

  const clearGhost = useCallback(() => setGhost(null), []);

  return (
    <>
      <ambientLight intensity={theme === "dark" ? 0.35 : 0.5} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={theme === "dark" ? 1.1 : 1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-15, 10, -15]} intensity={0.4} />

      <Table />
      <Baseplate
        onPointerDown={onPointerDown}
        onPointerMove={handleHover}
        onPointerOut={clearGhost}
        onClick={handlePlateClick}
      />
      {showGrid && <GridOverlay />}
      {placed.map((b) => {
        const def = defs.get(b.definitionId)!;
        return (
          <BrickMesh
            key={b.instanceId}
            brick={b}
            def={def}
            hovered={hoveredId === b.instanceId}
            onPointerDown={onPointerDown}
            onPointerMove={handleBrickMove(b)}
            onPointerOut={handleBrickOut}
            onClick={handleBrickClick(b)}
          />
        );
      })}
      {ghost && (
        <GhostBrick
          gx={ghost.gx}
          gy={ghost.gy}
          gz={ghost.gz}
          def={activeDef}
          rotation={rotation}
          color={selectedColor}
          valid={ghost.valid}
        />
      )}
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={80}
        target={[0, -4, 0]}
      />
      <CameraPresetController />
    </>
  );
}

export default function LegoScene() {
  const store = useBrickStore();
  const { theme } = useTheme();
  const [showGrid, setShowGrid] = useState(false);
  const toggleGrid = useCallback(() => setShowGrid((g) => !g), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "G") toggleGrid();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleGrid]);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas
        shadows
        camera={{ position: [14, 14, 14], fov: 45 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <color attach="background" args={[theme === "dark" ? "#0f172a" : "#f1f5f9"]} />
        <Scene store={store} showGrid={showGrid} />
      </Canvas>
      <TopToolbar store={store} showGrid={showGrid} toggleGrid={toggleGrid} />
      <BottomDock store={store} />
    </div>
  );
}
