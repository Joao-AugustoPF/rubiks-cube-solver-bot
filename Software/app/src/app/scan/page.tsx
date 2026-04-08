import { CubeScannerFlow } from "@/components/scanner/CubeScannerFlow";

export default function ScanPage() {
  return (
    <main className="page-shell">
      <h1>Scanner Guiado por Câmera</h1>
      <p>
        Capture as 6 faces com guia 3x3, revise as cores detectadas e corrija
        manualmente antes de enviar para validação e solve.
      </p>

      <CubeScannerFlow />
    </main>
  );
}
