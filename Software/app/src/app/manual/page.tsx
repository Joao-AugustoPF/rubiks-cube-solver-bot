import { ManualCubeEditor } from "@/components/ManualCubeEditor";
import Link from "next/link";

export default function ManualCubePage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-intro">
        <span className="eyebrow">Fluxo 2 · Edição manual</span>
        <div className="heroGrid">
          <div>
            <h1>Monte, valide e resolva estados específicos com controle total.</h1>
            <p className="leadText">
              Esta página serve para testes dirigidos. Em vez de depender da
              câmera, você pinta os stickers manualmente, acompanha a contagem por
              cor e só envia quando o cubo estiver consistente.
            </p>
            <div className="actionRow">
              <Link href="/scan">Voltar para o scanner</Link>
              <Link href="/solve">Abrir execução</Link>
            </div>
          </div>

          <aside className="heroAside">
            <h3>Sequência recomendada</h3>
            <div className="miniSteps">
              <div className="miniStep">
                <span className="miniStepNumber">1</span>
                <div>
                  <strong>Escolha uma cor</strong>
                  <p>Use a paleta para definir a cor ativa antes de pintar a grade.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">2</span>
                <div>
                  <strong>Pinte e revise</strong>
                  <p>Preencha os 54 stickers e acompanhe a contagem por cor ao lado.</p>
                </div>
              </div>
              <div className="miniStep">
                <span className="miniStepNumber">3</span>
                <div>
                  <strong>Valide e resolva</strong>
                  <p>Confirme a consistência do cubo e gere a sessão para a tela de execução.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <section className="sectionCard">
        <div className="infoGrid">
          <article className="infoCard">
            <span className="tag">ideal para</span>
            <h3>Testar casos pontuais</h3>
            <p>Estados embaralhados específicos, cenários de demo e verificação sem câmera.</p>
          </article>
          <article className="infoCard">
            <span className="tag">atenção</span>
            <h3>Erros comuns</h3>
            <p>Contagem errada de cores, centros incoerentes e faces incompletas antes do solve.</p>
          </article>
          <article className="infoCard">
            <span className="tag">resultado</span>
            <h3>O que você recebe</h3>
            <p>Resposta da API com movimentos lógicos e sessão persistida para animação.</p>
          </article>
        </div>
      </section>

      <ManualCubeEditor />
    </main>
  );
}
