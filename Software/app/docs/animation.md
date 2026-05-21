# Animação da Solução

## Objetivo

Mostrar a execução visual dos `logicalMoves` a partir do `initialCubeState`.

## Componentes principais

- Página: `src/app/solve/page.tsx`
- Runner da sessão: `src/components/solve/SolveSessionRunner.tsx`
- Player: `src/components/solve/SolveAnimationPlayer.tsx`
- Hook: `src/hooks/useSolveAnimation.ts`
- Viewer 2D: `src/components/cube/CubeNetViewer.tsx`

## Como a animação é disparada

1. Usuário abre `/solve` com uma `SolveSession` já criada.
2. Usuário clica em **Iniciar execução** (mock).
3. Front chama `POST /api/machine/start`.
4. Front consulta `GET /api/machine/status`.
5. Quando status vira `started`, o player chama `play()` automaticamente.

Regra importante:

- a animação não depende de feedback contínuo da máquina;
- o único gatilho externo é a transição para `started`.

## Controles da animação

- `Play`
- `Pause`
- `Reset`
- controle de velocidade (`stepIntervalMs` em ms)

## Estado exibido na UI

- preview do cubo inicial
- estado atual animado
- movimento atual
- progresso (`moveIndex / totalMoves`)
- lista de movimentos com destaque do atual
- mensagem de sucesso/erro no estado final
