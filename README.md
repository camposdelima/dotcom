# DotCom — Jogo de Conexão

Dois jogadores, um dispositivo. Conecte seus lados antes do oponente!

Ambos conectam **Esquerda ↔ Direita**

Cada jogador traça linhas entre pontos adjacentes na grade. O primeiro a formar um caminho contínuo de uma borda à outra vence.

## Como Jogar

1. Abra `index.html` no navegador (celular ou desktop)
2. Selecione o tamanho do tabuleiro (5×5 a 11×11)
3. Toque/clique em uma linha entre dois pontos para traçá-la
4. Alterne com o adversário no mesmo dispositivo
5. Vença conectando seus lados!

## Executar

```
python -m http.server 8080
```

Depois acesse `http://localhost:8080` no navegador.

Ou simplesmente abra o `index.html` direto no navegador (recomendado usar Live Server no VS Code).

## Tecnologia

HTML5 + CSS3 + JavaScript vanilla. Sem dependências externas.

## Funcionalidades

- Tabuleiro ajustável (5×5 a 11×11)
- Undo a qualquer momento (inclusive após vitória)
- Placar de vitórias persistente entre partidas
- Botão para resetar o placar
