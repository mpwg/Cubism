import type { CaptureSession, CubeDimension, CubeState, Face, FaceCapture, SolveResult, ValidationResult } from "@/domain/cube/types";

export interface CaptureWorkerApi {
  scanFace: (
    imageBitmap: ImageBitmap,
    face: Face,
    dimension: CubeDimension,
    source: "camera" | "upload"
  ) => Promise<FaceCapture>;
  reclassify: (session: CaptureSession) => Promise<CaptureSession>;
}

export interface SolverWorkerApi {
  validate: (state: CubeState) => Promise<ValidationResult>;
  solve: (state: CubeState) => Promise<SolveResult>;
}
