import { startTransition, useEffect, useMemo, useState } from "react";
import { FaceGrid } from "@/features/shared/FaceGrid";
import { cubeColorHex, cubeColorLabels, cubeColorOrder, faceDisplayName, faceOrder } from "@/domain/cube/types";
import { reclassifySessionWithWorker } from "@/lib/workers/capture-client";
import { validateWithWorker } from "@/lib/workers/solver-client";
import { useAppStore } from "@/app/store";

const validationStatusMeta = {
  ok: { title: "Belastbar validiert", className: "success-text" },
  incomplete: { title: "Noch unvollständig", className: "inline-info" },
  inconsistent: { title: "Noch inkonsistent", className: "inline-error" },
  unsolvable: { title: "Vollständig, aber nicht lösbar", className: "inline-error" }
} as const;

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
  const [info, setInfo] = useState<string | null>(null);
  const validationMeta = validationResult ? validationStatusMeta[validationResult.status] ?? validationStatusMeta.incomplete : null;

  const highlightedByFace = useMemo(() => {
    const lookup = new Map<string, Set<number>>();

    for (const highlight of validationResult?.highlightedStickers ?? []) {
      const current = lookup.get(highlight.face) ?? new Set<number>();
      current.add(highlight.index);
      lookup.set(highlight.face, current);
    }

    return lookup;
  }, [validationResult]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const index = Number(event.key) - 1;
      if (Number.isNaN(index) || index < 0 || index >= cubeColorOrder.length) {
        return;
      }

      event.preventDefault();
      setSelectedCorrectionColor(cubeColorOrder[index]);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedCorrectionColor]);

  async function handleValidate() {
    if (!cubeState) {
      setError("Es fehlen noch Sticker. Ergänze die übrigen Flächen im Review oder über den Edit-Modus am 3D-Würfel.");
      return;
    }

    setBusy("validate");
    setError(null);
    setInfo(null);
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
    setInfo(null);
    try {
      const nextSession = await reclassifySessionWithWorker(captureSession);
      for (const face of faceOrder) {
        const capture = nextSession.faces[face];
        if (capture) {
          mergeFaceCapture(capture);
        }
      }
      setInfo("Farben wurden neu klassifiziert. Prüfe den Zustand danach erneut, bevor du weitergehst.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Reklassifizierung fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  function handleStickerClick(face: (typeof faceOrder)[number], index: number) {
    setCaptureStickerColor(face, index, selectedColor);
    setInfo("Sticker geändert. Prüfe den Zustand erneut, damit Review und Solve wieder synchron sind.");
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
          {cubeColorOrder.map((color, index) => (
            <button
              key={color}
              type="button"
              className={`palette-swatch${selectedColor === color ? " palette-swatch--active" : ""}`}
              style={{ backgroundColor: cubeColorHex[color] }}
              aria-label={`Farbe ${cubeColorLabels[color]} wählen`}
              title={`${cubeColorLabels[color]} (${index + 1})`}
              onClick={() => setSelectedCorrectionColor(color)}
            />
          ))}
        </div>

        <p className="panel-card__meta">
          Aktive Farbe: {cubeColorLabels[selectedColor]} · Schnellwahl per Taste `1` bis `{cubeColorOrder.length}`
        </p>

        <div className="action-row">
          <button type="button" className="secondary-button" onClick={() => void handleReclassify()}>
            {busy === "reclassify" ? "Reklassifiziere …" : "Farben neu klassifizieren"}
          </button>
          <button type="button" className="primary-button" onClick={() => void handleValidate()}>
            {busy === "validate" ? "Prüfe …" : "Zustand prüfen"}
          </button>
        </div>

        {error ? <p className="inline-error">{error}</p> : null}
        {info ? <p className="inline-info">{info}</p> : null}

        {validationResult ? (
          <div className="review-feedback">
            <p className={validationMeta?.className ?? "inline-info"}>
              <strong>{validationMeta?.title ?? "Status unbekannt"}.</strong> {validationResult.nextAction}
            </p>

            {validationResult.ok ? null : (
              <>
                <div className="review-feedback__groups">
                  {validationResult.groups.map((group) => (
                    <article key={group.category} className="review-feedback__group">
                      <h3>{group.title}</h3>
                      <p>{group.description}</p>
                      <small>{group.count} Hinweis{group.count === 1 ? "" : "e"}</small>
                    </article>
                  ))}
                </div>

                <ul className="message-list">
                  {validationResult.errors.map((validationError) => (
                    <li key={`${validationError.code}-${validationError.index ?? validationError.face ?? "global"}`}>
                      {validationError.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <p className="inline-info">
            Prüfe den Zustand nach manuellen Änderungen erneut. Erst eine erfolgreiche Validierung öffnet den Solve-Schritt.
          </p>
        )}
      </div>

      <div className="face-card-grid">
        {faceOrder.map((face) => {
          const capture = captureSession.faces[face]!;
          const highlightedIndices = Array.from(highlightedByFace.get(face) ?? []);
          const faceHighlighted = validationResult?.highlightedFaces.includes(face) ?? false;

          return (
            <article key={face} className={`panel-card face-card${faceHighlighted ? " face-card--highlighted" : ""}`}>
              <div className="face-card__header">
                <div>
                  <p className="eyebrow">{face}</p>
                  <h3>{faceDisplayName[face]}</h3>
                </div>
                {faceHighlighted ? <span className="confidence-badge">Prüfen</span> : null}
              </div>
              <FaceGrid
                capture={capture}
                editable
                selectedColor={selectedColor}
                highlightedIndices={highlightedIndices}
                onStickerClick={(index) => handleStickerClick(face, index)}
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
