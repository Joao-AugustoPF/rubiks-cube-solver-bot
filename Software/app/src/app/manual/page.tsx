import { ManualCubeEditor } from "@/components/ManualCubeEditor";

export default function ManualCubePage() {
  return (
    <main className="page-shell">
      <h1>Montagem Manual do Cubo 3x3</h1>
      <p>
        Preencha os stickers manualmente, valide o estado e obtenha a sequência
        lógica de solução pelo solver.
      </p>

      <ManualCubeEditor />
    </main>
  );
}
