import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createSolvedCaptureSession } from "@/domain/cube/demo";
import { CubeColor, type ValidationResult } from "@/domain/cube/types";
import { useAppStore } from "@/app/store";
import { ReviewScreen } from "@/features/capture/ReviewScreen";

const { validateWithWorker, reclassifySessionWithWorker } = vi.hoisted(() => ({
  validateWithWorker: vi.fn<() => Promise<ValidationResult>>(),
  reclassifySessionWithWorker: vi.fn()
}));

vi.mock("@/lib/workers/solver-client", () => ({
  validateWithWorker
}));

vi.mock("@/lib/workers/capture-client", () => ({
  reclassifySessionWithWorker
}));

describe("ReviewScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState(useAppStore.getInitialState(), true);
    const session = createSolvedCaptureSession(3);
    useAppStore.getState().mergeFaceCapture(session.faces.U!);
    useAppStore.getState().mergeFaceCapture(session.faces.R!);
    useAppStore.getState().mergeFaceCapture(session.faces.F!);
    useAppStore.getState().mergeFaceCapture(session.faces.D!);
    useAppStore.getState().mergeFaceCapture(session.faces.L!);
    useAppStore.getState().mergeFaceCapture(session.faces.B!);
  });

  it("zeigt gruppierte Validierungsfehler und hebt betroffene Sticker hervor", async () => {
    validateWithWorker.mockResolvedValue({
      ok: false,
      status: "incomplete",
      errors: [
        {
          code: "unknown-sticker",
          category: "incomplete",
          face: "U",
          index: 0,
          message: "Oben enthält noch einen unbekannten Sticker."
        }
      ],
      groups: [
        {
          category: "incomplete",
          title: "Erfassung unvollständig",
          description: "Mindestens ein Sticker fehlt noch oder ist farblich nicht sauber erfasst.",
          count: 1
        }
      ],
      highlightedFaces: ["U"],
      highlightedStickers: [{ face: "U", index: 0 }],
      nextAction: "Ergänze zuerst die markierten Sticker oder Seiten und prüfe den Zustand danach erneut.",
      reduced: false
    });

    const user = userEvent.setup();
    render(<ReviewScreen />);

    await user.click(screen.getByRole("button", { name: /Zustand prüfen/i }));

    expect(screen.getByText(/Erfassung unvollständig/i)).toBeVisible();
    expect(screen.getByText(/Oben enthält noch einen unbekannten Sticker/i)).toBeVisible();
    expect(screen.getByLabelText(/U 1:/i)).toHaveClass("face-grid__sticker--highlighted");
  });

  it("markiert den Zustand nach manueller Korrektur wieder als neu zu prüfen", async () => {
    useAppStore.getState().setValidationResult({
      ok: false,
      status: "inconsistent",
      errors: [
        {
          code: "wrong-color-count",
          category: "inconsistent",
          message: "Blau kommt 8 Mal vor, erwartet werden 9."
        }
      ],
      groups: [
        {
          category: "inconsistent",
          title: "Zustand inkonsistent",
          description: "Farbverteilung oder Seitenzuordnung passen noch nicht zu einem belastbaren Würfelzustand.",
          count: 1
        }
      ],
      highlightedFaces: [],
      highlightedStickers: [],
      nextAction: "Korrigiere die markierten Farben oder Zentren und validiere anschließend noch einmal.",
      reduced: true
    });

    const user = userEvent.setup();
    render(<ReviewScreen />);

    await user.click(screen.getByRole("button", { name: /Farbe Blau wählen/i }));
    await user.click(screen.getByLabelText(/U 1:/i));

    expect(useAppStore.getState().validationResult).toBeNull();
    expect(screen.getByText(/Sticker geändert\. Prüfe den Zustand erneut/i)).toBeVisible();
  });

  it("erlaubt Schnellwahl der Korrekturfarbe per Tastatur", async () => {
    const user = userEvent.setup();
    render(<ReviewScreen />);

    await user.keyboard("2");

    expect(useAppStore.getState().selectedCorrectionColor).toBe(CubeColor.Red);
    expect(screen.getByText(/Aktive Farbe: Rot/i)).toBeVisible();
  });

  it("bleibt bei altem oder unbekanntem Validation-Status renderbar", () => {
    useAppStore.getState().setValidationResult({
      ok: false,
      status: "legacy-state" as unknown as ValidationResult["status"],
      errors: [],
      groups: [],
      highlightedFaces: [],
      highlightedStickers: [],
      nextAction: "Status aus altem Snapshot.",
      reduced: false
    });

    render(<ReviewScreen />);

    expect(screen.getByText(/Status unbekannt|Noch unvollständig/i)).toBeVisible();
    expect(screen.getByText(/Status aus altem Snapshot/i)).toBeVisible();
  });
});
