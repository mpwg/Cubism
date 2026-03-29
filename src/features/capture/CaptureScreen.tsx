import { startTransition, useEffect, useRef, useState } from "react";
import { FaceGrid } from "@/features/shared/FaceGrid";
import { demoScrambleLabel } from "@/domain/cube/demo";
import { CubeColor, faceDisplayName, faceOrder, supportedDimensions, type Face } from "@/domain/cube/types";
import { scanFaceWithWorker } from "@/lib/workers/capture-client";
import { useAppStore } from "@/app/store";

const recommendedPhotoFaces: readonly Face[] = ["U", "R", "F"];

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
  const [activeCameraFace, setActiveCameraFace] = useState<Face | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [busyFace, setBusyFace] = useState<Face | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recommendedCapturedCount = recommendedPhotoFaces.filter((face) =>
    captureSession.faces[face]?.stickers.some((sticker) => sticker.color !== CubeColor.Unknown)
  ).length;

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return;
    }

    videoRef.current.srcObject = stream;
    void videoRef.current.play();
  }, [stream]);

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

  async function startCamera(face: Face) {
    try {
      setCaptureError(null);
      setActiveCameraFace(face);
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        },
        audio: false
      });
      setStream(nextStream);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Kamera konnte nicht geöffnet werden.");
    }
  }

  async function captureFromCamera() {
    if (!activeCameraFace || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
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
      setBusyFace(activeCameraFace);
      const capture = await scanFaceWithWorker(bitmap, activeCameraFace, dimension, "camera");
      mergeFaceCapture({
        ...capture,
        previewDataUrl
      });
      stream?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setActiveCameraFace(null);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Kamerabild konnte nicht verarbeitet werden.");
    } finally {
      setBusyFace(null);
    }
  }

  return (
    <div className="panel-stack">
      <div className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="eyebrow">Capture</p>
            <h2>Würfel erfassen</h2>
          </div>
          <p className="panel-card__meta">
            Für den Einstieg genügen meist drei benachbarte Seiten (`U`, `R`, `F`). Den restlichen Zustand ergänzt du danach im Review-
            oder Edit-Modus.
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

        <div className="action-row">
          <button type="button" className="primary-button" onClick={() => startTransition(() => loadDemo(dimension))}>
            Demo laden
          </button>
          <p className="action-row__hint">
            Mindest-Erfassung: {recommendedCapturedCount}/3 Seiten · Demo-Scramble: {demoScrambleLabel()}
          </p>
        </div>

        {captureError ? <p className="inline-error">{captureError}</p> : null}
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
                <div className="face-card__header-meta">
                  {recommendedPhotoFaces.includes(face) ? <span className="confidence-badge">empfohlen</span> : null}
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
                <button type="button" className="secondary-button" onClick={() => void startCamera(face)}>
                  Kamera
                </button>
              </div>

              {busyFace === face ? <p className="panel-card__meta">Analyse läuft …</p> : null}
            </article>
          );
        })}
      </div>

      {activeCameraFace ? (
        <div className="panel-card camera-panel">
          <div className="panel-card__header">
            <div>
              <p className="eyebrow">Kamera</p>
              <h3>{faceDisplayName[activeCameraFace]} aufnehmen</h3>
            </div>
          </div>
          <video ref={videoRef} muted playsInline className="camera-panel__video" />
          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => void captureFromCamera()}>
              Bild übernehmen
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                stream?.getTracks().forEach((track) => track.stop());
                setStream(null);
                setActiveCameraFace(null);
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      <div className="action-row action-row--spread">
        <p className="action-row__hint">Nach drei Fotos kannst du weitergehen. Fehlende Sticker ergänzt du anschließend im Review.</p>
        <button type="button" className="primary-button" onClick={() => setScreen("review")}>
          Weiter zur Prüfung
        </button>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}
