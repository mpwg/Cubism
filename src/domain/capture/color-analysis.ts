import { getOpenCv } from "@/domain/capture/opencv";
import { CubeColor, cubeColorOrder, cubeColorHex, type CaptureSession, type CubeDimension, type Face, type FaceCapture, type LabColor } from "@/domain/cube/types";

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface RegionSample {
  readonly lab: LabColor;
  readonly variability: number;
}

interface GridWindow {
  readonly startX: number;
  readonly startY: number;
  readonly square: number;
  readonly score: number;
}

interface Point2D {
  readonly x: number;
  readonly y: number;
}

interface ClassificationResult {
  readonly color: CubeColor;
  readonly confidence: number;
  readonly bestDistance: number;
  readonly margin: number;
}

const defaultPrototypes = new Map(
  cubeColorOrder.map((color) => [color, hexToLab(cubeColorHex[color])])
);

const candidateScales = [0.6, 0.68, 0.76, 0.84];
const candidateOffsets = [-0.12, -0.06, 0, 0.06, 0.12];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToLab(hex: string): LabColor {
  const normalized = hex.replace("#", "");
  const rgb = {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
  return rgbToLab(rgb);
}

function srgbChannelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbToXyz(rgb: RgbColor): { x: number; y: number; z: number } {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);

  return {
    x: r * 0.4124 + g * 0.3576 + b * 0.1805,
    y: r * 0.2126 + g * 0.7152 + b * 0.0722,
    z: r * 0.0193 + g * 0.1192 + b * 0.9505
  };
}

