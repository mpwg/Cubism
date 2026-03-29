import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSolvedCaptureSession } from "@/domain/cube/demo";

describe("capture client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("reicht ImageBitmaps per transfer weiter und teilt sich einen Worker", async () => {
    const scanFace = vi.fn(async () => createSolvedCaptureSession(3).faces.U!);
    const reclassify = vi.fn(async (session) => session);
    const api = { scanFace, reclassify };
    const wrap = vi.fn(() => api);
    const transfer = vi.fn((value) => value);
    const workerInstances: unknown[] = [];

    vi.doMock("comlink", () => ({
      transfer,
      wrap
    }));

    class MockWorker {
      constructor(...args: unknown[]) {
        workerInstances.push(args);
      }
    }

    vi.stubGlobal("Worker", MockWorker);

    const client = await import("@/lib/workers/capture-client");
    const session = createSolvedCaptureSession(3);
    const imageBitmap = { width: 64, height: 64 } as ImageBitmap;

    await client.scanFaceWithWorker(imageBitmap, "U", 3, "upload");
    await client.reclassifySessionWithWorker(session);

    expect(workerInstances).toHaveLength(1);
    expect(wrap).toHaveBeenCalledTimes(1);
    expect(transfer).toHaveBeenCalledWith(imageBitmap, [imageBitmap]);
    expect(scanFace).toHaveBeenCalledWith(imageBitmap, "U", 3, "upload");
    expect(reclassify).toHaveBeenCalledWith(session);
  });
});
