"use client";
import type { BrickDefinition, Rotation } from "@/types/lego";
import { gridToWorld, getEffectiveDimensions } from "@/utils/grid";
import {
  PLATE_HEIGHT,
  STUD_HEIGHT,
  STUD_RADIUS,
  PLASTIC_ROUGHNESS,
  PLASTIC_METALNESS,
} from "@/constants/bricks";

interface GhostBrickProps {
  gx: number;
  gy: number;
  gz: number;
  def: BrickDefinition;
  rotation: Rotation;
  color: string;
  valid: boolean;
}

export function GhostBrick({
  gx,
  gy,
  gz,
  def,
  rotation,
  color,
  valid,
}: GhostBrickProps) {
  const { effWidth, effDepth } = getEffectiveDimensions(def, rotation);
  const pos = gridToWorld(gx, gy, gz, def, rotation);
  const height = def.heightInPlates * PLATE_HEIGHT;

  // Stud offsets in brick-local coordinates
  const studs: Array<[number, number]> = [];
  if (def.category !== "tile") {
    for (let ix = 0; ix < def.width; ix++) {
      for (let iz = 0; iz < def.depth; iz++) {
        studs.push([ix - def.width / 2 + 0.5, iz - def.depth / 2 + 0.5]);
      }
    }
  }

  const displayColor = valid ? color : "#ef4444";

  return (
    <group
      position={[pos.x, pos.y, pos.z]}
      rotation={[0, (rotation * Math.PI) / 180, 0]}
    >
      <mesh>
        <boxGeometry args={[effWidth - 0.02, height, effDepth - 0.02]} />
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={0.55}
          roughness={PLASTIC_ROUGHNESS}
          metalness={PLASTIC_METALNESS}
          depthWrite={false}
        />
      </mesh>
      {studs.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, height / 2 + STUD_HEIGHT / 2, lz]}>
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 24]} />
          <meshStandardMaterial
            color={displayColor}
            transparent
            opacity={0.55}
            roughness={PLASTIC_ROUGHNESS}
            metalness={PLASTIC_METALNESS}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