export function rgbToLab(rgb: RgbColor): LabColor {
  const xyz = rgbToXyz(rgb);
  const reference = { x: 0.95047, y: 1, z: 1.08883 };

  const transform = (value: number): number => {
    const normalized = value > 0 ? value : 0;
    return normalized > 0.008856 ? normalized ** (1 / 3) : 7.787 * normalized + 16 / 116;
  };

  const fx = transform(xyz.x / reference.x);
  const fy = transform(xyz.y / reference.y);
  const fz = transform(xyz.z / reference.z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function deltaE2000(left: LabColor, right: LabColor): number {
  const averageLightness = (left.l + right.l) / 2;
  const chromaLeft = Math.hypot(left.a, left.b);
  const chromaRight = Math.hypot(right.a, right.b);
  const averageChroma = (chromaLeft + chromaRight) / 2;
  const compensation = 0.5 * (1 - Math.sqrt((averageChroma ** 7) / (averageChroma ** 7 + 25 ** 7)));
  const aLeftPrime = left.a * (1 + compensation);
  const aRightPrime = right.a * (1 + compensation);
  const chromaLeftPrime = Math.hypot(aLeftPrime, left.b);
  const chromaRightPrime = Math.hypot(aRightPrime, right.b);
  const deltaLightnessPrime = right.l - left.l;
  const deltaChromaPrime = chromaRightPrime - chromaLeftPrime;
  const averageChromaPrime = (chromaLeftPrime + chromaRightPrime) / 2;

  const huePrime = (a: number, b: number): number => {
    if (a === 0 && b === 0) {
      return 0;
    }

    const hue = radiansToDegrees(Math.atan2(b, a));
    return hue >= 0 ? hue : hue + 360;
  };

  const hueLeftPrime = huePrime(aLeftPrime, left.b);
  const hueRightPrime = huePrime(aRightPrime, right.b);

  let deltaHuePrime = 0;
  if (chromaLeftPrime !== 0 && chromaRightPrime !== 0) {
    const rawDelta = hueRightPrime - hueLeftPrime;
    if (Math.abs(rawDelta) <= 180) {
      deltaHuePrime = rawDelta;
    } else if (rawDelta > 180) {
      deltaHuePrime = rawDelta - 360;
    } else {
      deltaHuePrime = rawDelta + 360;
    }
  }

  const deltaBigHuePrime = 2 * Math.sqrt(chromaLeftPrime * chromaRightPrime) * Math.sin(degreesToRadians(deltaHuePrime / 2));
  const averageLightnessPrime = (left.l + right.l) / 2;

  let averageHuePrime = hueLeftPrime + hueRightPrime;
  if (chromaLeftPrime !== 0 && chromaRightPrime !== 0) {
    if (Math.abs(hueLeftPrime - hueRightPrime) > 180) {
      averageHuePrime += hueLeftPrime + hueRightPrime < 360 ? 360 : -360;
    }
    averageHuePrime /= 2;
  } else {
    averageHuePrime = hueLeftPrime + hueRightPrime;
  }

  const t =
    1 -
    0.17 * Math.cos(degreesToRadians(averageHuePrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * averageHuePrime)) +
    0.32 * Math.cos(degreesToRadians(3 * averageHuePrime + 6)) -
    0.2 * Math.cos(degreesToRadians(4 * averageHuePrime - 63));

  const rotationDelta = 30 * Math.exp(-(((averageHuePrime - 275) / 25) ** 2));
  const scaleLightness = 1 + (0.015 * ((averageLightnessPrime - 50) ** 2)) / Math.sqrt(20 + ((averageLightnessPrime - 50) ** 2));
  const scaleChroma = 1 + 0.045 * averageChromaPrime;
  const scaleHue = 1 + 0.015 * averageChromaPrime * t;
  const rotationTerm = -2 * Math.sqrt((averageChromaPrime ** 7) / (averageChromaPrime ** 7 + 25 ** 7)) * Math.sin(degreesToRadians(2 * rotationDelta));

  const lightnessTerm = deltaLightnessPrime / scaleLightness;
  const chromaTerm = deltaChromaPrime / scaleChroma;
  const hueTerm = deltaBigHuePrime / scaleHue;

  return Math.sqrt(
    lightnessTerm ** 2 +
      chromaTerm ** 2 +
      hueTerm ** 2 +
      rotationTerm * chromaTerm * hueTerm
  );
}

function averageLab(samples: LabColor[]): LabColor {
  const total = samples.reduce(
    (sum, sample) => ({
      l: sum.l + sample.l,
      a: sum.a + sample.a,
      b: sum.b + sample.b
    }),
    { l: 0, a: 0, b: 0 }
  );

  return {
    l: total.l / samples.length,
    a: total.a / samples.length,
    b: total.b / samples.length
  };
}

function weightedAverageLab(samples: Array<{ lab: LabColor; weight: number }>): LabColor {
  const totalWeight = samples.reduce((sum, sample) => sum + sample.weight, 0) || 1;
  const total = samples.reduce(
    (sum, sample) => ({
      l: sum.l + sample.lab.l * sample.weight,
      a: sum.a + sample.lab.a * sample.weight,
      b: sum.b + sample.lab.b * sample.weight
    }),
    { l: 0, a: 0, b: 0 }
  );

  return {
    l: total.l / totalWeight,
    a: total.a / totalWeight,
    b: total.b / totalWeight
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function medianLab(samples: LabColor[]): LabColor {
  return {
    l: median(samples.map((sample) => sample.l)),
    a: median(samples.map((sample) => sample.a)),
    b: median(samples.map((sample) => sample.b))
  };
}

function readPixel(imageData: ImageData, x: number, y: number): RgbColor {
  const clampedX = clamp(Math.round(x), 0, imageData.width - 1);
  const clampedY = clamp(Math.round(y), 0, imageData.height - 1);
  const index = (clampedY * imageData.width + clampedX) * 4;

  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2]
  };
}

function sampleRegionLab(imageData: ImageData, centerX: number, centerY: number, radius: number): RegionSample {
  const samples: LabColor[] = [];
  const rings = [-1, -0.5, 0, 0.5, 1];

  for (const offsetY of rings) {
    for (const offsetX of rings) {
      if (Math.hypot(offsetX, offsetY) > 1.2) {
        continue;
      }

      samples.push(rgbToLab(readPixel(imageData, centerX + offsetX * radius, centerY + offsetY * radius)));
    }
  }

  const medianSample = medianLab(samples);
  const distances = samples.map((sample) => deltaE2000(sample, medianSample));
  const adaptiveThreshold = Math.max(6, median(distances) * 1.8 + 3);
  const inliers = samples.filter((sample) => deltaE2000(sample, medianSample) <= adaptiveThreshold);
  const stableSamples = inliers.length >= 5 ? inliers : samples;
  const lab = averageLab(stableSamples);
  const variability = stableSamples.reduce((sum, sample) => sum + deltaE2000(sample, lab), 0) / stableSamples.length;

  return {
    lab,
    variability
  };
}

function computeConfidence(bestDistance: number, secondBestDistance: number, variability: number): number {
  const proximityScore = clamp(1 - bestDistance / 24, 0, 1);
  const marginScore = clamp((secondBestDistance - bestDistance) / 18, 0, 1);
  const stabilityScore = clamp(1 - variability / 16, 0, 1);

  return clamp(0.08 + proximityScore * 0.42 + marginScore * 0.32 + stabilityScore * 0.18, 0.05, 1);
}

export function classifyLabSample(sample: LabColor, prototypes: Map<CubeColor, LabColor>, variability = 0): ClassificationResult {
  let bestColor = CubeColor.Unknown;
  let bestDistance = Number.POSITIVE_INFINITY;
  let secondBestDistance = Number.POSITIVE_INFINITY;

  for (const [color, prototype] of prototypes.entries()) {
    const distance = deltaE2000(sample, prototype);
    if (distance < bestDistance) {
      secondBestDistance = bestDistance;
      bestDistance = distance;
      bestColor = color;
      continue;
    }

    if (distance < secondBestDistance) {
      secondBestDistance = distance;
    }
  }

  return {
    color: bestColor,
    confidence: computeConfidence(bestDistance, secondBestDistance, variability),
    bestDistance,
    margin: secondBestDistance - bestDistance
  };
}

function gridCenterWeight(index: number, dimension: CubeDimension): number {
  const row = Math.floor(index / dimension);
  const col = index % dimension;
  const center = (dimension - 1) / 2;
  const distance = Math.abs(row - center) + Math.abs(col - center);

  return 1.4 - Math.min(distance / Math.max(dimension - 1, 1), 0.5);
}

function sessionPrototypes(session: CaptureSession): Map<CubeColor, LabColor> {
  const grouped = new Map<CubeColor, Array<{ lab: LabColor; weight: number }>>();
  for (const color of cubeColorOrder) {
    grouped.set(color, []);
  }

  for (const capture of Object.values(session.faces)) {
    if (!capture) {
      continue;
    }

    for (const sticker of capture.stickers) {
      if (sticker.color === CubeColor.Unknown) {
        continue;
      }

      if (sticker.confidence < 0.55) {
        continue;
      }

      grouped.get(sticker.color)?.push({
        lab: sticker.sample,
        weight: sticker.confidence * gridCenterWeight(sticker.index, capture.dimension)
      });
    }
  }

  const prototypes = new Map(defaultPrototypes);
  for (const color of cubeColorOrder) {
    const samples = grouped.get(color) ?? [];
    if (samples.length > 0) {
      prototypes.set(color, weightedAverageLab(samples));
    }
  }

  return prototypes;
}

function evaluateGridWindow(imageData: ImageData, dimension: CubeDimension, startX: number, startY: number, square: number): number {
  const cellSize = square / dimension;
  const sampleRadius = Math.max(1, Math.floor(cellSize * 0.16));
  let total = 0;

  for (let index = 0; index < dimension * dimension; index += 1) {
    const row = Math.floor(index / dimension);
    const col = index % dimension;
    const centerX = startX + (col + 0.5) * cellSize;
    const centerY = startY + (row + 0.5) * cellSize;
    const sample = sampleRegionLab(imageData, centerX, centerY, sampleRadius);
    const classification = classifyLabSample(sample.lab, defaultPrototypes, sample.variability);
    total += classification.confidence + clamp(classification.margin / 20, 0, 0.6) - clamp(sample.variability / 24, 0, 0.5);
  }

  return total / (dimension * dimension);
}

function resolveGridWindow(imageData: ImageData, dimension: CubeDimension): GridWindow {
  const base = Math.min(imageData.width, imageData.height);
  let best: GridWindow = {
    startX: (imageData.width - base * 0.72) / 2,
    startY: (imageData.height - base * 0.72) / 2,
    square: base * 0.72,
    score: Number.NEGATIVE_INFINITY
  };

  for (const scale of candidateScales) {
    const square = base * scale;
    for (const offsetX of candidateOffsets) {
      for (const offsetY of candidateOffsets) {
        const startX = clamp((imageData.width - square) / 2 + offsetX * base, 0, imageData.width - square);
        const startY = clamp((imageData.height - square) / 2 + offsetY * base, 0, imageData.height - square);
        const score = evaluateGridWindow(imageData, dimension, startX, startY, square);

        if (score > best.score) {
          best = {
            startX,
            startY,
            square,
            score
          };
        }
      }
    }
  }

  return best;
}

function cropImageData(imageData: ImageData, startX: number, startY: number, square: number): ImageData {
  const clampedSquare = Math.max(1, Math.floor(square));
  const data = new Uint8ClampedArray(clampedSquare * clampedSquare * 4);

  for (let row = 0; row < clampedSquare; row += 1) {
    for (let col = 0; col < clampedSquare; col += 1) {
      const pixel = readPixel(imageData, startX + col, startY + row);
      const offset = (row * clampedSquare + col) * 4;
      data[offset] = pixel.r;
      data[offset + 1] = pixel.g;
      data[offset + 2] = pixel.b;
      data[offset + 3] = 255;
    }
  }

  return new ImageData(data, clampedSquare, clampedSquare);
}

function scoreCandidateQuad(points: Point2D[], imageWidth: number, imageHeight: number): number {
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const area = polygonArea(points);
  const centerDistance = Math.hypot(centerX - imageWidth / 2, centerY - imageHeight / 2);
  const normalization = Math.hypot(imageWidth / 2, imageHeight / 2) || 1;

  return area - (centerDistance / normalization) * area * 0.28;
}

function polygonArea(points: Point2D[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
}

function orderQuadPoints(points: Point2D[]): [Point2D, Point2D, Point2D, Point2D] {
  const sortedBySum = [...points].sort((left, right) => left.x + left.y - (right.x + right.y));
  const topLeft = sortedBySum[0];
  const bottomRight = sortedBySum[sortedBySum.length - 1];
  const remaining = points.filter((point) => point !== topLeft && point !== bottomRight);
  const [first, second] = remaining.sort((left, right) => left.x - right.x);

  const topRight = first.y < second.y ? first : second;
  const bottomLeft = first.y < second.y ? second : first;

  return [topLeft, topRight, bottomRight, bottomLeft];
}

async function normalizeFaceImageDataWithOpenCv(imageData: ImageData): Promise<ImageData | null> {
  const cv = await getOpenCv();
  const source = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const approx = new cv.Mat();
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edges, 45, 140);
    cv.dilate(edges, edges, kernel);
    cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let bestPoints: Point2D[] | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const perimeter = cv.arcLength(contour, true);
      cv.approxPolyDP(contour, approx, perimeter * 0.03, true);

      if (approx.rows !== 4) {
        contour.delete();
        continue;
      }

      const points = Array.from({ length: 4 }, (_, pointIndex) => ({
        x: approx.intPtr(pointIndex, 0)[0],
        y: approx.intPtr(pointIndex, 0)[1]
      }));
      const area = polygonArea(points);
      if (area < imageData.width * imageData.height * 0.08) {
        contour.delete();
        continue;
      }

      const score = scoreCandidateQuad(points, imageData.width, imageData.height);
      if (score > bestScore) {
        bestScore = score;
        bestPoints = points;
      }

      contour.delete();
    }

    if (!bestPoints) {
      return null;
    }

    const [topLeft, topRight, bottomRight, bottomLeft] = orderQuadPoints(bestPoints);
    const targetSize = 360;
    const sourceQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [
      topLeft.x, topLeft.y,
      topRight.x, topRight.y,
      bottomRight.x, bottomRight.y,
      bottomLeft.x, bottomLeft.y
    ]);
    const targetQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      targetSize - 1, 0,
      targetSize - 1, targetSize - 1,
      0, targetSize - 1
    ]);
    const transform = cv.getPerspectiveTransform(sourceQuad, targetQuad);
    const warped = new cv.Mat();

    try {
      cv.warpPerspective(
        source,
        warped,
        transform,
        new cv.Size(targetSize, targetSize),
        cv.INTER_LINEAR,
        cv.BORDER_REPLICATE,
        new cv.Scalar()
      );

      return new ImageData(new Uint8ClampedArray(warped.data), warped.cols, warped.rows);
    } finally {
      sourceQuad.delete();
      targetQuad.delete();
      transform.delete();
      warped.delete();
    }
  } finally {
    kernel.delete();
    approx.delete();
    hierarchy.delete();
    contours.delete();
    edges.delete();
    blurred.delete();
    gray.delete();
    source.delete();
  }
}

