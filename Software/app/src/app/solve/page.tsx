import { SolveSessionRunner } from "@/components/solve/SolveSessionRunner";
import Link from "next/link";

export default function SolvePage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-intro">
        <span className="eyebrow">Fluxo 3 · Execução</span>
        <div className="heroGrid">
          <div>
            <h1>Veja a sessão inteira: máquina mock, plano e animação no mesmo lugar.</h1>
            <p className="leadText">
              Esta é a tela de demonstração do produto. Aqui fica claro de onde a
              sessão veio, quando a máquina começa e quando a animação pode ser
              disparada.
            </p>
            <div className="actionRow">
              <Link href="/scan">Gerar sessão pelo scanner</Link>
              <Link href="/manual">Gerar sessão manual</Link>
            </div>
          </div>

          <aside className="heroAside">
            <h3>O que observar aqui</h3>
            <div className="miniSteps">
              <div className="miniStep">
                <span className="miniStepNumber">1</span>
                <div>
                  <strong>Sessão carregada</strong>
                  <p>O `jobId` e o plano mecânico resumem o que vai ser executado.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">2</span>
                <div>
                  <strong>Status da máquina</strong>
                  <p>A animação só inicia quando o mock devolver o estado `started`.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">3</span>
                <div>
                  <strong>Resolução visual</strong>
                  <p>O player mostra estado inicial, estado atual e sequência aplicada.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <section className="sectionCard">
        <div className="infoGrid">
          <article className="infoCard">
            <span className="tag">entrada</span>
            <h3>De onde a sessão vem</h3>
            <p>Do scanner ou do editor manual. A persistência temporária salva o contexto de execução.</p>
          </article>
          <article className="infoCard">
            <span className="tag">gatilho</span>
            <h3>Quando a animação começa</h3>
            <p>Quando a API da máquina mock responde com o status `started` para o job atual.</p>
          </article>
          <article className="infoCard">
            <span className="tag">próxima etapa</span>
            <h3>O que muda com o ESP32 real</h3>
            <p>Troca-se apenas a camada de execução da máquina; o frontend e o contrato continuam os mesmos.</p>
          </article>
        </div>
      </section>

      <SolveSessionRunner />
    </main>
  );
}
