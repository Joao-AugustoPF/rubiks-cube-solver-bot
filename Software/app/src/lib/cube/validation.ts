import {
  COLOR_ORDER,
  FACE_ORDER,
  type Color,
  type CubeState,
  type Face,
} from "@/types";

const FACE_SET = new Set(FACE_ORDER);
const COLOR_SET = new Set(COLOR_ORDER);

export interface CubeValidationResult {
  isValid: boolean;
  errors: string[];
}

export function isFace(value: unknown): value is Face {
  return typeof value === "string" && FACE_SET.has(value as Face);
}

export function isColor(value: unknown): value is Color {
  return typeof value === "string" && COLOR_SET.has(value as Color);
}

export function getCubeStateStructureErrors(value: unknown): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return ["CubeState deve ser um objeto."];
  }

  const candidate = value as Record<string, unknown>;
  const errors: string[] = [];

  for (const face of FACE_ORDER) {
    const stickers = candidate[face];
    if (!Array.isArray(stickers)) {
      errors.push(`Face ${face} deve ser um array.`);
      continue;
    }

    if (stickers.length !== 9) {
      errors.push(`Face ${face} deve conter 9 stickers.`);
      continue;
    }

    stickers.forEach((sticker, index) => {
      if (sticker === null || sticker === undefined || sticker === "") {
        errors.push(
          `Estado incompleto: face ${face}, posição ${index} sem cor definida.`,
        );
        return;
      }
      if (!isColor(sticker)) {
        errors.push(`Face ${face}, posição ${index} possui cor inválida.`);
      }
    });
  }

  return errors;
}

export function isValidCubeStateStructure(value: unknown): value is CubeState {
  return getCubeStateStructureErrors(value).length === 0;
}

export function getCubeStateSemanticErrors(cubeState: CubeState): string[] {
  const errors: string[] = [];

  const colorCount = COLOR_ORDER.reduce(
    (accumulator, color) => {
      accumulator[color] = 0;
      return accumulator;
    },
    {} as Record<Color, number>,
  );

  for (const face of FACE_ORDER) {
    for (const sticker of cubeState[face]) {
      colorCount[sticker] += 1;
    }
  }

  const usedColors = COLOR_ORDER.filter((color) => colorCount[color] > 0);
  if (usedColors.length !== COLOR_ORDER.length) {
    errors.push("O cubo deve usar exatamente 6 cores.");
  }

  for (const color of COLOR_ORDER) {
    const count = colorCount[color];
    if (count !== 9) {
      errors.push(
        `A cor ${color} deve aparecer exatamente 9 vezes (atual: ${count}).`,
      );
    }
  }

  const centers = FACE_ORDER.map((face) => cubeState[face][4]);
  const uniqueCenters = new Set(centers);
  if (uniqueCenters.size !== FACE_ORDER.length) {
    errors.push("Os centros das 6 faces devem ser obrigatórios e únicos.");
  }

  return errors;
}

export function validateCubeState(value: unknown): CubeValidationResult {
  const structureErrors = getCubeStateStructureErrors(value);
  if (structureErrors.length > 0) {
    return {
      isValid: false,
      errors: structureErrors,
    };
  }

  const semanticErrors = getCubeStateSemanticErrors(value as CubeState);
  return {
    isValid: semanticErrors.length === 0,
    errors: semanticErrors,
  };
}

export function isValidCubeState(value: unknown): value is CubeState {
  return validateCubeState(value).isValid;
}

export function assertValidCubeStateStructure(
  value: unknown,
  contextMessage = "CubeState inválido.",
): asserts value is CubeState {
  const errors = getCubeStateStructureErrors(value);
  if (errors.length === 0) {
    return;
  }

  throw new Error(`${contextMessage} ${errors.join(" ")}`);
}

export function assertValidCubeState(
  value: unknown,
  contextMessage = "CubeState inválido.",
): asserts value is CubeState {
  const { errors, isValid } = validateCubeState(value);
  if (isValid) {
    return;
  }

  throw new Error(`${contextMessage} ${errors.join(" ")}`);
}
