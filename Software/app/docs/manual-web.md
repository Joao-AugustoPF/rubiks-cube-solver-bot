# Manual de Funcionamento da Web

Este manual explica como instalar, configurar, operar e diagnosticar a aplicação web do **Rubik's Cube Resolver Bot**.

A web é um app **Next.js App Router + TypeScript** que reúne frontend e backend no mesmo projeto. Ela permite mapear o cubo pela câmera ou pelo editor manual, validar o estado, calcular a solução lógica, criar uma sessão de execução e acompanhar o progresso da máquina/ESP32.

## 1. Visão geral do fluxo

O uso normal segue três etapas:

1. **Escolher entrada** em `/`.
2. **Mapear e resolver** em `/scan` ou `/manual`.
3. **Executar e acompanhar** em `/solve`.

Fluxo completo:

```text
Usuário
  └─► / ou /scan ou /manual
        └─► CubeState
              └─► POST /api/cube/validate
                    └─► POST /api/cube/solve
                          └─► SolveSession + mechanicalPlan
                                └─► /solve
                                      └─► POST /api/machine/session
                                      └─► POST /api/machine/start
                                            └─► ESP32 ou mock executa
                                                  └─► GET /api/machine/status
```

## 2. Requisitos

### Para desenvolvimento local

- Node.js compatível com o projeto.
- npm.
- Navegador moderno.
- Para usar câmera: `localhost` ou HTTPS. Em celular, a câmera do navegador exige HTTPS.

### Para produção com ESP32

- Deploy público da web, por exemplo `https://cubo.joaoaugustopf.com`.
- `DEVICE_SECRET` igual no backend Next.js e no firmware ESP32.
- `MACHINE_GATEWAY=polling`, que é o modo recomendado quando o ESP32 está em rede privada.
- ESP32 provisionado e fazendo polling nos endpoints públicos.

## 3. Instalação e execução

A aplicação web fica em:

```bash
Software/app
```

Comandos principais:

```bash
cd Software/app
npm install
npm run dev
```

Para testar a câmera em outro dispositivo da rede, use HTTPS experimental:

```bash
npm run dev:mobile
```

Build e execução em produção:

```bash
npm run build
npm run start
```

Testes:

```bash
npm run test
npm run test:watch
```

## 4. Variáveis de ambiente

Crie um `.env.local` em `Software/app` quando estiver rodando localmente. Não versionar segredos reais.

### Desenvolvimento sem hardware

Use este modo para testar a web e o fluxo de execução sem ESP32 físico:

```env
DEVICE_SECRET=troque-este-segredo
MACHINE_GATEWAY=mock
```

### Produção com ESP32 via polling

Use este modo quando o ESP32 estiver atrás de NAT, Wi-Fi doméstico, rede de faculdade ou qualquer rede privada:

```env
DEVICE_SECRET=troque-este-segredo
MACHINE_GATEWAY=polling
MACHINE_OPERATOR_LEASE_SECONDS=1800
```

Nesse modo, a web pública não chama o IP privado do ESP32. O ESP32 é quem chama a web para buscar jobs e reportar progresso.

### Bancada local com chamada direta ao ESP32

Use apenas quando o Next.js e o ESP32 estiverem na mesma rede:

```env
DEVICE_SECRET=troque-este-segredo
MACHINE_GATEWAY=direct
DEVICE_IP_OVERRIDE=192.168.1.42
```

Também é aceito `MACHINE_GATEWAY=esp32` como modo direto.

## 5. Rotas da interface

| Rota | Função | Quando usar |
|---|---|---|
| `/` | Tela inicial com o fluxo guiado | Começo da operação |
| `/scan` | Scanner guiado por câmera | Caminho principal para mapear o cubo real |
| `/manual` | Editor manual do cubo | Alternativa sem câmera, correção manual ou testes |
| `/solve` | Console de execução | Acompanhar sessão, iniciar máquina e visualizar animação |
| `/architecture` | Guia técnico de arquitetura | Consulta técnica |
| `/esp32-architecture` | Guia técnico do firmware | Consulta técnica do ESP32 |

