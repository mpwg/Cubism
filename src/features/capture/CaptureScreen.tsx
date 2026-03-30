import { startTransition, useEffect, useRef, useState } from "react";
import { FaceGrid } from "@/features/shared/FaceGrid";
import { demoScrambleLabel } from "@/domain/cube/demo";
import { CubeColor, faceDisplayName, faceOrder, supportedDimensions, type Face } from "@/domain/cube/types";
import { scanFaceWithWorker } from "@/lib/workers/capture-client";
import { useAppStore } from "@/app/store";

const guidedCameraFaces: readonly Face[] = ["U", "R", "F"];

type GuidedScanStatus = "bereit" | "scannt" | "seite-erkannt" | "naechste-seite";

async function createBitmapFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

export function CaptureScreen() {
  const dimension = useAppStore((state) => state.dimension);
  const captureSession = useAppStore((state) => state.captureSession);
  const setDimension = useAppStore((state) => state.setDimension);
  const mergeFaceCapture = useAppStore((state) => state.mergeFaceCapture);
  const loadDemo = useAppStore((state) => state.loadDemo);
  const setScreen = useAppStore((state) => state.setScreen);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [busyFace, setBusyFace] = useState<Face | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOverlayOpen, setCameraOverlayOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<GuidedScanStatus>("bereit");
  const [targetFace, setTargetFace] = useState<Face | null>(null);
  const [lastCapturedFace, setLastCapturedFace] = useState<Face | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);

  const capturedGuidedFaces = guidedCameraFaces.filter((face) => isFaceCaptured(captureSession.faces[face]));
  const nextGuidedFace = guidedCameraFaces.find((face) => !isFaceCaptured(captureSession.faces[face])) ?? null;
  const guidedFaceStatuses = guidedCameraFaces.map((face) => ({
    face,
    state:
      face === targetFace && cameraOverlayOpen
        ? "active"
        : capturedGuidedFaces.includes(face)
          ? "done"
          : "pending"
  }));

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return;
    }

    videoRef.current.srcObject = stream;
    void videoRef.current.play();
  }, [stream]);

  useEffect(() => {
    if (!cameraOverlayOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0 });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    requestAnimationFrame(() => {
      if (!overlayRef.current) {
        return;
      }

      if (typeof overlayRef.current.scrollTo === "function") {
        overlayRef.current.scrollTo({ top: 0, left: 0 });
        return;
      }

      overlayRef.current.scrollTop = 0;
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cameraOverlayOpen]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  async function handleFileSelection(face: Face, file: File | null) {
    if (!file) {
      return;
    }

    try {
      setBusyFace(face);
      setCaptureError(null);
      const bitmap = await createBitmapFromFile(file);
      const previewDataUrl = await fileToDataUrl(file);
      const capture = await scanFaceWithWorker(bitmap, face, dimension, "upload");
      mergeFaceCapture({
        ...capture,
        previewDataUrl
      });
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Bild konnte nicht verarbeitet werden.");
    } finally {
      setBusyFace(null);
    }
  }

  async function openCameraOverlay() {
    const nextFace = nextGuidedFace ?? guidedCameraFaces[0];

    setCaptureError(null);
    setCameraOverlayOpen(true);
    setTargetFace(nextFace);
    setLastCapturedFace(null);
    setStreamReady(false);
    setCameraStatus("bereit");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCaptureError("Auf diesem Gerät ist kein Kamerazugriff im Browser verfügbar.");
      return;
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        },
        audio: false
      });
      setStream(nextStream);
      setStreamReady(true);
      setCameraStatus("scannt");
    } catch (error) {
      setCaptureError(getCameraErrorMessage(error));
    }
  }

  function stopStream() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setStreamReady(false);
  }

  function closeCameraOverlay() {
    stopStream();
    setCameraOverlayOpen(false);
    setTargetFace(null);
    setLastCapturedFace(null);
    setCameraStatus("bereit");
  }

  async function captureFromCamera() {
    if (!targetFace || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCaptureError("Die Kamera liefert noch kein verwertbares Bild. Halte den Würfel ruhig ins Raster und versuche es erneut.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCaptureError("Canvas-Kontext für Kameracapture fehlt.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const previewDataUrl = canvas.toDataURL("image/webp", 0.9);
    const bitmap = await createImageBitmap(canvas);

    try {
      setCaptureError(null);
      setBusyFace(targetFace);
      setCameraStatus("seite-erkannt");
      const capture = await scanFaceWithWorker(bitmap, targetFace, dimension, "camera");
      mergeFaceCapture({
        ...capture,
        previewDataUrl
      });
      setLastCapturedFace(targetFace);

      const nextFace = guidedCameraFaces[guidedCameraFaces.indexOf(targetFace) + 1] ?? null;
      if (nextFace) {
        setTargetFace(nextFace);
        setCameraStatus("naechste-seite");
        return;
      }

      closeCameraOverlay();
      startTransition(() => setScreen("review"));
    } catch (error) {
      setCameraStatus("scannt");
      setCaptureError(error instanceof Error ? error.message : "Kamerabild konnte nicht verarbeitet werden.");
    } finally {
      setBusyFace(null);
    }
  }

  const currentTargetFace = targetFace ?? nextGuidedFace;
  const nextPlannedFace =
    currentTargetFace ? guidedCameraFaces[guidedCameraFaces.indexOf(currentTargetFace) + 1] ?? null : null;

  return (
    <div className="panel-stack">
      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Capture</p>
            <h2>Würfel erfassen</h2>
          </div>
          <p className="panel-card__meta">
            Standard-Flow: drei benachbarte Seiten (`U`, `R`, `F`) scannen, dann direkt in die Prüfung wechseln.
          </p>
        </div>

        <div className="dimension-switch">
          {supportedDimensions.map((candidate) => (
            <button
              key={candidate}
              type="button"
              className={`pill-button${candidate === dimension ? " pill-button--active" : ""}`}
              onClick={() => setDimension(candidate)}
            >
              {candidate}x{candidate}
            </button>
          ))}
        </div>

        <section className="capture-flow-hero">
          <div className="capture-flow-hero__copy">
            <p className="eyebrow">Geführter Scan</p>
            <h3>Drei Seiten, ein klarer Einstieg</h3>
            <p className="panel-card__meta">
              Starte mit <strong>{faceDisplayName[guidedCameraFaces[0]]}</strong>, drehe dann zu <strong>{faceDisplayName[guidedCameraFaces[1]]}</strong> und
              anschließend zu <strong>{faceDisplayName[guidedCameraFaces[2]]}</strong>. Der Overlay-Flow zeigt dir nach jeder Übernahme sofort die nächste Zielseite.
            </p>
          </div>

          <div className="capture-flow-hero__actions">
            <button type="button" className="primary-button" onClick={() => void openCameraOverlay()}>
              Cube fotografieren
            </button>
            <button type="button" className="secondary-button" onClick={() => startTransition(() => loadDemo(dimension))}>
              Demo laden
            </button>
            <p className="action-row__hint">
              Fortschritt: {capturedGuidedFaces.length}/3 Seiten · Demo-Scramble: {demoScrambleLabel()}
            </p>
          </div>
        </section>

        <div className="guided-face-strip" aria-label="Scan-Fortschritt">
          {guidedFaceStatuses.map((entry, index) => (
            <article
              key={entry.face}
              className={`guided-face-chip guided-face-chip--${entry.state}`}
              aria-current={entry.state === "active" ? "step" : undefined}
            >
              <span className="guided-face-chip__step">Schritt {index + 1}</span>
              <strong>{faceDisplayName[entry.face]}</strong>
              <small>
                {entry.state === "done" ? "erfasst" : entry.state === "active" ? "jetzt im Fokus" : "folgt"}
              </small>
            </article>
          ))}
        </div>

        <div className="capture-flow-summary">
          <p className="panel-card__meta">
            {nextGuidedFace
              ? `Nächste Zielseite: ${faceDisplayName[nextGuidedFace]}. Danach ergänzt du fehlende Sticker wie gewohnt im Review.`
              : "Drei Seiten sind bereits vorhanden. Du kannst direkt zur Prüfung wechseln oder den Kamera-Flow erneut starten."}
          </p>
          <button type="button" className="secondary-button" onClick={() => setScreen("review")}>
            Weiter zur Prüfung
          </button>
        </div>

        {captureError ? <p className="inline-error">{captureError}</p> : null}
      </div>

      <div className="face-card-grid">
        {faceOrder.map((face) => {
          const capture = captureSession.faces[face]!;
          const isGuidedFace = guidedCameraFaces.includes(face);

          return (
            <article key={face} className={`panel-card face-card${isGuidedFace ? " face-card--highlighted" : ""}`}>
              <div className="face-card__header">
                <div>
                  <p className="eyebrow">{face}</p>
                  <h3>{faceDisplayName[face]}</h3>
                </div>
                <div className="face-card__header-meta">
                  {isGuidedFace ? <span className="confidence-badge">Standard-Flow</span> : null}
                  <span className="confidence-badge">{Math.round(capture.confidence * 100)}%</span>
                </div>
              </div>

              <FaceGrid capture={capture} />

              <div className="action-row">
                <label className="secondary-button file-button">
                  Bild laden
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      void handleFileSelection(face, event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {busyFace === face ? <span className="panel-card__meta">Analyse läuft …</span> : null}
              </div>
            </article>
          );
        })}
      </div>

      {cameraOverlayOpen ? (
        <div className="camera-overlay-layer" role="presentation">
          <button
            type="button"
            className="camera-overlay-backdrop"
            aria-label="Kamera-Overlay schließen"
            onClick={closeCameraOverlay}
          />

          <section
            className="camera-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-overlay-title"
            data-testid="camera-overlay"
            ref={overlayRef}
          >
            <div className="camera-overlay__header">
              <div>
                <p className="eyebrow">Kamera-Scan</p>
                <h2 id="camera-overlay-title">
                  {currentTargetFace ? `${faceDisplayName[currentTargetFace]} scannen` : "Scan vorbereiten"}
                </h2>
              </div>
              <div className="camera-overlay__meta">
                <span className="confidence-badge">
                  {capturedGuidedFaces.length}/{guidedCameraFaces.length} erfasst
                </span>
                <button type="button" className="secondary-button" onClick={closeCameraOverlay}>
                  Schließen
                </button>
              </div>
            </div>

            <div className="camera-overlay__body">
              <div className="camera-stage">
                <video ref={videoRef} muted playsInline className="camera-stage__video" />
                <div className="camera-stage__grid" aria-hidden="true">
                  <div className="camera-stage__grid-frame" />
                </div>
                {!streamReady ? (
                  <div className="camera-stage__placeholder">
                    <strong>Kamera wird geöffnet …</strong>
                    <span>Falls nichts erscheint, prüfe die Browser-Berechtigung für die Rückkamera.</span>
                  </div>
                ) : null}
              </div>

              <aside className="camera-overlay__sidebar">
                <div className="camera-overlay__status-card">
                  <p className="eyebrow">Status</p>
                  <h3>{getStatusTitle(cameraStatus)}</h3>
                  <p className="panel-card__meta">
                    {getStatusCopy({
                      currentTargetFace,
                      lastCapturedFace,
                      nextPlannedFace
                    })}
                  </p>
                </div>

                <div className="camera-overlay__status-card">
                  <p className="eyebrow">Reihenfolge</p>
                  <div className="guided-face-strip guided-face-strip--stacked">
                    {guidedFaceStatuses.map((entry, index) => (
                      <article key={`${entry.face}-overlay`} className={`guided-face-chip guided-face-chip--${entry.state}`}>
                        <span className="guided-face-chip__step">Schritt {index + 1}</span>
                        <strong>{faceDisplayName[entry.face]}</strong>
                        <small>
                          {entry.state === "done" ? "bereits übernommen" : entry.state === "active" ? "jetzt ausrichten" : "anschließend scannen"}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="camera-overlay__status-card">
                  <p className="eyebrow">Ausrichtung</p>
                  <p className="panel-card__meta">
                    Halte eine Würfelseite mittig ins Raster, fülle den Rahmen sauber aus und vermeide abgeschnittene Ecken oder harte Spiegelungen.
                  </p>
                </div>
              </aside>
            </div>

            <div className="camera-overlay__actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void captureFromCamera()}
                disabled={!streamReady || !currentTargetFace || busyFace === currentTargetFace}
              >
                {busyFace === currentTargetFace ? "Analysiere …" : "Seite übernehmen"}
              </button>
              <button type="button" className="secondary-button" onClick={() => void openCameraOverlay()}>
                Kamera neu starten
              </button>
              <button type="button" className="secondary-button" onClick={closeCameraOverlay}>
                Abbrechen
              </button>
            </div>

            {captureError ? <p className="inline-error">{captureError}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function isFaceCaptured(faceCapture: { stickers: Array<{ color: CubeColor }> } | undefined): boolean {
  return Boolean(faceCapture?.stickers.some((sticker) => sticker.color !== CubeColor.Unknown));
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Der Kamerazugriff wurde blockiert. Erlaube die Kamera im Browser und starte den Scan erneut.";
    }

    if (error.name === "NotFoundError") {
      return "Es wurde keine nutzbare Kamera gefunden.";
    }
  }

  return error instanceof Error ? error.message : "Kamera konnte nicht geöffnet werden.";
}

function getStatusTitle(status: GuidedScanStatus): string {
  switch (status) {
    case "seite-erkannt":
      return "Seite erkannt";
    case "naechste-seite":
      return "Nächste Seite";
    case "scannt":
      return "Live-Feed aktiv";
    default:
      return "Bereit";
  }
}

function getStatusCopy({
  currentTargetFace,
  lastCapturedFace,
  nextPlannedFace
}: {
  currentTargetFace: Face | null;
  lastCapturedFace: Face | null;
  nextPlannedFace: Face | null;
}): string {
  if (lastCapturedFace && currentTargetFace) {
    return `${faceDisplayName[lastCapturedFace]} wurde übernommen. Richte jetzt ${faceDisplayName[currentTargetFace]} mittig im Raster aus.`;
  }

  if (currentTargetFace && nextPlannedFace) {
    return `Starte mit ${faceDisplayName[currentTargetFace]}. Als Nächstes folgt ${faceDisplayName[nextPlannedFace]}.`;
  }

  if (currentTargetFace) {
    return `Richte ${faceDisplayName[currentTargetFace]} mittig aus und übernimm dann die Seite.`;
  }

  return "Alle drei Standard-Seiten sind erfasst. Als Nächstes folgt die Prüfung.";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}
