import type { BrickDefinition, PlacedBrick, Rotation } from "@/types/lego";
import { BASEPLATE_HALF, PLATE_HEIGHT, STUD_SIZE } from "@/constants/bricks";
import * as THREE from "three";

export function getEffectiveDimensions(
  def: BrickDefinition,
  rotation: Rotation
): { effWidth: number; effDepth: number } {
  if (rotation === 90 || rotation === 270) {
    return { effWidth: def.depth, effDepth: def.width };
  }
  return { effWidth: def.width, effDepth: def.depth };
}

export function worldToGrid(
  point: THREE.Vector3,
  def: BrickDefinition,
  rotation: Rotation
): { gx: number; gz: number } {
  const { effWidth, effDepth } = getEffectiveDimensions(def, rotation);

  let gx = Math.round(point.x / STUD_SIZE - effWidth / 2);
  let gz = Math.round(point.z / STUD_SIZE - effDepth / 2);

  // Clamp to baseplate bounds so footprint stays inside [-16, 15]
  const minX = -BASEPLATE_HALF;
  const maxX = -BASEPLATE_HALF + 32 - effWidth;
  const minZ = -BASEPLATE_HALF;
  const maxZ = -BASEPLATE_HALF + 32 - effDepth;
  gx = Math.max(minX, Math.min(maxX, gx));
  gz = Math.max(minZ, Math.min(maxZ, gz));
  return { gx, gz };
}

export function gridToWorld(
  gx: number,
  gy: number,
  gz: number,
  def: BrickDefinition,
  rotation: Rotation
): { x: number; y: number; z: number } {
  const { effWidth, effDepth } = getEffectiveDimensions(def, rotation);
  const x = gx + effWidth / 2;
  const z = gz + effDepth / 2;
  const y = gy * PLATE_HEIGHT + (def.heightInPlates * PLATE_HEIGHT) / 2;
  return { x, y, z };
}

export function computeStackHeight(
  gx: number,
  gz: number,
  effWidth: number,
  effDepth: number,
  placedBricks: PlacedBrick[],
  defs: Map<string, BrickDefinition>
): number {
  let target = 0;
  for (const b of placedBricks) {
    const def = defs.get(b.definitionId);
    if (!def) continue;
    const dims = getEffectiveDimensions(def, b.rotation);
    const bMinX = b.gx;
    const bMaxX = b.gx + dims.effWidth - 1;
    const bMinZ = b.gz;
    const bMaxZ = b.gz + dims.effDepth - 1;

    const overlapsX = bMinX < gx + effWidth && bMaxX >= gx;
    const overlapsZ = bMinZ < gz + effDepth && bMaxZ >= gz;
    if (overlapsX && overlapsZ) {
      target = Math.max(target, b.gy + def.heightInPlates);
    }
  }
  return target;
}

export function isValidPlacement(
  gx: number,
  gy: number,
  gz: number,
  def: BrickDefinition,
  rotation: Rotation,
  placedBricks: PlacedBrick[],
  defs: Map<string, BrickDefinition>
): boolean {
  const { effWidth, effDepth } = getEffectiveDimensions(def, rotation);

  // Footprint within baseplate bounds
  if (gx < -BASEPLATE_HALF || gz < -BASEPLATE_HALF) return false;
  if (gx + effWidth > 32 - BASEPLATE_HALF || gz + effDepth > 32 - BASEPLATE_HALF)
    return false;

  // Collision: no occupied cell may overlap the target volume
  const xEnd = gx + effWidth - 1;
  const zEnd = gz + effDepth - 1;
  const yEnd = gy + def.heightInPlates - 1;
  for (const b of placedBricks) {
    const bDef = defs.get(b.definitionId);
    if (!bDef) continue;
    const dims = getEffectiveDimensions(bDef, b.rotation);
    const bx0 = b.gx;
    const bx1 = b.gx + dims.effWidth - 1;
    const bz0 = b.gz;
    const bz1 = b.gz + dims.effDepth - 1;
    const by0 = b.gy;
    const by1 = b.gy + bDef.heightInPlates - 1;
    if (gx <= bx1 && xEnd >= bx0 && gz <= bz1 && zEnd >= bz0 && gy <= by1 && yEnd >= by0) {
      return false;
    }
  }
  return true;
}