## 6. Como operar pela tela inicial

1. Abra `/`.
2. Escolha **Usar scanner** para capturar um cubo real pela câmera.
3. Escolha **Montar manualmente** quando não houver câmera, quando a leitura automática falhar ou quando o objetivo for teste.
4. Use os links técnicos apenas para consulta de arquitetura e firmware; eles não fazem parte do fluxo normal do usuário.

## 7. Operação pelo scanner (`/scan`)

O scanner captura as 6 faces na ordem:

```text
U, R, F, D, L, B
```

Significado das faces:

| Face | Nome | Centro padrão |
|---|---|---|
| `U` | Cima/topo | branco |
| `R` | Direita | vermelho |
| `F` | Frente | verde |
| `D` | Baixo | amarelo |
| `L` | Esquerda | laranja |
| `B` | Trás | azul |

Passo a passo:

1. Abra `/scan`.
2. Clique em **Abrir câmera e iniciar escaneamento**.
3. Autorize a câmera no navegador.
4. Posicione a face indicada dentro da área de leitura.
5. Aguarde a leitura estabilizar. A tela congela a imagem automaticamente quando a confiança estiver suficiente.
6. Revise a grade 3x3 da face.
7. Se uma cor estiver errada, selecione a cor correta na paleta e clique no sticker que precisa ser corrigido.
8. Clique em **Confirmar face**.
9. Repita até as 6 faces estarem capturadas.
10. Na revisão final, corrija qualquer sticker errado.
11. Clique em **Validar no backend** para checar a consistência.
12. Clique em **Validar e resolver** para criar a sessão e ir para `/solve`.

Dicas de captura:

- Mostre a face inteira, sem aproximar demais o cubo da câmera.
- Evite reflexos e baixa iluminação.
- Se a imagem congelar errada, use **Escanear novamente**.
- A correção manual sempre fica disponível antes de resolver.
- Se estiver em celular, abra por HTTPS; câmera em HTTP comum costuma ser bloqueada.

## 8. Operação pelo editor manual (`/manual`)

O editor manual mostra uma rede 2D do cubo na convenção `URFDLB`.

Passo a passo:

1. Abra `/manual`.
2. Escolha a cor ativa na paleta.
3. Clique nos stickers para pintar cada face.
4. Os centros ficam travados para manter a orientação do cubo.
5. Preencha os 54 stickers.
6. Garanta que cada cor apareça exatamente 9 vezes.
7. Use **Validar** para checar o estado sem resolver.
8. Clique em **Resolver cubo** para validar, chamar o solver e salvar a sessão.
9. Aguarde a tela redirecionar para `/solve`.

Ações auxiliares:

| Ação | Função |
|---|---|
| **Embaralhar** | Gera um estado embaralhado válido para teste |
| **Estado resolvido** | Reinicia para o cubo resolvido |
| **Limpar peças** | Apaga stickers editáveis e mantém apenas os centros |
| **Validar** | Chama `/api/cube/validate` |
| **Resolver cubo** | Valida, chama `/api/cube/solve`, cria `SolveSession` e abre `/solve` |

Observações:

- Clique esquerdo pinta com a cor ativa.
- Clique direito remove a cor de um sticker editável.
- O botão de resolver fica bloqueado se faltarem stickers ou se a contagem de cores não estiver balanceada.
- Após resolver, a tela exibe `jobId`, quantidade de movimentos e a sequência lógica retornada.

## 9. Console de execução (`/solve`)

A tela `/solve` reúne:

- sessão ativa;
- status da máquina;
- permissão da aba atual;
- modo de conexão;
- progresso físico;
- visualização/animação do cubo.

### Quando não há sessão

A tela exibe links para voltar ao scanner ou ao editor manual. Crie uma sessão primeiro em `/scan` ou `/manual`.

### Quando há sessão

O painel mostra:

