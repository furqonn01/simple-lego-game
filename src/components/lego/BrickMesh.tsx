"use client";
import type { ThreeEvent } from "@react-three/fiber";
import type { BrickDefinition, PlacedBrick } from "@/types/lego";
import {
  getEffectiveDimensions,
  gridToWorld,
} from "@/utils/grid";
import {
  PLATE_HEIGHT,
  STUD_HEIGHT,
  STUD_RADIUS,
  PLASTIC_ROUGHNESS,
  PLASTIC_METALNESS,
} from "@/constants/bricks";

interface BrickMeshProps {
  brick: PlacedBrick;
  def: BrickDefinition;
  hovered?: boolean;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

export function BrickMesh({
  brick,
  def,
  hovered = false,
  onPointerDown,
  onPointerMove,
  onPointerOut,
  onClick,
}: BrickMeshProps) {
  const { effWidth, effDepth } = getEffectiveDimensions(def, brick.rotation);
  const pos = gridToWorld(brick.gx, brick.gy, brick.gz, def, brick.rotation);
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

  const emissive = hovered ? "#3b82f6" : "#000000";
  const emissiveIntensity = hovered ? 0.6 : 1;

  return (
    <group
      position={[pos.x, pos.y, pos.z]}
      rotation={[0, (brick.rotation * Math.PI) / 180, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Main body box */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[effWidth - 0.02, height, effDepth - 0.02]} />
        <meshStandardMaterial
          color={brick.color}
          roughness={PLASTIC_ROUGHNESS}
          metalness={PLASTIC_METALNESS}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Top studs */}
      {studs.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, height / 2 + STUD_HEIGHT / 2, lz]} castShadow>
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 24]} />
          <meshStandardMaterial
            color={brick.color}
            roughness={PLASTIC_ROUGHNESS}
            metalness={PLASTIC_METALNESS}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      ))}
    </group>
  );
}
