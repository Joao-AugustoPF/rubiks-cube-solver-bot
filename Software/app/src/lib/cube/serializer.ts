import { FACE_ORDER, type Color, type CubeState, type Face } from "@/types";
import { assertValidCubeStateStructure } from "./validation";

export function serializeCubeForSolver(cubeState: CubeState): string {
  assertValidCubeStateStructure(cubeState);

  const centerColorToFace = buildCenterColorToFaceMap(cubeState);
  return FACE_ORDER.flatMap((face) => cubeState[face])
    .map((color) => {
      const mappedFace = centerColorToFace.get(color);
      if (!mappedFace) {
        throw new Error(`Cor sem mapeamento para solver: ${color}`);
      }
      return mappedFace;
    })
    .join("");
}

function buildCenterColorToFaceMap(cubeState: CubeState): Map<Color, Face> {
  const centerMap = new Map<Color, Face>();

  for (const face of FACE_ORDER) {
    const centerColor = cubeState[face][4];
    if (centerMap.has(centerColor)) {
      throw new Error(
        `Centros duplicados detectados para a cor ${centerColor}. Estado inválido para solver.`,
      );
    }
    centerMap.set(centerColor, face);
  }

  return centerMap;
}
