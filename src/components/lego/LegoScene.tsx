"use client";
import { useCallback, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Baseplate } from "./Baseplate";
import { BrickMesh } from "./BrickMesh";
import { GhostBrick } from "./GhostBrick";
import { Toolbar } from "@/components/hud/Toolbar";
import type { PlacedBrick, Rotation, BrickDefinition } from "@/types/lego";
import {
  DEF_MAP,
  getBrickById,
} from "@/constants/bricks";
import {
  computeStackHeight,
  getEffectiveDimensions,
  isValidPlacement,
  worldToGrid,
} from "@/utils/grid";
import { useBrickStore } from "@/hooks/useBrickStore";

const DRAG_THRESHOLD = 5; // px — below this a pointer down/up counts as a click

type Store = ReturnType<typeof useBrickStore>;

function Scene({ store }: { store: Store }) {
  const {
    placed,
    commit,
    selectedBrickId,
    selectedColor,
    rotation,
    toolMode,
  } = store;

  const activeDef = getBrickById(selectedBrickId);
  const defs = DEF_MAP;

  // Ghost preview state
  const [ghost, setGhost] = useState<{
    gx: number;
    gy: number;
    gz: number;
    valid: boolean;
  } | null>(null);

  // Drag detection: record pointer-down position so orbiting never places a brick
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

  // Compute the stack target height for a footprint
  const stackAt = useCallback(
    (gx: number, gz: number, def: BrickDefinition, rot: Rotation) => {
      const dims = getEffectiveDimensions(def, rot);
      return computeStackHeight(gx, gz, dims.effWidth, dims.effDepth, placed, defs);
    },
    [placed, defs]
  );

  // Place a brick at a grid cell
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
    },
    [stackAt, activeDef, rotation, placed, defs, commit, selectedColor]
  );

  // Recolor or remove a specific placed brick
  const applyToBrick = useCallback(
    (target: PlacedBrick) => {
      if (toolMode === "erase") {
        commit(placed.filter((b) => b.instanceId !== target.instanceId));
      } else if (toolMode === "paint") {
        commit(
          placed.map((b) =>
            b.instanceId === target.instanceId ? { ...b, color: selectedColor } : b
          )
        );
      }
    },
    [toolMode, placed, commit, selectedColor]
  );

  // Hover handler shared by baseplate and bricks — update the ghost preview
  const handleHover = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (toolMode !== "build") {
        setGhost(null);
        return;
      }
      const { gx, gz } = worldToGrid(e.point, activeDef, rotation);
      const gy = stackAt(gx, gz, activeDef, rotation);
      const valid = isValidPlacement(gx, gy, gz, activeDef, rotation, placed, defs);
      setGhost({ gx, gy, gz, valid });
    },
    [toolMode, activeDef, rotation, stackAt, placed, defs]
  );

  // Place on baseplate click (only when it was a real click, not an orbit drag)
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

  // Click on an existing brick: erase / paint
  const handleBrickClick = useCallback(
    (brick: PlacedBrick) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!isClick(e)) return;
      if (toolMode === "erase" || toolMode === "paint") {
        applyToBrick(brick);
      }
    },
    [isClick, toolMode, applyToBrick]
  );

  const clearGhost = useCallback(() => setGhost(null), []);

  const isHoverable = toolMode === "erase" || toolMode === "paint";

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
      />
      <Baseplate
        onPointerDown={onPointerDown}
        onPointerMove={handleHover}
        onPointerOut={clearGhost}
        onClick={handlePlateClick}
      />
      {placed.map((b) => {
        const def = defs.get(b.definitionId)!;
        return (
          <BrickMesh
            key={b.instanceId}
            brick={b}
            def={def}
            hovered={isHoverable}
            onPointerDown={onPointerDown}
            onPointerMove={handleHover}
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
      <OrbitControls makeDefault minDistance={5} maxDistance={60} target={[0, 0, 0]} />
    </>
  );
}

export default function LegoScene() {
  const store = useBrickStore();
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Canvas
        shadows
        camera={{ position: [14, 14, 14], fov: 45 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <color attach="background" args={["#f1f5f9"]} />
        <Scene store={store} />
      </Canvas>
      <Toolbar store={store} />
    </div>
  );
}
