export type Rotation = 0 | 90 | 180 | 270;

export type ToolMode = "build" | "erase" | "paint";

export interface BrickDefinition {
  id: string;
  name: string;
  width: number;
  depth: number;
  heightInPlates: number;
  category: "brick" | "plate" | "tile";
}

export interface PlacedBrick {
  instanceId: string;
  definitionId: string;
  gx: number;
  gy: number;
  gz: number;
  rotation: Rotation;
  color: string;
}
