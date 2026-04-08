import { describe, expect, it } from "vitest";
import { buildMechanicalPlan } from "@/lib/machine";

describe("machine planner", () => {
  it("gera plano serializável com ações de setup e teardown", () => {
    const plan = buildMechanicalPlan("cube-001", ["R", "U", "R'", "U'", "F2"]);

    expect(plan.jobId).toBe("cube-001");
    expect(plan.actions[0]).toEqual({ type: "home", target: "all" });
    expect(plan.actions[1]).toEqual({
      type: "clamp",
      name: "A",
      state: "close",
    });
    expect(plan.actions.at(-2)).toEqual({ type: "wait", durationMs: 120 });
    expect(plan.actions.at(-1)).toEqual({
      type: "clamp",
      name: "A",
      state: "open",
    });
  });

  it("converte logicalMoves para turn_face com graus corretos", () => {
    const plan = buildMechanicalPlan("cube-002", ["U", "R2", "F'"]);
    const turnActions = plan.actions.filter((action) => action.type === "turn_face");

    expect(turnActions).toEqual([
      { type: "turn_face", actuator: "up", degrees: 90 },
      { type: "turn_face", actuator: "right", degrees: 180 },
      { type: "turn_face", actuator: "front", degrees: -90 },
    ]);
  });
});
