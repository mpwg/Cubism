export const faceOrder = ["U", "R", "F", "D", "L", "B"] as const;
export const supportedDimensions = [3, 4] as const;

export type Face = (typeof faceOrder)[number];
export type CubeDimension = (typeof supportedDimensions)[number];

export function stickersPerFaceForDimension(dimension: CubeDimension): number {
  return dimension * dimension;
}

export function totalStickersForDimension(dimension: CubeDimension): number {
  return stickersPerFaceForDimension(dimension) * faceOrder.length;
}

export enum CubeColor {
  White = 0,
  Red = 1,
  Green = 2,
  Yellow = 3,
  Orange = 4,
  Blue = 5,
  Unknown = 6
}

export const cubeColorOrder = [
  CubeColor.White,
  CubeColor.Red,
  CubeColor.Green,
  CubeColor.Yellow,
  CubeColor.Orange,
  CubeColor.Blue
] as const;

export const cubeColorLabels: Record<CubeColor, string> = {
  [CubeColor.White]: "Weiß",
  [CubeColor.Red]: "Rot",
  [CubeColor.Green]: "Grün",
  [CubeColor.Yellow]: "Gelb",
  [CubeColor.Orange]: "Orange",
  [CubeColor.Blue]: "Blau",
  [CubeColor.Unknown]: "Unbekannt"
};

export const cubeColorHex: Record<CubeColor, string> = {
  [CubeColor.White]: "#efe7d8",
  [CubeColor.Red]: "#d55a35",
  [CubeColor.Green]: "#4e7f5a",
  [CubeColor.Yellow]: "#efc541",
  [CubeColor.Orange]: "#d8872b",
  [CubeColor.Blue]: "#386dd5",
  [CubeColor.Unknown]: "#2a2a2a"
};

export const defaultFaceColor: Record<Face, CubeColor> = {
  U: CubeColor.White,
  R: CubeColor.Red,
  F: CubeColor.Green,
  D: CubeColor.Yellow,
  L: CubeColor.Orange,
  B: CubeColor.Blue
};

export const faceDisplayName: Record<Face, string> = {
  U: "Oben",
  R: "Rechts",
  F: "Vorne",
  D: "Unten",
  L: "Links",
  B: "Hinten"
};

export interface CubeState {
  readonly dimension: CubeDimension;
  readonly stickers: Uint8Array;
}

export interface Move {
  readonly face: Face;
  readonly depth: 0 | 1;
  readonly width: 1 | 2;
  readonly turns: 1 | 2 | 3;
}

export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LabColor {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

export interface DetectedSticker {
  readonly index: number;
  readonly color: CubeColor;
  readonly confidence: number;
  readonly sample: LabColor;
}

export interface FaceCapture {
  readonly dimension: CubeDimension;
  readonly face: Face;
  readonly stickers: DetectedSticker[];
  readonly source: "camera" | "upload";
  readonly confidence: number;
  readonly previewDataUrl?: string;
}

export interface CaptureSession {
  readonly dimension: CubeDimension;
  readonly faces: Partial<Record<Face, FaceCapture>>;
  readonly status: "draft" | "complete" | "corrected";
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly face?: Face;
  readonly index?: number;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: ValidationError[];
  readonly normalizedState?: CubeState;
  readonly reduced?: boolean;
}

export type SolvePhaseName = "centers" | "edges" | "parity" | "reduce3x3" | "finish";

export interface SolvePhaseResult {
  readonly phase: SolvePhaseName;
  readonly moves: Move[];
  readonly state: CubeState;
  readonly diagnostics: string[];
}

export interface SolveResult {
  readonly initial: CubeState;
  readonly final: CubeState;
  readonly moves: Move[];
  readonly phaseBreaks: number[];
  readonly durationMs: number;
  readonly phases: SolvePhaseResult[];
}

export interface PlaybackState {
  readonly moveIndex: number;
  readonly playing: boolean;
  readonly speed: number;
  readonly phaseIndex: number;
}

export interface RenderCubie {
  readonly id: string;
  readonly position: Vector3;
  readonly stickers: Partial<Record<Face, CubeColor>>;
}