| Campo | Significado |
|---|---|
| `jobId` | Identificador da execução |
| Movimentos lógicos | Quantidade de movimentos do solver, como `R`, `U`, `F2`, `R'` |
| Ações mecânicas | Quantidade de ações geradas para a máquina |
| Permissão | `Operador` ou `Visualização` |
| Conexão | `Mock local`, `ESP32 via polling`, `Aguardando ESP32`, `ESP32 direto` etc. |
| Consulta de status | Indica se a web está fazendo polling de progresso |
| Progresso físico | `completedActions/totalActions`, quando há telemetria |

### Iniciando a execução

1. Abra `/solve` após criar uma sessão.
2. Confirme se a aba aparece como **Operador**.
3. Clique em **Iniciar execução**.
4. O backend envia o plano mecânico para o gateway configurado.
5. Em `polling`, o job fica na fila até o ESP32 chamar `/api/device/jobs/next`.
6. A web consulta `/api/machine/status?jobId=...` a cada ciclo e atualiza o console.

### Permissão de operador

- Ao abrir `/solve`, a web tenta assumir a operação com `POST /api/machine/session`.
- A aba operadora recebe um cookie HTTP-only.
- Apenas a aba operadora pode iniciar a execução.
- Outras abas podem visualizar a sessão ativa, mas não conseguem enviar comandos.
- Se a sessão de operador expirar, a aba pode tentar renovar ao recarregar/abrir o console.

### Status possíveis

| Status | Significado |
|---|---|
| `queued` | Job criado e aguardando execução |
| `started` | Máquina/mock iniciou a execução |
| `finished` | Execução finalizada |
| `error` | Houve falha no gateway, ESP32 ou job |

### Animação e telemetria

- Com telemetria da máquina, a visualização usa `progress.currentLogicalMoveIndex` para mostrar o estado físico atual.
- Sem telemetria, a animação local pode continuar como fallback após o status mudar para `started`.
- Quando a máquina controla o progresso, controles manuais de animação podem ficar bloqueados para evitar dessincronização.

## 10. Conceitos importantes

### `CubeState`

Representa o cubo inteiro:

```ts
type CubeState = Record<"U" | "R" | "F" | "D" | "L" | "B", FaceStickers>;
```

Cada face tem 9 stickers e as cores suportadas são:

```text
white, red, green, yellow, orange, blue
```

### `LogicalMove`

Movimento lógico retornado pelo solver. Exemplos:

```text
R U R' U' F2
```

Formato aceito:

```text
U, R, F, D, L, B + opcionalmente ', 2
```

### `SolveSession`

Sessão criada após resolver o cubo. Contém:

- `jobId`;
- `initialCubeState`;
- `logicalMoves`;
- `mechanicalPlan`;
- configurações de animação;
- status/progresso da máquina, quando disponível.

### `mechanicalPlan`

Plano serializável enviado à máquina. Pode conter ações como:

- `home`;
- `clamp`;
- `turn_face`;
- `wait`;
- `rotate_cube`, previsto no contrato para evolução.

## 11. API da web

### Health check

```bash
curl http://localhost:3000/api/health
```

### Validar cubo

Endpoint:

```http
POST /api/cube/validate
```

Payload:

```json
{
  "cubeState": {
    "U": ["white", "white", "white", "white", "white", "white", "white", "white", "white"],
    "R": ["red", "red", "red", "red", "red", "red", "red", "red", "red"],
    "F": ["green", "green", "green", "green", "green", "green", "green", "green", "green"],
    "D": ["yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow", "yellow"],
    "L": ["orange", "orange", "orange", "orange", "orange", "orange", "orange", "orange", "orange"],
    "B": ["blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue", "blue"]
  }
}
```

Resposta válida:

```json
{
  "valid": true,
  "errors": []
}
```

Validações feitas:

- 6 faces presentes;
- 9 stickers por face;
- cores permitidas;
- exatamente 9 stickers por cor;
- centros únicos;
- estado completo.

### Resolver cubo

Endpoint:

```http
POST /api/cube/solve
```

Payload: igual ao de validação.

Resposta esperada:

```json
{
  "jobId": "cube-1234567890-abc123",
  "initialCubeState": { "...": "..." },
  "logicalMoves": ["R", "U", "R'", "U'", "F2"]
}
```

