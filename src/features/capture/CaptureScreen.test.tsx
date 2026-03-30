import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createSolvedCaptureSession } from "@/domain/cube/demo";
import { useAppStore } from "@/app/store";
import { CaptureScreen } from "@/features/capture/CaptureScreen";

const { scanFaceWithWorker } = vi.hoisted(() => ({
  scanFaceWithWorker: vi.fn()
}));

vi.mock("@/lib/workers/capture-client", () => ({
  scanFaceWithWorker
}));

describe("CaptureScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState(useAppStore.getInitialState(), true);
    window.scrollTo = vi.fn();

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }]
        }))
      }
    });

    HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () =>
        ({
          drawImage: vi.fn()
        }) as unknown as CanvasRenderingContext2D
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/webp;base64,preview");
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", {
      configurable: true,
      get: () => 640
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", {
      configurable: true,
      get: () => 640
    });
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close: vi.fn() }))
    );
  });

  it("öffnet den guided camera flow als Overlay", async () => {
    const user = userEvent.setup();
    render(<CaptureScreen />);

    await user.click(screen.getByRole("button", { name: "Cube fotografieren" }));

    expect(await screen.findByTestId("camera-overlay")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Oben scannen" })).toBeVisible();
    expect(screen.getByText(/Starte mit Oben/i)).toBeVisible();
  });

  it("setzt beim Öffnen des Overlays die Seitenposition zurück", async () => {
    const user = userEvent.setup();
    render(<CaptureScreen />);

    await user.click(screen.getByRole("button", { name: "Cube fotografieren" }));

    await screen.findByTestId("camera-overlay");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  it("führt nach drei Kamera-Scans direkt in den Review-Schritt", async () => {
    const solvedSession = createSolvedCaptureSession(3);
    scanFaceWithWorker
      .mockResolvedValueOnce({ ...solvedSession.faces.U!, source: "camera" })
      .mockResolvedValueOnce({ ...solvedSession.faces.R!, source: "camera" })
      .mockResolvedValueOnce({ ...solvedSession.faces.F!, source: "camera" });

    const user = userEvent.setup();
    render(<CaptureScreen />);

    await user.click(screen.getByRole("button", { name: "Cube fotografieren" }));
    await screen.findByTestId("camera-overlay");

    await user.click(screen.getByRole("button", { name: "Seite übernehmen" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Rechts scannen" })).toBeVisible());

    await user.click(screen.getByRole("button", { name: "Seite übernehmen" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Vorne scannen" })).toBeVisible());

    await user.click(screen.getByRole("button", { name: "Seite übernehmen" }));

    await waitFor(() => {
      expect(useAppStore.getState().screen).toBe("review");
    });
    expect(screen.queryByTestId("camera-overlay")).not.toBeInTheDocument();
  });

  it("öffnet den Kamera-Flow auch dann erneut, wenn bereits drei Seiten erfasst sind", async () => {
    const solvedSession = createSolvedCaptureSession(3);
    useAppStore.getState().mergeFaceCapture(solvedSession.faces.U!);
    useAppStore.getState().mergeFaceCapture(solvedSession.faces.R!);
    useAppStore.getState().mergeFaceCapture(solvedSession.faces.F!);

    const user = userEvent.setup();
    render(<CaptureScreen />);

    await user.click(screen.getByRole("button", { name: "Cube fotografieren" }));

    expect(await screen.findByTestId("camera-overlay")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Oben scannen" })).toBeVisible();
  });
});
