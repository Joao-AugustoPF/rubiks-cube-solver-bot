import { SolveSessionRunner } from "@/components/solve/SolveSessionRunner";
import Link from "next/link";

export default function SolvePage() {
  return (
    <main className="page-shell">
      <h1>Execução Completa da Solução</h1>
      <p>
        Revise o estado inicial, inicie a máquina mock e acompanhe a animação
        até o cubo resolvido.
      </p>
      <p>
        Precisa gerar uma sessão antes?{" "}
        <Link href="/scan" className="inlineLink">
          Scanner
        </Link>{" "}
        ou{" "}
        <Link href="/manual" className="inlineLink">
          montagem manual
        </Link>
        .
      </p>

      <SolveSessionRunner />
    </main>
  );
}
