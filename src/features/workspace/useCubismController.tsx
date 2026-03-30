import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { createSolvedCubeState } from "@/domain/cube/cube-state";
import { demoScrambleLabel } from "@/domain/cube/demo";
import { formatMove } from "@/domain/cube/move";
import {
  cubeColorHex,
  cubeColorLabels,
  cubeColorOrder,
  faceDisplayName,
  faceOrder,
  supportedDimensions,
  type CubeColor,
  type Face
} from "@/domain/cube/types";
import { appMetadata } from "@/app/app-metadata";
import { useAppStore } from "@/app/store";
import { describeMove, getPhaseBounds, getPhaseTitle, getPlaybackMove } from "@/features/playback/playback-meta";
import { reclassifySessionWithWorker, scanFaceWithWorker } from "@/lib/workers/capture-client";
import { solveWithWorker, validateWithWorker } from "@/lib/workers/solver-client";

const guidedCameraFaces: readonly Face[] = ["U", "R", "F"];

type GuidedScanStatus = "bereit" | "scannt" | "seite-erkannt" | "naechste-seite";
type InspectorMode = "scan" | "edit" | null;

async function createBitmapFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

export function useCubismController() {
  const dimension = useAppStore((state) => state.dimension);
  const captureSession = useAppStore((state) => state.captureSession);
  const cubeState = useAppStore((state) => state.cubeState);
  const selectedCorrectionColor = useAppStore((state) => state.selectedCorrectionColor);
  const validationResult = useAppStore((state) => state.validationResult);
  const solveStatus = useAppStore((state) => state.solveStatus);
  const solveError = useAppStore((state) => state.solveError);
  const solveResult = useAppStore((state) => state.solveResult);
  const playback = useAppStore((state) => state.playback);
  const playbackStates = useAppStore((state) => state.playbackStates);
  const setDimension = useAppStore((state) => state.setDimension);
  const mergeFaceCapture = useAppStore((state) => state.mergeFaceCapture);
  const setCaptureStickerColor = useAppStore((state) => state.setCaptureStickerColor);
  const setSelectedCorrectionColor = useAppStore((state) => state.setSelectedCorrectionColor);
  const setValidationResult = useAppStore((state) => state.setValidationResult);
  const setSolveStatus = useAppStore((state) => state.setSolveStatus);
  const setSolveError = useAppStore((state) => state.setSolveError);
  const acceptSolveResult = useAppStore((state) => state.acceptSolveResult);
  const setPlaybackPlaying = useAppStore((state) => state.setPlaybackPlaying);
  const setPlaybackIndex = useAppStore((state) => state.setPlaybackIndex);
  const stepPlayback = useAppStore((state) => state.stepPlayback);
  const jumpToPhase = useAppStore((state) => state.jumpToPhase);
  const setPlaybackSpeed = useAppStore((state) => state.setPlaybackSpeed);
  const loadDemo = useAppStore((state) => state.loadDemo);
  const resetAll = useAppStore((state) => state.resetAll);

  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureInfo, setCaptureInfo] = useState<string | null>(null);
  const [manualInfo, setManualInfo] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [tipText, setTipText] = useState<string | null>(null);
  const [busyFace, setBusyFace] = useState<Face | null>(null);
  const [manualBusy, setManualBusy] = useState<"validate" | "reclassify" | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOverlayOpen, setCameraOverlayOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<GuidedScanStatus>("bereit");
  const [targetFace, setTargetFace] = useState<Face | null>(null);
  const [lastCapturedFace, setLastCapturedFace] = useState<Face | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [pendingSticker, setPendingSticker] = useState<{ face: Face; index: number; x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);

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

  const viewportState =
    solveResult && playbackStates[playback.moveIndex]
      ? playbackStates[playback.moveIndex]
      : cubeState ?? createSolvedCubeState(dimension);
  const activeMove = solveResult && playback.moveIndex > 0 ? solveResult.moves[playback.moveIndex - 1] : undefined;
  const activeMoveMeta = activeMove ? describeMove(activeMove) : null;
  const currentMove = solveResult ? getPlaybackMove(solveResult, playback.moveIndex) : null;
  const currentMoveMeta = currentMove ? describeMove(currentMove) : null;
  const activePhase = solveResult ? solveResult.phases[playback.phaseIndex] ?? solveResult.phases[0] : null;
  const activePhaseBounds = solveResult ? getPhaseBounds(solveResult, playback.phaseIndex) : null;
  const solutionReady = Boolean(solveResult);
  const tipMove = solveResult?.moves[0];
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
  const highlightedByFace = useMemo(() => {
    const lookup = new Map<string, Set<number>>();

    for (const highlight of validationResult?.highlightedStickers ?? []) {
      const current = lookup.get(highlight.face) ?? new Set<number>();
      current.add(highlight.index);
      lookup.set(highlight.face, current);
    }

    return lookup;
  }, [validationResult]);

  async function handleFileSelection(face: Face, file: File | null) {
    if (!file) {
      return;
    }

    try {
      setBusyFace(face);
      setCaptureError(null);
      setCaptureInfo(null);
      const bitmap = await createBitmapFromFile(file);
      const previewDataUrl = await fileToDataUrl(file);
      const capture = await scanFaceWithWorker(bitmap, face, dimension, "upload");
      mergeFaceCapture({
        ...capture,
        previewDataUrl
      });
      setCaptureInfo(`${faceDisplayName[face]} wurde übernommen.`);
      setInspectorMode("scan");
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Bild konnte nicht verarbeitet werden.");
    } finally {
      setBusyFace(null);
    }
  }

  async function openCameraOverlay() {
    const nextFace = nextGuidedFace ?? guidedCameraFaces[0];

    setCaptureError(null);
    setCaptureInfo(null);
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
      setCaptureInfo(`${faceDisplayName[targetFace]} wurde übernommen.`);
      setInspectorMode("scan");

      const nextFace = guidedCameraFaces[guidedCameraFaces.indexOf(targetFace) + 1] ?? null;
      if (nextFace) {
        setTargetFace(nextFace);
        setCameraStatus("naechste-seite");
        return;
      }

      closeCameraOverlay();
    } catch (error) {
      setCameraStatus("scannt");
      setCaptureError(error instanceof Error ? error.message : "Kamerabild konnte nicht verarbeitet werden.");
    } finally {
      setBusyFace(null);
    }
  }

  async function handleValidate() {
    if (!cubeState) {
      setManualError("Der Würfelzustand ist noch nicht vollständig.");
      return;
    }

    setManualBusy("validate");
    setManualError(null);
    setManualInfo(null);
    try {
      const result = await validateWithWorker(cubeState);
      setValidationResult(result);
      setManualInfo(result.ok ? "Der Zustand ist solverfähig." : result.nextAction);
    } catch (error) {
      setManualError(error instanceof Error ? error.message : "Validierung fehlgeschlagen.");
    } finally {
      setManualBusy(null);
    }
  }

  async function handleReclassify() {
    setManualBusy("reclassify");
    setManualError(null);
    setManualInfo(null);
    try {
      const nextSession = await reclassifySessionWithWorker(captureSession);
      for (const face of faceOrder) {
        const capture = nextSession.faces[face];
        if (capture) {
          mergeFaceCapture(capture);
        }
      }
      setManualInfo("Farben wurden neu klassifiziert.");
      setInspectorMode("edit");
    } catch (error) {
      setManualError(error instanceof Error ? error.message : "Reklassifizierung fehlgeschlagen.");
    } finally {
      setManualBusy(null);
    }
  }

  async function ensureSolveResult() {
    if (!cubeState) {
      throw new Error("Der Würfelzustand ist noch nicht vollständig.");
    }

    setManualError(null);
    setSolveError(null);
    const validation = await validateWithWorker(cubeState);
    setValidationResult(validation);

    if (!validation.ok) {
      throw new Error(validation.nextAction);
    }

    if (solveResult) {
      return solveResult;
    }

    setSolveStatus("running");
    const result = await solveWithWorker(cubeState);
    startTransition(() => {
      acceptSolveResult(result);
    });
    return result;
  }

  async function handleSolve() {
    try {
      setTipText(null);
      await ensureSolveResult();
      setPlaybackPlaying(false);
      setPlaybackIndex(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lösung konnte nicht berechnet werden.";
      setSolveError(message);
      setSolveStatus("error");
    }
  }

  async function handleTip() {
    try {
      const result = await ensureSolveResult();
      const firstMove = result.moves[0];
      if (!firstMove) {
        setTipText("Der Würfel ist bereits gelöst.");
        return;
      }

      setTipText(`Nächster Zug: ${formatMove(firstMove)}`);
      setPlaybackPlaying(false);
      setPlaybackIndex(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tipp konnte nicht berechnet werden.";
      setSolveError(message);
      setSolveStatus("error");
    }
  }

  function handleReset() {
    closeCameraOverlay();
    setCaptureError(null);
    setCaptureInfo(null);
    setManualError(null);
    setManualInfo(null);
    setTipText(null);
    setPendingSticker(null);
    setInspectorMode(null);
    resetAll();
  }

  function handleStickerClick(face: Face, index: number, color: CubeColor) {
    setCaptureStickerColor(face, index, color);
    setManualInfo("Sticker geändert. Prüfe den Zustand erneut.");
    setTipText(null);
  }

  function applyViewportColor(face: Face, index: number, color: CubeColor) {
    setSelectedCorrectionColor(color);
    handleStickerClick(face, index, color);
    setPendingSticker(null);
  }

  function toggleInspector(mode: InspectorMode) {
    setInspectorMode((current) => (current === mode ? null : mode));
  }

  function handleScanClick() {
    setInspectorMode("scan");
    void openCameraOverlay();
  }

  function stopAndRun(action: () => void) {
    setPlaybackPlaying(false);
    action();
  }

  const atStart = playback.moveIndex === 0;
  const atEnd = playback.moveIndex === (solveResult?.moves.length ?? 0);
  const canJumpToPreviousPhase = playback.phaseIndex > 0;
  const canJumpToNextPhase = solveResult ? playback.phaseIndex < solveResult.phases.length - 1 : false;
  const currentTargetFace = targetFace ?? nextGuidedFace;
  const nextPlannedFace =
    currentTargetFace ? guidedCameraFaces[guidedCameraFaces.indexOf(currentTargetFace) + 1] ?? null : null;

  return {
    appMetadata,
    dimension,
    supportedDimensions,
    cubeColorHex,
    cubeColorLabels,
    cubeColorOrder,
    captureSession,
    faceDisplayName,
    faceOrder,
    selectedCorrectionColor,
    solveStatus,
    solveError,
    solveResult,
    playback,
    inspectorMode,
    captureError,
    captureInfo,
    manualError,
    manualInfo,
    manualBusy,
    tipText,
    busyFace,
    validationResult,
    videoRef,
    overlayRef,
    streamReady,
    cameraOverlayOpen,
    cameraStatus,
    guidedFaceStatuses,
    capturedGuidedFaces,
    nextGuidedFace,
    currentTargetFace,
    nextPlannedFace,
    viewportState,
    activeMove,
    activeMoveMeta,
    currentMoveMeta,
    activePhase,
    activePhaseBounds,
    solutionReady,
    tipMove,
    playbackStates,
    pendingSticker,
    highlightedByFace,
    demoScrambleLabel: demoScrambleLabel(),
    setDimension,
    setSelectedCorrectionColor,
    handleFileSelection,
    openCameraOverlay,
    closeCameraOverlay,
    captureFromCamera,
    handleValidate,
    handleReclassify,
    handleSolve,
    handleTip,
    handleReset,
    handleStickerClick,
    applyViewportColor,
    handleScanClick,
    toggleInspector,
    setPendingSticker,
    loadDemo,
    setPlaybackPlaying,
    setPlaybackIndex,
    stopAndRun,
    stepPlayback,
    jumpToPhase,
    setPlaybackSpeed,
    atStart,
    atEnd,
    canJumpToPreviousPhase,
    canJumpToNextPhase,
    getPhaseTitle
  };
}

function isFaceCaptured(faceCapture: { stickers: Array<{ color: CubeColor }> } | undefined): boolean {
  return Boolean(faceCapture?.stickers.some((sticker) => sticker.color !== 6));
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

export function getStatusTitle(status: GuidedScanStatus): string {
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

export function getStatusCopy({
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

  return "Alle drei Standard-Seiten sind erfasst. Als Nächstes folgt die manuelle Prüfung.";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}
