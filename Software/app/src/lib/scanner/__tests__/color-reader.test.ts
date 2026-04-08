import { describe, expect, it } from "vitest";
import {
  classifyCubeColor,
  computeGuideRect,
  detectCubeGuideRect,
  isDetectedGuideReliable,
  readFaceFromImageData,
} from "@/lib/scanner";
import { projectGuideRectToViewport } from "@/lib/scanner/guide-projection";

describe("scanner color and reader", () => {
  it("classifica cores básicas do cubo", () => {
    expect(classifyCubeColor({ r: 245, g: 245, b: 245 }).color).toBe("white");
    expect(classifyCubeColor({ r: 112, g: 108, b: 103 }).color).toBe("white");
    expect(classifyCubeColor({ r: 220, g: 40, b: 35 }).color).toBe("red");
    expect(classifyCubeColor({ r: 240, g: 150, b: 30 }).color).toBe("orange");
    expect(classifyCubeColor({ r: 242, g: 210, b: 20 }).color).toBe("yellow");
    expect(classifyCubeColor({ r: 45, g: 175, b: 70 }).color).toBe("green");
    expect(classifyCubeColor({ r: 45, g: 90, b: 215 }).color).toBe("blue");
  });

  it("calcula guia centralizada no frame", () => {
    const rect = computeGuideRect(1280, 720, 0.6);

    expect(rect.size).toBe(Math.floor(720 * 0.6));
    expect(rect.x).toBe(Math.floor((1280 - rect.size) / 2));
    expect(rect.y).toBe(Math.floor((720 - rect.size) / 2));
  });

  it("lê face 3x3 de frame sintético", () => {
    const width = 300;
    const height = 300;
    const data = new Uint8ClampedArray(width * height * 4);

    fillRect(data, width, 0, 0, width, height, [0, 0, 0]);
    const guide = computeGuideRect(width, height, 0.6);
    const cell = Math.floor(guide.size / 3);
    const colors: Array<[number, number, number]> = [
      [245, 245, 245],
      [220, 40, 35],
      [45, 175, 70],
      [242, 210, 20],
      [240, 150, 30],
      [45, 90, 215],
      [220, 40, 35],
      [45, 175, 70],
      [245, 245, 245],
    ];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const [r, g, b] = colors[row * 3 + col];
        fillRect(
          data,
          width,
          guide.x + col * cell,
          guide.y + row * cell,
          cell,
          cell,
          [r, g, b],
        );
      }
    }

    const result = readFaceFromImageData({
      width,
      height,
      data,
    } as ImageData, { detectCube: false });

    expect(result.stickers).toEqual([
      "white",
      "red",
      "green",
      "yellow",
      "orange",
      "blue",
      "red",
      "green",
      "white",
    ]);
    expect(result.samples).toHaveLength(9);
    expect(result.averageConfidence).toBeGreaterThan(0.35);
    expect(result.guideSource).toBe("fixed");
  });

  it("detecta uma face fora do centro e ajusta a guia automaticamente", () => {
    const width = 480;
    const height = 320;
    const data = new Uint8ClampedArray(width * height * 4);
    fillRect(data, width, 0, 0, width, height, [18, 21, 29]);

    const guide = {
      x: 210,
      y: 74,
      size: 132,
    };
    const cell = Math.floor(guide.size / 3);
    const colors: Array<[number, number, number]> = [
      [245, 245, 245],
      [220, 40, 35],
      [45, 175, 70],
      [242, 210, 20],
      [240, 150, 30],
      [45, 90, 215],
      [220, 40, 35],
      [45, 175, 70],
      [245, 245, 245],
    ];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const [r, g, b] = colors[row * 3 + col];
        fillRect(
          data,
          width,
          guide.x + col * cell,
          guide.y + row * cell,
          cell - 2,
          cell - 2,
          [r, g, b],
        );
      }
    }

    const imageData = { width, height, data } as ImageData;
    const detected = detectCubeGuideRect(imageData);
    const result = readFaceFromImageData(imageData);

    expect(detected).not.toBeNull();
    expect(detected?.guideRect.x).toBeGreaterThan(170);
    expect(detected?.guideRect.x).toBeLessThan(250);
    expect(detected?.guideRect.y).toBeGreaterThan(50);
    expect(detected?.guideRect.y).toBeLessThan(120);
    expect(detected?.guideRect.size).toBeGreaterThan(100);
    expect(detected?.confidence).toBeGreaterThan(0.34);

    expect(result.guideSource).toBe("detected");
    expect(result.guideConfidence).toBeGreaterThan(0.34);
    expect(result.stickers).toEqual([
      "white",
      "red",
      "green",
      "yellow",
      "orange",
      "blue",
      "red",
      "green",
      "white",
    ]);
  });

  it("rejeita uma guia detectada que salta demais do centro", () => {
    const fallbackGuide = computeGuideRect(480, 320, 0.62);

    expect(
      isDetectedGuideReliable(
        {
          x: 330,
          y: 48,
          size: 108,
        },
        0.62,
        fallbackGuide,
      ),
    ).toBe(false);
  });

  it("projeta a guia para o viewport respeitando object-fit cover", () => {
    const projected = projectGuideRectToViewport(
      {
        x: 180,
        y: 140,
        size: 120,
      },
      640,
      480,
      320,
      180,
    );

    expect(projected.left).toBeGreaterThan(60);
    expect(projected.left).toBeLessThan(120);
    expect(projected.top).toBeGreaterThan(30);
    expect(projected.top).toBeLessThan(70);
    expect(projected.width).toBeCloseTo(60, 0);
    expect(projected.height).toBeCloseTo(60, 0);
  });

  it("mantém a cor do centro mesmo com logo no sticker central", () => {
    const width = 300;
    const height = 300;
    const data = new Uint8ClampedArray(width * height * 4);

    fillRect(data, width, 0, 0, width, height, [16, 18, 24]);
    const guide = computeGuideRect(width, height, 0.6);
    const cell = Math.floor(guide.size / 3);

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        fillRect(
          data,
          width,
          guide.x + col * cell,
          guide.y + row * cell,
          cell - 2,
          cell - 2,
          [212, 208, 204],
        );
      }
    }

    fillRect(
      data,
      width,
      guide.x + cell + Math.floor(cell * 0.28),
      guide.y + cell + Math.floor(cell * 0.28),
      Math.floor(cell * 0.38),
      Math.floor(cell * 0.38),
      [36, 104, 220],
    );

    const result = readFaceFromImageData({
      width,
      height,
      data,
    } as ImageData, { detectCube: false });

    expect(result.stickers[4]).toBe("white");
    expect(result.samples[4].confidence).toBeGreaterThan(0.55);
  });
});

function fillRect(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  color: [number, number, number],
): void {
  const [r, g, b] = color;
  for (let row = y; row < y + rectHeight; row += 1) {
    for (let col = x; col < x + rectWidth; col += 1) {
      const pixel = (row * width + col) * 4;
      data[pixel] = r;
      data[pixel + 1] = g;
      data[pixel + 2] = b;
      data[pixel + 3] = 255;
    }
  }
}
