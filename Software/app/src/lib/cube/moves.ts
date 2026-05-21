import {
  FACE_ORDER,
  type Color,
  type CubeState,
  type Face,
  type FaceStickers,
  type LogicalMove,
} from "@/types";
import { cloneCubeState } from "./state";
import { assertValidCubeStateStructure } from "./validation";

type Axis = "x" | "y" | "z";
type Vector3 = readonly [number, number, number];

type FaceOrientation = {
  normal: Vector3;
  right: Vector3;
  down: Vector3;
};

type Sticker = {
  color: Color;
  position: Vector3;
  normal: Vector3;
};

const FACE_ORIENTATION: Record<Face, FaceOrientation> = {
  U: {
    normal: [0, 1, 0],
    right: [1, 0, 0],
    down: [0, 0, 1],
  },
  R: {
    normal: [1, 0, 0],
    right: [0, 0, -1],
    down: [0, -1, 0],
  },
  F: {
    normal: [0, 0, 1],
    right: [1, 0, 0],
    down: [0, -1, 0],
  },
  D: {
    normal: [0, -1, 0],
    right: [1, 0, 0],
    down: [0, 0, -1],
  },
  L: {
    normal: [-1, 0, 0],
    right: [0, 0, 1],
    down: [0, -1, 0],
  },
  B: {
    normal: [0, 0, -1],
    right: [-1, 0, 0],
    down: [0, -1, 0],
  },
};

const MOVE_ROTATION: Record<Face, { axis: Axis; quarterTurn: 1 | -1 }> = {
  U: { axis: "y", quarterTurn: -1 },
  R: { axis: "x", quarterTurn: -1 },
  F: { axis: "z", quarterTurn: -1 },
  D: { axis: "y", quarterTurn: 1 },
  L: { axis: "x", quarterTurn: 1 },
  B: { axis: "z", quarterTurn: 1 },
};

const MOVE_PATTERN = /^(U|R|F|D|L|B)(2|')?$/;

export function applyMove(cubeState: CubeState, move: LogicalMove): CubeState {
  assertValidCubeStateStructure(cubeState, "Não foi possível aplicar movimento.");

  const { face, clockwiseTurns } = parseMove(move);
  let nextState = cloneCubeState(cubeState);
  for (let index = 0; index < clockwiseTurns; index += 1) {
    nextState = applyClockwiseQuarterTurn(nextState, face);
  }

  return nextState;
}

export function applyMoves(
  cubeState: CubeState,
  moves: readonly LogicalMove[],
): CubeState {
  return moves.reduce((state, move) => applyMove(state, move), cubeState);
}

function parseMove(move: LogicalMove): { face: Face; clockwiseTurns: number } {
  const match = MOVE_PATTERN.exec(move);
  if (!match) {
    throw new Error(`Movimento lógico inválido: ${move}`);
  }

  const face = match[1] as Face;
  const suffix = match[2] ?? "";

  if (suffix === "2") {
    return { face, clockwiseTurns: 2 };
  }
  if (suffix === "'") {
    return { face, clockwiseTurns: 3 };
  }
  return { face, clockwiseTurns: 1 };
}

function applyClockwiseQuarterTurn(cubeState: CubeState, face: Face): CubeState {
  const stickers = cubeStateToStickers(cubeState);
  const { axis, quarterTurn } = MOVE_ROTATION[face];
  const axisIndex = getAxisIndex(axis);
  const layerValue = FACE_ORIENTATION[face].normal[axisIndex];

  const rotatedStickers = stickers.map((sticker) => {
    if (sticker.position[axisIndex] !== layerValue) {
      return sticker;
    }

    return {
      color: sticker.color,
      position: rotateVector(sticker.position, axis, quarterTurn),
      normal: rotateVector(sticker.normal, axis, quarterTurn),
    } satisfies Sticker;
  });

  return stickersToCubeState(rotatedStickers);
}

function cubeStateToStickers(cubeState: CubeState): Sticker[] {
  const stickers: Sticker[] = [];

  for (const face of FACE_ORDER) {
    const orientation = FACE_ORIENTATION[face];
    for (let index = 0; index < 9; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const color = cubeState[face][index];

      const horizontalOffset = scaleVector(orientation.right, column - 1);
      const verticalOffset = scaleVector(orientation.down, row - 1);
      const position = addVector(
        orientation.normal,
        addVector(horizontalOffset, verticalOffset),
      );

      stickers.push({
        color,
        position,
        normal: orientation.normal,
      });
    }
  }

  return stickers;
}

function stickersToCubeState(stickers: readonly Sticker[]): CubeState {
  const draft: Record<Face, Array<Color | undefined>> = {
    U: Array<Color | undefined>(9).fill(undefined),
    R: Array<Color | undefined>(9).fill(undefined),
    F: Array<Color | undefined>(9).fill(undefined),
    D: Array<Color | undefined>(9).fill(undefined),
    L: Array<Color | undefined>(9).fill(undefined),
    B: Array<Color | undefined>(9).fill(undefined),
  };

  for (const sticker of stickers) {
    const face = faceFromNormal(sticker.normal);
    const orientation = FACE_ORIENTATION[face];
    const delta = subtractVector(sticker.position, orientation.normal);

    const column = dotVector(delta, orientation.right) + 1;
    const row = dotVector(delta, orientation.down) + 1;
    const index = row * 3 + column;

    if (index < 0 || index > 8) {
      throw new Error(`Index fora da face durante reconstrução: ${index}`);
    }

    draft[face][index] = sticker.color;
  }

  const result: Partial<CubeState> = {};
  for (const face of FACE_ORDER) {
    result[face] = toFaceStickers(draft[face], face);
  }

  return result as CubeState;
}

function toFaceStickers(
  stickers: Array<Color | undefined>,
  face: Face,
): FaceStickers {
  if (stickers.length !== 9 || stickers.some((color) => !color)) {
    throw new Error(`Falha ao montar stickers da face ${face}.`);
  }

  return [
    stickers[0],
    stickers[1],
    stickers[2],
    stickers[3],
    stickers[4],
    stickers[5],
    stickers[6],
    stickers[7],
    stickers[8],
  ] as FaceStickers;
}

function faceFromNormal(normal: Vector3): Face {
  for (const face of FACE_ORDER) {
    if (isSameVector(FACE_ORIENTATION[face].normal, normal)) {
      return face;
    }
  }

  throw new Error(`Normal inválida: ${normal.join(",")}`);
}

function getAxisIndex(axis: Axis): number {
  if (axis === "x") {
    return 0;
  }
  if (axis === "y") {
    return 1;
  }
  return 2;
}

function rotateVector(
  vector: Vector3,
  axis: Axis,
  quarterTurn: 1 | -1,
): Vector3 {
  const [x, y, z] = vector;

  if (axis === "x" && quarterTurn === 1) {
    return [x, -z, y];
  }
  if (axis === "x" && quarterTurn === -1) {
    return [x, z, -y];
  }
  if (axis === "y" && quarterTurn === 1) {
    return [z, y, -x];
  }
  if (axis === "y" && quarterTurn === -1) {
    return [-z, y, x];
  }
  if (axis === "z" && quarterTurn === 1) {
    return [-y, x, z];
  }
  return [y, -x, z];
}

function addVector(a: Vector3, b: Vector3): Vector3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractVector(a: Vector3, b: Vector3): Vector3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVector(vector: Vector3, factor: number): Vector3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function dotVector(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function isSameVector(a: Vector3, b: Vector3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