function buildFaceCaptureFromWindow(
  imageData: ImageData,
  face: Face,
  dimension: CubeDimension,
  source: "camera" | "upload",
  window: GridWindow
): FaceCapture {
  const cellSize = window.square / dimension;
  const sampleRadius = Math.max(1, Math.floor(cellSize * 0.16));

  const stickers = Array.from({ length: dimension * dimension }, (_, index) => {
    const row = Math.floor(index / dimension);
    const col = index % dimension;
    const centerX = window.startX + (col + 0.5) * cellSize;
    const centerY = window.startY + (row + 0.5) * cellSize;
    const sample = sampleRegionLab(imageData, centerX, centerY, sampleRadius);
    const classification = classifyLabSample(sample.lab, defaultPrototypes, sample.variability);

    return {
      index,
      color: classification.color,
      confidence: classification.confidence,
      sample: sample.lab
    };
  });

  return {
    dimension,
    face,
    stickers,
    source,
    confidence: stickers.reduce((sum, sticker) => sum + sticker.confidence, 0) / stickers.length
  };
}

export function scanFaceImageData(
  imageData: ImageData,
  face: Face,
  dimension: CubeDimension,
  source: "camera" | "upload"
): FaceCapture {
  const window = resolveGridWindow(imageData, dimension);
  return buildFaceCaptureFromWindow(imageData, face, dimension, source, window);
}