Erros comuns:

- `400`: JSON inválido ou cubo inválido.
- `422`: cubo estruturalmente válido, mas não solucionável pelo solver.

### Sessão da máquina

Endpoint:

```http
GET|POST|DELETE /api/machine/session
```

Uso:

- `POST`: tenta assumir/renovar a aba operadora.
- `GET`: consulta controle e sessão ativa sem assumir.
- `DELETE`: libera o controle da aba atual.

### Iniciar máquina

Endpoint:

```http
POST /api/machine/start
```

Apenas a aba operadora consegue iniciar. Sem cookie de operador, a API retorna `423`.

Payload simplificado:

```json
{
  "jobId": "cube-001",
  "notation": "U R2 F",
  "actions": [
    { "type": "home", "target": "all" },
    { "type": "turn_face", "actuator": "right", "degrees": 90 }
  ],
  "initialCubeState": { "...": "CubeState" },
  "logicalMoves": ["U", "R2", "F"]
}
```

Resposta:

```json
{
  "jobId": "cube-001",
  "status": "queued",
  "updatedAt": "2026-06-29T12:00:00.000Z",
  "gatewayMode": "polling"
}
```

### Consultar status

Endpoint:

```http
GET /api/machine/status?jobId=cube-001
```

Resposta típica:

```json
{
  "jobId": "cube-001",
  "status": "started",
  "updatedAt": "2026-06-29T12:00:01.000Z",
  "progress": {
    "currentActionIndex": 2,
    "completedActions": 2,
    "totalActions": 8,
    "currentActionType": "turn_face",
    "currentLogicalMoveIndex": 1,
    "totalLogicalMoves": 4
  },
  "gatewayMode": "polling"
}
```

## 12. Integração com ESP32 via polling

O modo recomendado em produção é `MACHINE_GATEWAY=polling`.

Sequência:

1. ESP32 inicia e registra presença:

```http
POST /api/device/register
X-Device-Secret: <DEVICE_SECRET>
```

2. Usuário cria sessão e clica em **Iniciar execução**.
3. Backend coloca o job em fila.
4. ESP32 pergunta se há job:

```http
GET /api/device/jobs/next?deviceId=rubik-solver-01
X-Device-Secret: <DEVICE_SECRET>
X-Device-IP: 192.168.1.42
```

5. Se houver job, o backend retorna:

```json
{
  "hasJob": true,
  "job": {
    "jobId": "cube-001",
    "notation": "U R2 F",
    "actions": [
      { "type": "home", "target": "all" },
      { "type": "turn_face", "actuator": "right", "degrees": 90 }
    ]
  }
}
```

6. ESP32 executa e reporta status:

```http
POST /api/device/jobs/status
X-Device-Secret: <DEVICE_SECRET>
X-Device-IP: 192.168.1.42
```

Payload:

```json
{
  "deviceId": "rubik-solver-01",
  "jobId": "cube-001",
  "status": "started",
  "progress": {
    "currentActionIndex": 1,
    "completedActions": 1,
    "totalActions": 2,
    "currentActionType": "turn_face"
  }
}
```

Para finalizar:

```json
{
  "deviceId": "rubik-solver-01",
  "jobId": "cube-001",
  "status": "finished",
  "progress": {
    "completedActions": 2,
    "totalActions": 2
  }
}
```

Para erro:

```json
{
  "deviceId": "rubik-solver-01",
  "jobId": "cube-001",
  "status": "error",
  "errorMessage": "Falha na ação turn_face",
  "progress": {
    "currentActionIndex": 1,
    "completedActions": 1,
    "totalActions": 2,
    "currentActionType": "turn_face"
  }
}
```

## 13. Checklist de demonstração

Antes de demonstrar:

- Conferir se `npm run build` passa.
- Conferir se `DEVICE_SECRET` está configurado no deploy.
- Em produção, confirmar `MACHINE_GATEWAY=polling`.
- Confirmar que o ESP32 foi provisionado com o mesmo segredo.
- Abrir `/api/health`.
- Abrir `/solve` e verificar a conexão exibida.
- Se a demonstração for sem hardware, usar `MACHINE_GATEWAY=mock`.

