import type { Face } from "@/types";

export const FACE_CONVENTION_DESCRIPTION: Record<Face, string> = {
  U: "Up (topo)",
  R: "Right (direita)",
  F: "Front (frente)",
  D: "Down (base)",
  L: "Left (esquerda)",
  B: "Back (trás)",
};

export const FACE_ROTATION_RULE =
  "Movimentos são definidos como sentido horário ao olhar diretamente para a face em rotação.";
