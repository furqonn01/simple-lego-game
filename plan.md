# BrickCraft 3D — Technical Specification & Execution Plan

## 0. Core Math & Grid Constants (Single Source of Truth)
All 3D geometry and grid calculations must strictly adhere to these unit ratios so studs, bricks, and plates align without gaps or clipping:

- **Stud Pitch (X & Z unit):** `1.0` unit (`STUD_SIZE = 1`)
- **Plate Height (Y unit):** `0.4` units (`PLATE_HEIGHT = 0.4`)
- **Standard Brick Height:** `3` plates = `1.2` units (`BRICK_HEIGHT = 1.2`)
- **Stud Cylinder:** radius `0.3` units, height `0.18` units, centered on each `(x, z)` stud cell.
- **Baseplate Size:** `32 x 32` studs (coordinates spanning `-16` to `+15` on X and Z axes).

### Rotation & Bounding Box Formula
For a brick with base dimensions `(width, depth)` in studs and rotation `rot` in `{0, 90, 180, 270}`:
- If `rot === 90 || rot === 270`, effective dimensions swap:
  - `effWidth = depth`
  - `effDepth = width`
- Otherwise (`rot === 0 || rot === 180`):
  - `effWidth = width`
  - `effDepth = depth`

### Grid Snapping & Center Offset Formula
Let `(gx, gz)` be the integer top-left stud coordinate on the baseplate (`-16 <= gx <= 16 - effWidth`, `-16 <= gz <= 16 - effDepth`):
- **World Center X:** `worldX = gx + effWidth / 2`
- **World Center Z:** `worldZ = gz + effDepth / 2`
- **World Center Y:** `worldY = (gy * PLATE_HEIGHT) + (heightInPlates * PLATE_HEIGHT) / 2`
  *(where `gy` is the integer plate layer starting at `0` on the baseplate surface)*

### Stacking & Collision Detection (Occupancy Map)
Represent occupied space in a 3D hash map or voxel grid keyed by `"x,y,z"` where `x, z` are integer stud indices and `y` is integer plate index:
1. **Occupied Cells of a Brick at `(gx, gy, gz)`:**
   - `x` in `[gx, gx + effWidth - 1]`
   - `y` in `[gy, gy + heightInPlates - 1]`
   - `z` in `[gz, gz + effDepth - 1]`
2. **Finding Valid Stack Height (`targetGy`):**
   - Given footprint `(gx, gz)` with `(effWidth, effDepth)`, scan all placed bricks overlapping `[gx, gx + effWidth - 1]` and `[gz, gz + effDepth - 1]`.
   - `targetGy = max(0, ...overlappingBricks.map(b => b.gy + b.heightInPlates))`
3. **Placement Validity:**
   - Footprint must stay within baseplate bounds (`[-16, 15]`).
   - No cell in `[gx..gx+effWidth-1, targetGy..targetGy+heightInPlates-1, gz..gz+effDepth-1]` may already exist in the occupancy set.

---

## Step 1: Project Setup, Math Engine & Baseplate Scene
**Goal:** Initialize the Next.js + Three.js environment, implement the deterministic grid/stacking engine, and render a baseplate where a single `2x4` brick can be placed and removed.

### Tasks
1. **Initialize Dependencies:**
   - Ensure `three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`, and `lucide-react` are installed.
   - Configure `next.config.ts` (`transpilePackages: ['three']` if needed) and ensure client-only rendering (`"use client"`) for the 3D canvas to prevent SSR hydration errors.
2. **Create `src/types/lego.ts`:**
   - Define `Rotation = 0 | 90 | 180 | 270`.
   - Define `BrickDefinition` (`id`, `name`, `width`, `depth`, `heightInPlates`, `category: 'brick' | 'plate' | 'tile'`).
   - Define `PlacedBrick` (`instanceId`, `definitionId`, `gx`, `gy`, `gz`, `rotation`, `color`).
3. **Create `src/utils/grid.ts`:**
   - Implement `getEffectiveDimensions(def, rotation)`.
   - Implement `worldToGrid(point, def, rotation)` (converting raycast hit point into clamped integer `(gx, gz)`).
   - Implement `gridToWorld(gx, gy, gz, def, rotation)`.
   - Implement `computeStackHeight(gx, gz, effWidth, effDepth, placedBricks)`.
   - Implement `isValidPlacement(gx, gy, gz, def, rotation, placedBricks)`.
4. **Create `src/components/lego/BrickMesh.tsx` & `Baseplate.tsx`:**
   - `BrickMesh`: Renders main box (`width - 0.02`, `height`, `depth - 0.02` for subtle seam lines) plus instanced or grouped top studs (skipping studs if `category === 'tile'`).
   - `Baseplate`: Renders a `32x32` stud plate with top surface at `y = 0`.
