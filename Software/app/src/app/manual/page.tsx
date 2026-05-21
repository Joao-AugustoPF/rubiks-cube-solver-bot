import { ManualCubeEditor } from "@/components/ManualCubeEditor";
import { FlowStepper } from "@/components/FlowStepper";
import Link from "next/link";

export default function ManualCubePage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="sectionCard">
        <span className="eyebrow">Etapa 2 · Mapear e resolver</span>
        <div className="sectionCardHeader">
          <h1>Monte o cubo e gere a sessão de solução</h1>
          <p>
            Esta é uma das entradas do fluxo. Depois de resolver, o botão final
            leva direto para a execução 3D.
          </p>
        </div>
        <div className="actionRow">
          <Link href="/">Voltar ao início</Link>
          <Link href="/scan">Usar scanner</Link>
        </div>
      </header>

      <FlowStepper activeStep={2} />

      <ManualCubeEditor />
    </main>
  );
}
