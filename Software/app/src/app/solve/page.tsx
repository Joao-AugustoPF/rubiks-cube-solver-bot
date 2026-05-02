import { SolveSessionRunner } from "@/components/solve/SolveSessionRunner";
import { FlowStepper } from "@/components/FlowStepper";
import Link from "next/link";

export default function SolvePage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-intro">
        <span className="eyebrow">Etapa 3 · Execução 3D</span>
        <div className="heroGrid">
          <div>
            <h1>Assista o cubo resolvendo movimento por movimento.</h1>
            <p className="leadText">
              Esta tela é o destino final do fluxo. Ela carrega a última sessão
              gerada pelo scanner ou pelo editor manual, inicia o mock da máquina
              e mostra a solução em 3D.
            </p>
            <div className="actionRow">
              <Link href="/scan">Criar pelo scanner</Link>
              <Link href="/manual">Criar manualmente</Link>
            </div>
          </div>

          <aside className="heroAside">
            <h3>Nesta etapa</h3>
            <div className="miniSteps">
              <div className="miniStep">
                <span className="miniStepNumber">1</span>
                <div>
                  <strong>Conferir sessão</strong>
                  <p>O `jobId` e os movimentos vêm da etapa anterior.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">2</span>
                <div>
                  <strong>Iniciar execução</strong>
                  <p>O botão dispara o mock e libera a animação.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">3</span>
                <div>
                  <strong>Assistir em 3D</strong>
                  <p>Cada camada gira até o cubo chegar resolvido.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <FlowStepper activeStep={3} />

      <SolveSessionRunner />
    </main>
  );
}
