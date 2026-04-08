import type { Face } from "@/types";

export interface FaceGuidePose {
  rotateX: number;
  rotateY: number;
}

export const FACE_GUIDE_NAME: Record<Face, string> = {
  U: "topo",
  R: "direita",
  F: "frente",
  D: "base",
  L: "esquerda",
  B: "traseira",
};

export function getFaceGuidePose(face: Face): FaceGuidePose {
  switch (face) {
    case "U":
      return { rotateX: -90, rotateY: 0 };
    case "R":
      return { rotateX: 0, rotateY: -90 };
    case "F":
      return { rotateX: 0, rotateY: 0 };
    case "D":
      return { rotateX: 90, rotateY: 0 };
    case "L":
      return { rotateX: 0, rotateY: 90 };
    case "B":
      return { rotateX: 0, rotateY: 180 };
  }
}
