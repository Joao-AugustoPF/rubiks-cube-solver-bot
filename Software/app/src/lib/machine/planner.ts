import type { LogicalMove, MechanicalPlan } from "@/types";

const FACE_TO_ACTUATOR = {
  U: "up",
  R: "right",
  F: "front",
  D: "down",
  L: "left",
  B: "back",
} as const;

export function buildMechanicalPlan(
  jobId: string,
  logicalMoves: readonly LogicalMove[],
): MechanicalPlan {
  const actions: MechanicalPlan["actions"] = [
    { type: "home", target: "all" },
    { type: "clamp", name: "A", state: "close" },
  ];

  for (const move of logicalMoves) {
    actions.push(convertLogicalMoveToAction(move));
  }

  actions.push({ type: "wait", durationMs: 120 });
  actions.push({ type: "clamp", name: "A", state: "open" });

  return {
    jobId,
    actions,
  };
}

function convertLogicalMoveToAction(move: LogicalMove): MechanicalPlan["actions"][number] {
  const face = move[0] as keyof typeof FACE_TO_ACTUATOR;
  const suffix = move.slice(1);

  const degrees = suffix === "2" ? 180 : suffix === "'" ? -90 : 90;

  return {
    type: "turn_face",
    actuator: FACE_TO_ACTUATOR[face],
    degrees,
  };
}
