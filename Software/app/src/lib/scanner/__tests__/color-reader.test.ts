import { describe, expect, it } from "vitest";
import { classifyCubeColor, computeGuideRect, readFaceFromImageData } from "@/lib/scanner";

describe("scanner color and reader", () => {
  it("classifica cores básicas do cubo", () => {
    expect(classifyCubeColor({ r: 245, g: 245, b: 245 }).color).toBe("white");
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
    } as ImageData);

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
