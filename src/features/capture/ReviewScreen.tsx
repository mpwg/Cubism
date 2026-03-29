import { startTransition, useState } from "react";
import { FaceGrid } from "@/features/shared/FaceGrid";
import { cubeColorHex, cubeColorLabels, cubeColorOrder, faceDisplayName, faceOrder } from "@/domain/cube/types";
import { reclassifySessionWithWorker } from "@/lib/workers/capture-client";
import { validateWithWorker } from "@/lib/workers/solver-client";
import { useAppStore } from "@/app/store";

export function ReviewScreen() {
  const dimension = useAppStore((state) => state.dimension);
  const captureSession = useAppStore((state) => state.captureSession);
  const cubeState = useAppStore((state) => state.cubeState);
  const validationResult = useAppStore((state) => state.validationResult);
  const selectedColor = useAppStore((state) => state.selectedCorrectionColor);
  const setSelectedCorrectionColor = useAppStore((state) => state.setSelectedCorrectionColor);
  const setCaptureStickerColor = useAppStore((state) => state.setCaptureStickerColor);
  const mergeFaceCapture = useAppStore((state) => state.mergeFaceCapture);
  const setValidationResult = useAppStore((state) => state.setValidationResult);
  const setScreen = useAppStore((state) => state.setScreen);
  const [busy, setBusy] = useState<"validate" | "reclassify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    if (!cubeState) {
      setError("Es fehlen noch Sticker. Ergänze die übrigen Flächen im Review oder über den Edit-Modus am 3D-Würfel.");
      return;
    }

    setBusy("validate");
    setError(null);
    try {
      const result = await validateWithWorker(cubeState);
      setValidationResult(result);
      if (result.ok) {
        startTransition(() => setScreen("solve"));
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Validierung fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReclassify() {
    setBusy("reclassify");
    setError(null);
    try {
      const nextSession = await reclassifySessionWithWorker(captureSession);
      for (const face of faceOrder) {
        const capture = nextSession.faces[face];
        if (capture) {
          mergeFaceCapture(capture);
        }
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Reklassifizierung fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel-stack">
      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Review</p>
            <h2>Farben prüfen und korrigieren</h2>
          </div>
          <p className="panel-card__meta">
            Aktive Dimension: {dimension}x{dimension} · Fotos sind nur die Grundlage, fehlende Sticker kannst du hier direkt ergänzen.
          </p>
        </div>

        <div className="palette-row">
          {cubeColorOrder.map((color) => (
            <button
              key={color}
              type="button"
              className={`palette-swatch${selectedColor === color ? " palette-swatch--active" : ""}`}
              style={{ backgroundColor: cubeColorHex[color] }}
              title={cubeColorLabels[color]}
              onClick={() => setSelectedCorrectionColor(color)}
            />
          ))}
        </div>

        <div className="action-row">
          <button type="button" className="secondary-button" onClick={() => void handleReclassify()}>
            {busy === "reclassify" ? "Reklassifiziere …" : "Farben neu klassifizieren"}
          </button>
          <button type="button" className="primary-button" onClick={() => void handleValidate()}>
            {busy === "validate" ? "Prüfe …" : "Zustand prüfen"}
          </button>
        </div>

        {error ? <p className="inline-error">{error}</p> : null}
        {validationResult && !validationResult.ok ? (
          <ul className="message-list">
            {validationResult.errors.map((validationError) => (
              <li key={`${validationError.code}-${validationError.index ?? validationError.face ?? "global"}`}>{validationError.message}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="face-card-grid">
        {faceOrder.map((face) => {
          const capture = captureSession.faces[face]!;
          return (
            <article key={face} className="panel-card face-card">
              <div className="face-card__header">
                <div>
                  <p className="eyebrow">{face}</p>
                  <h3>{faceDisplayName[face]}</h3>
                </div>
              </div>
              <FaceGrid
                capture={capture}
                editable
                selectedColor={selectedColor}
                onStickerClick={(index) => setCaptureStickerColor(face, index, selectedColor)}
              />
            </article>
          );
        })}
      </div>

      {dimension === 4 ? (
        <p className="panel-card__meta">
          Hinweis: `4x4` ist aktuell als technische Ausbaustufe angelegt. Vollständig produktionsreif ist derzeit der direkte `3x3`-Pfad.
        </p>
      ) : null}
    </div>
  );
}
