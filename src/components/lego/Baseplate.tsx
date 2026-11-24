"use client";
import type { ThreeEvent } from "@react-three/fiber";
import { PLATE_HEIGHT } from "@/constants/bricks";

interface BaseplateProps {
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

export function Baseplate({
  onPointerDown,
  onPointerMove,
  onPointerOut,
  onClick,
}: BaseplateProps) {
  // 32x32 stud plate, top surface at y = 0, plate body from y=-PLATE_HEIGHT to 0
  return (
    <group>
      <mesh
        position={[0, -PLATE_HEIGHT / 2, 0]}
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <boxGeometry args={[32, PLATE_HEIGHT, 32]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.05} />
      </mesh>
    </group>
  );
}
