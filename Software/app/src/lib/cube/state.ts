import {
  FACE_ORDER,
  SOLVED_COLOR_BY_FACE,
  type Color,
  type CubeState,
  type FaceStickers,
} from "@/types";
import { assertValidCubeStateStructure } from "./validation";

function createFaceStickers(color: Color): FaceStickers {
  return [color, color, color, color, color, color, color, color, color];
}

export function createSolvedCube(): CubeState {
  return {
    U: createFaceStickers(SOLVED_COLOR_BY_FACE.U),
    R: createFaceStickers(SOLVED_COLOR_BY_FACE.R),
    F: createFaceStickers(SOLVED_COLOR_BY_FACE.F),
    D: createFaceStickers(SOLVED_COLOR_BY_FACE.D),
    L: createFaceStickers(SOLVED_COLOR_BY_FACE.L),
    B: createFaceStickers(SOLVED_COLOR_BY_FACE.B),
  };
}

export function cloneCubeState(cubeState: CubeState): CubeState {
  assertValidCubeStateStructure(cubeState);

  const clone = {} as CubeState;
  for (const face of FACE_ORDER) {
    clone[face] = [...cubeState[face]] as FaceStickers;
  }

  return clone;
}
