import { describe, expect, it } from "vitest";
import { CubeColor, type LabColor } from "@/domain/cube/types";
import { classifyLabSample, deltaE2000, rgbToLab, scanFaceImageData } from "@/domain/capture/color-analysis";

function createImageData(width: number, height: number, fill: { r: number; g: number; b: number }) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    data[offset] = fill.r;
    data[offset + 1] = fill.g;
    data[offset + 2] = fill.b;
    data[offset + 3] = 255;
  }

  return {
    data,
    width,
    height
  } as ImageData;
}

function paintRect(imageData: ImageData, x: number, y: number, width: number, height: number, fill: { r: number; g: number; b: number }) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      const offset = (row * imageData.width + col) * 4;
      imageData.data[offset] = fill.r;
      imageData.data[offset + 1] = fill.g;
      imageData.data[offset + 2] = fill.b;
      imageData.data[offset + 3] = 255;
    }
  }
}

function rgb(r: number, g: number, b: number) {
  return { r, g, b };
}

function createShiftedFaceImage(colors: Array<{ r: number; g: number; b: number }>, offsetX: number, offsetY: number): ImageData {
  const imageData = createImageData(180, 180, rgb(20, 20, 20));
  const cellSize = 34;
  const startX = 28 + offsetX;
  const startY = 20 + offsetY;

  colors.forEach((color, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    paintRect(imageData, startX + col * cellSize, startY + row * cellSize, cellSize - 4, cellSize - 4, color);
  });

  return imageData;
}

const defaultPrototypes = new Map<CubeColor, LabColor>([
  [CubeColor.White, rgbToLab(rgb(239, 231, 216))],
  [CubeColor.Red, rgbToLab(rgb(213, 90, 53))],
  [CubeColor.Green, rgbToLab(rgb(78, 127, 90))],
  [CubeColor.Yellow, rgbToLab(rgb(239, 197, 65))],
  [CubeColor.Orange, rgbToLab(rgb(216, 135, 43))],
  [CubeColor.Blue, rgbToLab(rgb(56, 109, 213))]
]);

describe("color analysis", () => {
  it("klassifiziert schwierige Weiß/Gelb- und Rot/Orange-Proben stabiler", () => {
    const warmWhite = classifyLabSample(rgbToLab(rgb(241, 234, 220)), defaultPrototypes, 1.5);
    const warmYellow = classifyLabSample(rgbToLab(rgb(237, 209, 108)), defaultPrototypes, 1.5);
    const red = classifyLabSample(rgbToLab(rgb(207, 89, 60)), defaultPrototypes, 1.5);
    const orange = classifyLabSample(rgbToLab(rgb(218, 141, 60)), defaultPrototypes, 1.5);

    expect(warmWhite.color).toBe(CubeColor.White);
    expect(warmYellow.color).toBe(CubeColor.Yellow);
    expect(red.color).toBe(CubeColor.Red);
    expect(orange.color).toBe(CubeColor.Orange);
    expect(warmWhite.confidence).toBeGreaterThan(0.55);
    expect(warmYellow.confidence).toBeGreaterThan(0.55);
  });

  it("wertet leichte Dezentrierung beim Drei-mal-Drei-Scan robuster aus", () => {
    const imageData = createShiftedFaceImage(
      [
        rgb(239, 231, 216),
        rgb(213, 90, 53),
        rgb(78, 127, 90),
        rgb(239, 197, 65),
        rgb(216, 135, 43),
        rgb(56, 109, 213),
        rgb(239, 231, 216),
        rgb(213, 90, 53),
        rgb(78, 127, 90)
      ],
      18,
      -12
    );

    const capture = scanFaceImageData(imageData, "U", 3, "camera");

    expect(capture.stickers.map((sticker) => sticker.color)).toEqual([
      CubeColor.White,
      CubeColor.Red,
      CubeColor.Green,
      CubeColor.Yellow,
      CubeColor.Orange,
      CubeColor.Blue,
      CubeColor.White,
      CubeColor.Red,
      CubeColor.Green
    ]);
    expect(capture.confidence).toBeGreaterThan(0.6);
  });

  it("liefert für nahe Farben kleinere DeltaE2000-Distanzen als für klar getrennte Farben", () => {
    const white = rgbToLab(rgb(239, 231, 216));
    const warmWhite = rgbToLab(rgb(241, 234, 220));
    const orange = rgbToLab(rgb(216, 135, 43));

    expect(deltaE2000(white, warmWhite)).toBeLessThan(deltaE2000(white, orange));
  });
});
