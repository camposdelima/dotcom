# DotCom — Contexto do Projeto

## Descrição

Jogo de conexão para dois jogadores no mesmo dispositivo (mobile/desktop).  
Cada jogador traça linhas entre pontos em uma grade quadrada. **Ambos** tentam conectar **Esquerda ↔ Direita**. Quem completar a conexão primeiro vence.

Inspirado no **Bridg-It** (Game of Gale / Shannon Switching Game), de David Gale e John Nash.

## Stack

- HTML5 + CSS3 + JavaScript vanilla (sem frameworks)
- Canvas 2D para renderização do tabuleiro
- Mobile-first, responsivo, eventos de toque

## Estrutura

```
dotcom/
├── index.html          # Página principal
├── AGENTS.md           # Contexto para agentes (este arquivo)
├── README.md           # Documentação do projeto
├── css/
│   └── style.css       # Estilos dark theme, responsivo
└── js/
    ├── game.js         # Estado do jogo, regras, detecção de vitória (BFS)
    ├── board.js        # Renderização Canvas, detecção de clique/toque em arestas
    └── app.js          # Inicialização, eventos, atualização de UI
```

## Regras do Jogo

1. Tabuleiro: grade de N×N pontos (padrão 7×7)
2. Azul (player 0) começa, alternando a cada jogada
3. Na sua vez, toque/clique em uma aresta (linha entre dois pontos adjacentes) para marcá-la com sua cor
4. Arestas já ocupadas não podem ser alteradas
5. Se um jogador controla **Norte e Sul** de um mesmo ponto, o oponente não pode usar **Leste ou Oeste** desse ponto (bloqueio cruzado). O mesmo vale se controlar **Leste e Oeste** — o oponente fica bloqueado de usar **Norte ou Sul** daquele ponto
6. **Qualquer jogador vence** ao formar um caminho contínuo de suas arestas da coluna mais à esquerda até a mais à direita
7. O caminho vencedor é destacado com brilho
8. Undo disponível (desfaz movimento, mantém histórico da partida)
9. Placar de vitórias entre as partidas, com botão para reset

## Arquitetura

### game.js
- `createGame(rows, cols)` — estado imutável do jogo
- `placeEdge(game, row, col, orientation)` — valida e marca aresta, verifica vitória, alterna turno
- `checkWin(game, player)` — BFS a partir da borda esquerda, retorna o caminho vencedor (pontos + arestas)
- `undoMove(game)` — desfaz último movimento, restaura aresta e turno, limpa estado de vitória

### board.js
- `computeLayout(canvas, game)` — geometria do grid (padding, cellSize, offset)
- `drawBoard(ctx, canvas, game)` — renderiza fundo, indicadores laterais, arestas, dots, caminho vencedor
- `findEdgeAt(canvas, game, px, py)` — encontra a aresta vazia mais próxima de um ponto (clique/toque)
- `distToSegment(px, py, x1, y1, x2, y2)` — distância de ponto a segmento de reta

### app.js
- Inicializa jogo, redimensiona canvas (responsivo), orquestra eventos de clique/toque
- Atualiza UI: indicador de turno, mensagem de vitória, placar
- Controla undo e reset de placar

## Tamanhos Disponíveis

| Grid  | Dificuldade | Arestas |
|-------|-------------|---------|
| 5×5   | Fácil       | 40      |
| 7×7   | Médio       | 84      |
| 9×9   | Difícil     | 144     |
| 11×11 | Expert      | 220     |

## Como Rodar

Abra o `index.html` em qualquer navegador moderno.  
No celular, sirva via HTTP local (ex: `python -m http.server 8080`) ou use uma extensão Live Server no VS Code.

## Próximos Passos Possíveis

- [ ] Modo contra IA (algoritmo minimax / busca em grafo)
- [ ] Destaque no hover da aresta (desktop)
- [ ] Suporte a Retina/HiDPI (devicePixelRatio)
- [x] Botão "Desfazer" (undo)
- [x] Placar de vitórias com reset
- [ ] Tela de vitória com animação
- [ ] PWA (manifest.json + service worker)
- [ ] Tradução EN
