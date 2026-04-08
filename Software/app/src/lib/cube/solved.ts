import { FACE_ORDER, type CubeState } from "@/types";
import { assertValidCubeStateStructure } from "./validation";

export function isSolvedCube(cubeState: CubeState): boolean {
  assertValidCubeStateStructure(cubeState);

  for (const face of FACE_ORDER) {
    const centerColor = cubeState[face][4];
    if (!cubeState[face].every((color) => color === centerColor)) {
      return false;
    }
  }

  return true;
}
