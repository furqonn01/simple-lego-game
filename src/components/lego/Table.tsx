"use client";
import { PLATE_HEIGHT } from "@/constants/bricks";

// Simple wooden table the baseplate sits on. 5 boxes total � cheap on weak GPUs.
const LEG_H = 6;
const LEG_W = 1;
const INSET = 12;
const TOP_W = 40;
const TOP_D = 40;
const TOP_THICK = 1;

const LEGS: Array<[number, number]> = [
  [INSET, INSET],
  [-INSET, INSET],
  [INSET, -INSET],
  [-INSET, -INSET],
];

export function Table() {
  const topY = -PLATE_HEIGHT; // table top surface touches plate bottom
  return (
    <group>
      {/* Table top */}
      <mesh position={[0, topY - TOP_THICK / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[TOP_W, TOP_THICK, TOP_D]} />
        <meshStandardMaterial color="#8b5e34" roughness={0.7} metalness={0} />
      </mesh>
      {/* Legs */}
      {LEGS.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, topY - TOP_THICK - LEG_H / 2, lz]} castShadow>
          <boxGeometry args={[LEG_W, LEG_H, LEG_W]} />
          <meshStandardMaterial color="#6f4518" roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
