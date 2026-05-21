# Scanner Guiado por Câmera

## Objetivo

Capturar as 6 faces (`U/R/F/D/L/B`) com fluxo assistido e confiável, sem depender de detecção perfeita.

## Página e componentes

- Página: `src/app/scan/page.tsx`
- Orquestração: `src/components/scanner/CubeScannerFlow.tsx`
- Overlay 3x3: `src/components/scanner/ScannerGuideOverlay.tsx`
- Grade editável: `src/components/scanner/FaceStickerGrid.tsx`
- Câmera: `src/hooks/useCameraStream.ts`
- Leitura de cor: `src/lib/scanner/reader.ts` e `src/lib/scanner/color.ts`

## Fluxo implementado

1. Solicita câmera com `getUserMedia`.
2. Exibe guia 3x3 para alinhamento da face.
3. Captura frame e extrai amostras da grade.
4. Classifica cor dos 9 stickers.
5. Usuário confirma a face.
6. Repete para `U/R/F/D/L/B`.
7. Abre revisão final das 6 faces com edição manual sticker a sticker.
8. Envia para validação/solve.

## Confiabilidade e UX

- Captura guiada por etapa.
- Confiança média da leitura por face.
- Correção manual obrigatoriamente disponível.
- Mensagens de permissão/erro de câmera.
- Botões claros para recaptura, validação e solve.

## Resultado do scanner

Após revisão, gera `CubeState` válido para:

- `POST /api/cube/validate`
- `POST /api/cube/solve`

Se solve for bem sucedido, cria `SolveSession` e redireciona para `/solve`.
