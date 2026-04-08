# Solver e Representação do Cubo

## Representação

O cubo é representado por `CubeState`:

- 6 faces: `U`, `R`, `F`, `D`, `L`, `B`
- cada face contém 9 stickers (`FaceStickers`)
- cores suportadas: `white`, `red`, `green`, `yellow`, `orange`, `blue`

Tipos em:

- `src/types/cube.ts`

## Validação

Validação estrutural e semântica:

- 6 faces presentes
- 9 stickers por face
- 6 cores válidas
- exatamente 9 stickers por cor
- centros únicos
- rejeita estados incompletos

Implementação:

- `src/lib/cube/validation.ts`
- endpoint: `POST /api/cube/validate`

## Serialização para solver

O estado é serializado na convenção de faces `URFDLB` com mapeamento via centros:

- `src/lib/cube/serializer.ts`

## Solve lógico

O solver usa `cubejs`:

- entrada: `CubeState` validado
- saída: `logicalMoves` (`R`, `U`, `R'`, `F2`, etc.)

Implementação:

- `src/lib/cube/solver.ts`
- endpoint: `POST /api/cube/solve`

Resposta esperada:

```json
{
  "jobId": "cube-001",
  "initialCubeState": { "...": "..." },
  "logicalMoves": ["R", "U", "R'", "U'", "F2"]
}
```