export async function scanFaceBitmap(
  imageBitmap: ImageBitmap,
  face: Face,
  dimension: CubeDimension,
  source: "camera" | "upload"
): Promise<FaceCapture> {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("2D-Kontext für OffscreenCanvas nicht verfügbar.");
  }

  context.drawImage(imageBitmap, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const normalized = await normalizeFaceImageDataWithOpenCv(imageData);

  if (normalized) {
    return buildFaceCaptureFromWindow(
      normalized,
      face,
      dimension,
      source,
      {
        startX: 0,
        startY: 0,
        square: Math.min(normalized.width, normalized.height),
        score: 1
      }
    );
  }

  const fallbackWindow = resolveGridWindow(imageData, dimension);
  return buildFaceCaptureFromWindow(
    cropImageData(imageData, fallbackWindow.startX, fallbackWindow.startY, fallbackWindow.square),
    face,
    dimension,
    source,
    {
      startX: 0,
      startY: 0,
      square: Math.max(1, Math.floor(fallbackWindow.square)),
      score: fallbackWindow.score
    }
  );
}

export function reclassifyCaptureSession(session: CaptureSession): CaptureSession {
  const prototypes = sessionPrototypes(session);
  const faces = Object.fromEntries(
    Object.entries(session.faces).map(([face, capture]) => {
      if (!capture) {
        return [face, capture];
      }

      const stickers = capture.stickers.map((sticker) => {
        const classification = classifyLabSample(sticker.sample, prototypes, 0);
        return {
          ...sticker,
          color: classification.color,
          confidence: classification.confidence
        };
      });

      return [
        face,
        {
          ...capture,
          stickers,
          confidence: stickers.reduce((sum, sticker) => sum + sticker.confidence, 0) / stickers.length
        }
      ];
    })
  ) as CaptureSession["faces"];

  return {
    ...session,
    faces
  };
}
