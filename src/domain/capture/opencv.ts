let openCvPromise: Promise<unknown> | null = null;

export async function getOpenCv() {
  if (!openCvPromise) {
    openCvPromise = (async () => {
      const module = await import("@techstark/opencv-js");
      const cvModule = module.default;

      if (cvModule instanceof Promise) {
        return cvModule;
      }

      await new Promise<void>((resolve) => {
        cvModule.onRuntimeInitialized = () => resolve();
      });

      return cvModule;
    })();
  }

  return openCvPromise as Promise<{
    [key: string]: any;
  }>;
}
