import { CubeScannerFlow } from "@/components/scanner/CubeScannerFlow";
import Link from "next/link";

export default function ScanPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-intro">
        <span className="eyebrow">Fluxo 1 · Scanner</span>
        <div className="heroGrid">
          <div>
            <h1>Use a câmera sem adivinhar o próximo passo.</h1>
            <p className="leadText">
              Esta tela foi organizada para funcionar como um roteiro: capturar,
              conferir, corrigir e resolver. A ideia é que qualquer pessoa entenda
              o que precisa fazer ao olhar a primeira dobra da página.
            </p>
            <div className="actionRow">
              <Link href="/manual">Ir para o modo manual</Link>
              <Link href="/solve">Ver execução atual</Link>
            </div>
          </div>

          <aside className="heroAside">
            <h3>Como usar</h3>
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
                  <strong>Revisar e resolver</strong>
                  <p>No final, corrija qualquer sticker e envie para validação.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <section className="sectionCard">
        <div className="infoGrid">
          <article className="infoCard">
            <span className="tag">melhor uso</span>
            <h3>Quando usar esta página</h3>
            <p>
              Quando você quer demonstrar o fluxo real do produto, com captura das
              6 faces e revisão antes da solução.
            </p>
          </article>
          <article className="infoCard">
            <span className="tag">fallback</span>
            <h3>Se a leitura falhar</h3>
            <p>
              Corrija a face na pré-visualização ou troque para o fluxo manual se
              quiser montar um estado específico.
            </p>
          </article>
          <article className="infoCard">
            <span className="tag">saída</span>
            <h3>O que sai daqui</h3>
            <p>
              Uma sessão completa com o cubo validado, movimentos lógicos e o plano
              mecânico salvo para a tela de execução.
            </p>
          </article>
        </div>
      </section>

      <CubeScannerFlow />
    </main>
  );
}
