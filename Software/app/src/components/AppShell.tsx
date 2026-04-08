import Link from "next/link";
import {
  FACE_CONVENTION_DESCRIPTION,
  FACE_ROTATION_RULE,
} from "@/lib/cube/convention";

const PHASE_STATUS = [
  { item: "Scanner por câmera", status: "Implementado em fluxo guiado + revisão" },
  { item: "Solver lógico", status: "Implementado via API de solve manual" },
  { item: "Viewer de cubo (2D)", status: "Implementado com player de animação" },
  { item: "Planejamento mecânico", status: "Implementado (abstrato e serializável)" },
  { item: "Máquina mock", status: "Implementado com status queued/started/finished/error" },
  { item: "Viewer 3D", status: "Não implementado nesta etapa" },
  { item: "Integração real com ESP32", status: "Não implementado nesta etapa" },
] as const;

export function AppShell() {
  return (
    <main className="page-shell">
      <h1>Rubik&apos;s Cube Resolver Bot</h1>
      <p>
        Fundação inicial com App Router + TypeScript, domínio do cubo separado
        da UI e contratos de máquina prontos para integração futura com ESP32.
      </p>

      <section>
        <h2>Convenção de Faces</h2>
        <ul>
          {Object.entries(FACE_CONVENTION_DESCRIPTION).map(([face, label]) => (
            <li key={face}>
              <strong>{face}</strong>: {label}
            </li>
          ))}
        </ul>
        <p>{FACE_ROTATION_RULE}</p>
      </section>

      <section>
        <h2>Fluxos</h2>
        <p>
          O produto já suporta scanner guiado, montagem manual, solve lógico e
          execução completa com máquina mock:
        </p>
        <p>
          <Link href="/scan" className="inlineLink">
            Abrir scanner por câmera
          </Link>
        </p>
        <p>
          <Link href="/manual" className="inlineLink">
            Abrir montagem manual do cubo
          </Link>
        </p>
        <p>
          <Link href="/solve" className="inlineLink">
            Abrir execução/animação da solução
          </Link>
        </p>
        <p>
          <Link href="/architecture" className="inlineLink">
            Abrir apresentação técnica da arquitetura
          </Link>
        </p>
        <p>
          <Link href="/esp32-architecture" className="inlineLink">
            Abrir apresentação técnica do firmware ESP32
          </Link>
        </p>
      </section>

      <section>
        <h2>Status do Escopo Atual</h2>
        <ul>
          {PHASE_STATUS.map(({ item, status }) => (
            <li key={item}>
              <strong>{item}</strong>: {status}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
