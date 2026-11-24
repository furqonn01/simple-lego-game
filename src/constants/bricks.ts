import type { BrickDefinition } from "@/types/lego";

// Core math & grid constants (single source of truth)
export const STUD_SIZE = 1;
export const PLATE_HEIGHT = 0.4;
export const BRICK_HEIGHT = 1.2; // 3 plates
export const STUD_RADIUS = 0.3;
export const STUD_HEIGHT = 0.18;
export const BASEPLATE_HALF = 16; // 32x32 studs, -16..15

// Plastic material properties used across bricks
export const PLASTIC_ROUGHNESS = 0.25;
export const PLASTIC_METALNESS = 0.05;

// Curated LEGO-inspired palette
export const COLOR_PALETTE: string[] = [
  "#e11d48", // red
  "#f59e0b", // orange
  "#facc15", // yellow
  "#16a34a", // green
  "#3b82f6", // blue
  "#6366f1", // purple
  "#1e293b", // black
  "#f8fafc", // white
  "#94a3b8", // gray
];

export const COLOR_META: Record<string, { name: string; light?: boolean }> = {
  "#e11d48": { name: "Red" },
  "#f59e0b": { name: "Orange", light: true },
  "#facc15": { name: "Yellow", light: true },
  "#16a34a": { name: "Green" },
  "#3b82f6": { name: "Blue" },
  "#6366f1": { name: "Purple" },
  "#1e293b": { name: "Black" },
  "#f8fafc": { name: "White", light: true },
  "#94a3b8": { name: "Gray" },
};

export const DEFAULT_COLOR = COLOR_PALETTE[0];

export const BRICKS: BrickDefinition[] = [
  // Bricks (heightInPlates: 3)
  { id: "brick-1x1", name: "1x1", width: 1, depth: 1, heightInPlates: 3, category: "brick" },
  { id: "brick-1x2", name: "1x2", width: 1, depth: 2, heightInPlates: 3, category: "brick" },
  { id: "brick-1x3", name: "1x3", width: 1, depth: 3, heightInPlates: 3, category: "brick" },
  { id: "brick-1x4", name: "1x4", width: 1, depth: 4, heightInPlates: 3, category: "brick" },
  { id: "brick-2x2", name: "2x2", width: 2, depth: 2, heightInPlates: 3, category: "brick" },
  { id: "brick-2x3", name: "2x3", width: 2, depth: 3, heightInPlates: 3, category: "brick" },
  { id: "brick-2x4", name: "2x4", width: 2, depth: 4, heightInPlates: 3, category: "brick" },
  // Plates (heightInPlates: 1)
  { id: "plate-1x2", name: "1x2 Plate", width: 1, depth: 2, heightInPlates: 1, category: "plate" },
  { id: "plate-2x2", name: "2x2 Plate", width: 2, depth: 2, heightInPlates: 1, category: "plate" },
  { id: "plate-2x4", name: "2x4 Plate", width: 2, depth: 4, heightInPlates: 1, category: "plate" },
  // Smooth Tiles (heightInPlates: 1, no studs)
  { id: "tile-1x2", name: "1x2 Tile", width: 1, depth: 2, heightInPlates: 1, category: "tile" },
  { id: "tile-2x2", name: "2x2 Tile", width: 2, depth: 2, heightInPlates: 1, category: "tile" },
];

export const DEFAULT_BRICK = BRICKS[0];

export const DEF_MAP: Map<string, BrickDefinition> = new Map(
  BRICKS.map((b): [string, BrickDefinition] => [b.id, b])
);

export function getBrickById(id: string): BrickDefinition {
  return DEF_MAP.get(id) ?? DEFAULT_BRICK;
}
