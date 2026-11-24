"use client";

export type CameraPreset = "iso" | "top" | "front" | "reset";

// Dispatch a preset request that the in-scene controller consumes.
export function requestCameraPreset(preset: CameraPreset) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("brickcraft:set-camera", { detail: preset })
  );
}
