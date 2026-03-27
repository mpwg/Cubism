import { CubeColor, cubeColorOrder, cubeColorHex, type CaptureSession, type CubeDimension, type Face, type FaceCapture, type LabColor } from "@/domain/cube/types";

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const defaultPrototypes = new Map(
  cubeColorOrder.map((color) => [color, hexToLab(cubeColorHex[color])])
);

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

function labDistance(left: LabColor, right: LabColor): number {
  return Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b);
}

function classifyLab(sample: LabColor, prototypes: Map<CubeColor, LabColor>): { color: CubeColor; confidence: number } {
  let bestColor = CubeColor.Unknown;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [color, prototype] of prototypes.entries()) {
    const distance = labDistance(sample, prototype);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestColor = color;
    }
  }

  return {
    color: bestColor,
    confidence: clamp(1 - bestDistance / 85, 0.1, 1)
  };
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

function sessionPrototypes(session: CaptureSession): Map<CubeColor, LabColor> {
  const grouped = new Map<CubeColor, LabColor[]>();
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

      grouped.get(sticker.color)?.push(sticker.sample);
    }
  }

  const prototypes = new Map(defaultPrototypes);
  for (const color of cubeColorOrder) {
    const samples = grouped.get(color) ?? [];
    if (samples.length > 0) {
      prototypes.set(color, averageLab(samples));
    }
  }

  return prototypes;
}

function sampleRegionAverage(imageData: ImageData, centerX: number, centerY: number, radius: number): RgbColor {
  let samples = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  const { width, height, data } = imageData;

  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const x = clamp(Math.round(centerX + offsetX), 0, width - 1);
      const y = clamp(Math.round(centerY + offsetY), 0, height - 1);
      const index = (y * width + x) * 4;
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      samples += 1;
    }
  }

  return {
    r: red / samples,
    g: green / samples,
    b: blue / samples
  };
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
  const square = Math.min(canvas.width, canvas.height) * 0.72;
  const startX = (canvas.width - square) / 2;
  const startY = (canvas.height - square) / 2;
  const cellSize = square / dimension;
  const sampleRadius = Math.max(1, Math.floor(cellSize * 0.18));

  const stickers = Array.from({ length: dimension * dimension }, (_, index) => {
    const row = Math.floor(index / dimension);
    const col = index % dimension;
    const centerX = startX + (col + 0.5) * cellSize;
    const centerY = startY + (row + 0.5) * cellSize;
    const lab = rgbToLab(sampleRegionAverage(imageData, centerX, centerY, sampleRadius));
    const classification = classifyLab(lab, defaultPrototypes);

    return {
      index,
      color: classification.color,
      confidence: classification.confidence,
      sample: lab
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

export function reclassifyCaptureSession(session: CaptureSession): CaptureSession {
  const prototypes = sessionPrototypes(session);
  const faces = Object.fromEntries(
    Object.entries(session.faces).map(([face, capture]) => {
      if (!capture) {
        return [face, capture];
      }

      const stickers = capture.stickers.map((sticker) => {
        const classification = classifyLab(sticker.sample, prototypes);
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
