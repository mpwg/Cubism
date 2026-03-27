import { transfer, wrap } from "comlink";
import type { CaptureSession, CubeDimension, Face, FaceCapture } from "@/domain/cube/types";
import type { CaptureWorkerApi } from "@/workers/worker-types";

let captureWorker: Worker | null = null;
let captureClientPromise: Promise<CaptureWorkerApi> | null = null;

function getCaptureClient(): Promise<CaptureWorkerApi> {
  if (!captureWorker) {
    captureWorker = new Worker(new URL("../../workers/capture.worker.ts", import.meta.url), { type: "module" });
  }

  if (!captureClientPromise) {
    captureClientPromise = Promise.resolve(wrap<CaptureWorkerApi>(captureWorker));
  }

  return captureClientPromise;
}

export async function scanFaceWithWorker(
  imageBitmap: ImageBitmap,
  face: Face,
  dimension: CubeDimension,
  source: "camera" | "upload"
): Promise<FaceCapture> {
  const client = await getCaptureClient();
  return client.scanFace(transfer(imageBitmap, [imageBitmap]), face, dimension, source);
}

export async function reclassifySessionWithWorker(session: CaptureSession): Promise<CaptureSession> {
  const client = await getCaptureClient();
  return client.reclassify(session);
}
