import { describe, expect, it } from "vitest";
import { getFaceGuidePose } from "@/lib/scanner/face-guide";

describe("scanner face guide", () => {
  it("vira o cubo para a face correta", () => {
    expect(getFaceGuidePose("F")).toEqual({ rotateX: 0, rotateY: 0 });
    expect(getFaceGuidePose("U")).toEqual({ rotateX: -90, rotateY: 0 });
    expect(getFaceGuidePose("R")).toEqual({ rotateX: 0, rotateY: -90 });
    expect(getFaceGuidePose("D")).toEqual({ rotateX: 90, rotateY: 0 });
    expect(getFaceGuidePose("L")).toEqual({ rotateX: 0, rotateY: 90 });
    expect(getFaceGuidePose("B")).toEqual({ rotateX: 0, rotateY: 180 });
  });
});
