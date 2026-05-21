export const FACE_ORDER = ["U", "R", "F", "D", "L", "B"] as const;
export type Face = (typeof FACE_ORDER)[number];

export const COLOR_ORDER = [
  "white",
  "red",
  "green",
  "yellow",
  "orange",
  "blue",
] as const;
export type Color = (typeof COLOR_ORDER)[number];

export type FaceStickers = [
  Color,
  Color,
  Color,
  Color,
  Color,
  Color,
  Color,
  Color,
  Color,
];

export type CubeState = Record<Face, FaceStickers>;

export type MoveSuffix = "" | "'" | "2";
export type LogicalMove = `${Face}${MoveSuffix}`;

export const SOLVED_COLOR_BY_FACE: Record<Face, Color> = {
  U: "white",
  R: "red",
  F: "green",
  D: "yellow",
  L: "orange",
  B: "blue",
};
