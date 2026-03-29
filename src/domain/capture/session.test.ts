import { describe, expect, it } from "vitest";
import { createSolvedCaptureSession } from "@/domain/cube/demo";
import { CubeColor } from "@/domain/cube/types";
import { createBlankFaceCapture, createEmptyCaptureSession, isCaptureSessionComplete, mergeFaceCapture, setCaptureStickerColor } from "@/domain/capture/session";

describe("capture session", () => {
  it("erkennt vollständige Sessions erst nach allen sechs Flächen", () => {
    const session = createEmptyCaptureSession(3);
    const solved = createSolvedCaptureSession(3);

    const partial = mergeFaceCapture(session, solved.faces.U!);
    expect(isCaptureSessionComplete(partial)).toBe(false);
    expect(partial.status).toBe("draft");

    let completed = partial;
    for (const face of ["R", "F", "D", "L", "B"] as const) {
      completed = mergeFaceCapture(completed, solved.faces[face]!);
    }

    expect(isCaptureSessionComplete(completed)).toBe(true);
    expect(completed.status).toBe("complete");
  });

  it("setzt manuelle Korrekturen auf corrected und erhöht die Konfidenz des Stickers", () => {
    const session = createEmptyCaptureSession(3);
    const corrected = setCaptureStickerColor(session, "F", 4, CubeColor.Green);

    expect(corrected.status).toBe("corrected");
    expect(corrected.faces.F?.stickers[4]?.color).toBe(CubeColor.Green);
    expect(corrected.faces.F?.stickers[4]?.confidence).toBe(1);
  });

  it("legt leere Flächen mit unbekannten Stickern an", () => {
    const blank = createBlankFaceCapture("U", 4);

    expect(blank.stickers).toHaveLength(16);
    expect(blank.stickers.every((sticker) => sticker.color === CubeColor.Unknown)).toBe(true);
    expect(blank.confidence).toBe(0);
  });
});