5. **Create `src/components/lego/LegoScene.tsx`:**
   - Full-screen `<Canvas shadows camera={{ position: [14, 14, 14], fov: 45 }}>`.
   - Basic lighting (`ambientLight` + shadow-casting `directionalLight`) and `OrbitControls`.
   - Click on baseplate or existing brick places a brick at `(gx, targetGy, gz)`; Right-click (or `Alt+Click`) on a brick removes it.

### Step 1 Verification
- Run `npm run build` / `tsc --noEmit` with zero errors.
- Clicking anywhere on the baseplate places a brick snapped cleanly to the stud grid; clicking on top of that brick stacks the next brick flush without gaps.

---

## Step 2: Brick Catalog, Rotation, Ghost Preview & History State
**Goal:** Expand the brick catalog, add live translucent placement previews, rotation controls, color selection, Undo/Redo stack, and `localStorage` persistence.

### Tasks
1. **Expand Brick Catalog (`src/constants/bricks.ts`):**
   - Bricks (`heightInPlates: 3`): `1x1`, `1x2`, `1x3`, `1x4`, `2x2`, `2x3`, `2x4`.
   - Plates (`heightInPlates: 1`): `1x2 Plate`, `2x2 Plate`, `2x4 Plate`.
   - Smooth Tiles (`heightInPlates: 1`, no top studs): `1x2 Tile`, `2x2 Tile`.
   - Curated LEGO-inspired color palette with hex codes and plastic material properties (`roughness: 0.25`, `metalness: 0.05`).
2. **Create `src/components/lego/GhostBrick.tsx`:**
   - Tracks pointer movement across the baseplate and placed bricks (`onPointerMove`).
   - Renders a semi-transparent (`opacity: 0.55`, `transparent: true`) preview of the active brick at `(gx, targetGy, gz)`.
   - Tints green/normal when `isValidPlacement === true` and red (`#ef4444`) when out-of-bounds or colliding.
   - Distinguish pointer drag (camera orbit) from pointer click (place/delete) using pointer down/up distance threshold (`< 5px`) so orbiting never accidentally places a brick.
3. **State Management (`src/hooks/useBrickStore.ts`):**
   - Manage `placedBricks`, `selectedBrickId`, `selectedColor`, `rotation`, and `toolMode` (`'build' | 'erase' | 'paint'`).
   - Implement Undo/Redo history stacks (`past`, `present`, `future`) with keyboard bindings (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`).
   - Keyboard shortcut `R` to rotate clockwise (`(rot + 90) % 360`).
   - Auto-save `placedBricks` to `localStorage` under key `brickcraft_save_v1`.

### Step 2 Verification
- Ghost preview follows the cursor smoothly across multi-level builds and rotates accurately around the grid when pressing `R`.
- Dragging to rotate the camera does not trigger accidental brick placement.
- Undo/Redo and page reload preserve the exact build state.

---

## Step 3: HUD Polish, Camera Presets, Blueprint Export/Import & Lighting
**Goal:** Deliver a polished, responsive HUD overlay, camera presets, JSON blueprint sharing, and studio-quality lighting/shadows.

### Tasks
1. **Create HUD Components (`src/components/hud/`):**
   - `TopToolbar.tsx`:
     - Tool mode switcher: **Build**, **Paint** (recolor clicked brick), **Erase**.
     - Undo / Redo buttons with disabled states.
     - Camera presets: **Isometric**, **Top**, **Front**, and **Reset View** (`Space` shortcut).
     - Blueprint actions: **Export JSON** (downloads `.json` file), **Import JSON** (validates schema and loads build), and **Clear Board** (with confirmation dialog).
   - `BottomDock.tsx`:
     - Filterable/categorized brick selector (`Bricks`, `Plates`, `Tiles`) with mini visual dimension badges (e.g., `2x4`).
     - Rotation button showing current angle (`0°`, `90°`, `180°`, `270°`).
     - Color swatch picker + brick counter badge (`Total Bricks: N`).
2. **Visual & Lighting Polish:**
   - Upgrade lighting with `<Environment preset="city" />` (or custom studio lightformers), soft directional shadows (`shadow-mapSize={[2048, 2048]}`, `shadow-bias={-0.0005}`), and a subtle studio backdrop color (`#f1f5f9`).
   - Add subtle hover highlight outline/emissive tint when hovering over an existing brick in **Erase** or **Paint** mode.
   - Add an optional grid overlay toggle (`G` key) and sound/visual pop feedback on placement (optional Web Audio API subtle click synth—zero external audio assets required).

### Step 3 Verification
- Export a multi-brick model to JSON, clear the board, re-import the JSON, and confirm identical coordinates, rotations, and colors.
- Verify responsive layout on both desktop and narrower viewports with zero console or TypeScript errors.