import { CubeColor, CubeDimension, faceOrder, type CaptureSession, type Face, type FaceCapture } from "@/domain/cube/types";

export function createBlankFaceCapture(face: Face, dimension: CubeDimension): FaceCapture {
  return {
    dimension,
    face,
    stickers: Array.from({ length: dimension * dimension }, (_, index) => ({
      index,
      color: CubeColor.Unknown,
      confidence: 0,
      sample: { l: 0, a: 0, b: 0 }
    })),
    source: "upload",
    confidence: 0
  };
}

export function createEmptyCaptureSession(dimension: CubeDimension): CaptureSession {
  return {
    dimension,
    faces: Object.fromEntries(faceOrder.map((face) => [face, createBlankFaceCapture(face, dimension)])),
    status: "draft"
  };
}

export function isCaptureSessionComplete(session: CaptureSession): boolean {
  return faceOrder.every((face) => {
    const capture = session.faces[face];
    return Boolean(
      capture &&
        capture.stickers.length === session.dimension * session.dimension &&
        capture.stickers.every((sticker) => sticker.color !== CubeColor.Unknown)
    );
  });
}

export function mergeFaceCapture(session: CaptureSession, capture: FaceCapture): CaptureSession {
  const next: CaptureSession = {
    ...session,
    dimension: capture.dimension,
    faces: {
      ...session.faces,
      [capture.face]: capture
    }
  };

  return {
    ...next,
    status: isCaptureSessionComplete(next) ? "complete" : session.status === "corrected" ? "corrected" : "draft"
  };
}

export function setCaptureStickerColor(
  session: CaptureSession,
  face: Face,
  index: number,
  color: CubeColor
): CaptureSession {
  const current = session.faces[face] ?? createBlankFaceCapture(face, session.dimension);
  const stickers = current.stickers.map((sticker) =>
    sticker.index === index
      ? {
          ...sticker,
          color,
          confidence: 1
        }
      : sticker
  );

  const nextCapture: FaceCapture = {
    ...current,
    stickers,
    confidence: stickers.reduce((sum, sticker) => sum + sticker.confidence, 0) / stickers.length
  };

  const merged = mergeFaceCapture(session, nextCapture);
  return {
    ...merged,
    status: "corrected"
  };
}
