import { expose } from "comlink";
import { reclassifyCaptureSession, scanFaceBitmap } from "@/domain/capture/color-analysis";
import type { CaptureWorkerApi } from "@/workers/worker-types";

const api: CaptureWorkerApi = {
  async scanFace(imageBitmap, face, dimension, source) {
    return scanFaceBitmap(imageBitmap, face, dimension, source);
  },
  async reclassify(session) {
    return reclassifyCaptureSession(session);
  }
};

expose(api);
