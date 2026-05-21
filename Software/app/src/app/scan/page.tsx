import { CubeScannerFlow } from "@/components/scanner/CubeScannerFlow";
import { FlowStepper } from "@/components/FlowStepper";
import Link from "next/link";

export default function ScanPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-intro">
        <span className="eyebrow">Etapa 2 · Mapear e resolver</span>
        <div className="heroGrid">
          <div>
            <h1>Escaneie as 6 faces e envie para a execução 3D.</h1>
            <p className="leadText">
              Siga a ordem das faces, revise a leitura e clique em validar e
              resolver. Quando a sessão estiver pronta, o app leva você para a
              etapa final automaticamente.
            </p>
            <div className="actionRow">
              <Link href="/">Voltar ao início</Link>
              <Link href="/manual">Trocar para manual</Link>
            </div>
          </div>

          <aside className="heroAside">
            <h3>Nesta etapa</h3>
            <div className="miniSteps">
              <div className="miniStep">
                <span className="miniStepNumber">1</span>
                <div>
                  <strong>Liberar a câmera</strong>
                  <p>Abra a câmera e alinhe a face dentro da grade 3x3.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">2</span>
                <div>
                  <strong>Ler e confirmar</strong>
                  <p>Capture a face, revise a leitura e confirme antes de avançar.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">3</span>
                <div>
                  <strong>Resolver e avançar</strong>
                  <p>No final, o app cria a sessão e abre a execução 3D.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <FlowStepper activeStep={2} />

      <CubeScannerFlow />
    </main>
  );
}
