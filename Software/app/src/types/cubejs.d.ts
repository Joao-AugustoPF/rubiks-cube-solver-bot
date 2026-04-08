declare module "cubejs" {
  export default class Cube {
    static initSolver(): void;
    static fromString(state: string): Cube;
    solve(): string;
  }
}