Durante a operação:

- Criar a sessão pelo scanner ou editor manual.
- Validar o cubo antes de resolver.
- Confirmar que a aba está como **Operador**.
- Clicar em **Iniciar execução** somente quando a máquina estiver pronta.
- Acompanhar `queued`, `started`, `finished` ou `error` no console.

## 14. Diagnóstico e solução de problemas

### A câmera não abre

Possíveis causas:

- app aberto por HTTP em vez de HTTPS;
- navegador sem suporte à câmera;
- permissão negada;
- câmera em uso por outro app.

Correções:

- em desktop local, usar `localhost`;
- em celular, usar `npm run dev:mobile` ou deploy HTTPS;
- liberar permissão da câmera no navegador;
- fechar outros apps que estejam usando a câmera.

### O scanner congelou a face com cores erradas

Correções:

- toque em **Escanear novamente**;
- melhore a iluminação;
- afaste um pouco o cubo;
- corrija manualmente os stickers antes de confirmar.

### O botão de resolver fica bloqueado no editor manual

Causas comuns:

- faltam stickers;
- alguma cor não tem exatamente 9 stickers;
- o cubo está incompleto.

Correção:

- use o painel de contagem por cor e preencha até chegar a `54/54` e `9/9` para cada cor.

### A API retorna cubo inválido

Verifique:

- se todas as faces `U/R/F/D/L/B` existem;
- se cada face tem 9 stickers;
- se as cores são apenas `white`, `red`, `green`, `yellow`, `orange`, `blue`;
- se cada cor aparece exatamente 9 vezes;
- se os centros estão corretos e únicos;
- se a combinação física é solucionável.

### `/solve` mostra “Visualização apenas”

Outra aba está como operadora ou o cookie da aba atual não assumiu o controle.

Correções:

- feche a aba operadora antiga;
- aguarde expirar o lease de operação;
- recarregue `/solve` para tentar reassumir;
- use apenas uma aba para iniciar a máquina durante demonstrações.

### Status fica em `queued`

Normalmente significa que o job foi criado, mas nenhum ESP32 pegou o job.

Verifique:

- se `MACHINE_GATEWAY=polling` está configurado;
- se o ESP32 está ligado e conectado ao Wi-Fi;
- se o firmware está chamando `/api/device/jobs/next`;
- se o `DEVICE_SECRET` do firmware é igual ao do backend;
- se o deploy público está acessível a partir da rede do ESP32.

### ESP32 recebe `401`

O header `X-Device-Secret` não bate com o `DEVICE_SECRET` do backend.

Correção:

- configure o mesmo segredo no backend e no firmware/provisionamento;
- reinicie/reprovisione o ESP32 se necessário.

### `/api/machine/start` retorna `423`

A aba atual não tem permissão de operador.

Correção:

- abra `/solve` em uma única aba;
- recarregue para tentar assumir controle;
- aguarde a expiração do lease ou libere a aba operadora antiga.

### `/api/machine/status` retorna `502`

O backend falhou ao consultar o gateway da máquina.

Verifique:

- em `direct`, se `DEVICE_IP_OVERRIDE` ou `DEVICE_BASE_URL` está correto;
- se Next.js e ESP32 estão na mesma rede no modo direto;
- se o ESP32 responde `/status`;
- se o `DEVICE_SECRET` está configurado;
- se o modo correto é `polling` em produção.

## 15. Boas práticas operacionais

- Use `polling` em produção; use `direct` somente em bancada local.
- Não exponha `DEVICE_SECRET` em logs, screenshots ou commits.
- Faça a revisão final das 6 faces antes de resolver.
- Durante execução física, mantenha apenas uma aba operadora.
- Prefira telemetria por ação (`completedActions`, `totalActions`, `currentActionType`) para manter o cubo 3D sincronizado.
- Para múltiplas instâncias Next.js no futuro, mover sessão ativa, operador e fila para Redis ou banco compartilhado.
