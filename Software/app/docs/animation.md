# Animação da Solução

## Objetivo

Mostrar a execução visual dos `logicalMoves` a partir do `initialCubeState`,
preferindo o progresso reportado pela máquina quando disponível.

## Componentes principais

- Página: `src/app/solve/page.tsx`
- Runner da sessão: `src/components/solve/SolveSessionRunner.tsx`
- Player: `src/components/solve/SolveAnimationPlayer.tsx`
- Hook: `src/hooks/useSolveAnimation.ts`
- Viewer 2D: `src/components/cube/CubeNetViewer.tsx`

## Como a animação é disparada

1. Usuário abre `/solve` com uma `SolveSession` já criada.
2. Aba tenta assumir operação em `POST /api/machine/session`.
3. Operador clica em **Iniciar execução**.
4. Front chama `POST /api/machine/start`.
5. Front consulta `GET /api/machine/status`.
6. Se a resposta traz `progress.currentLogicalMoveIndex`, esse índice controla o cubo.
7. Sem progresso contínuo, quando status vira `started`, o player chama `play()` automaticamente.

Regra importante:

- com telemetria, a visualização é sincronizada pela máquina;
- sem telemetria, a animação local continua disponível como fallback.

## Controles da animação

- `Play`
- `Pause`
- `Reset`
- controle de velocidade (`stepIntervalMs` em ms)

Quando a máquina controla o progresso, os controles manuais ficam bloqueados para
evitar que a web saia de sincronia com o robô físico.

## Estado exibido na UI

- preview do cubo inicial
- estado atual animado
- movimento atual
- progresso (`moveIndex / totalMoves`)
- lista de movimentos com destaque do atual
- mensagem de sucesso/erro no estado final
