# app/visao/ (interface do Marllon, ligada ao backend)

Os 8 ecrãs do Marllon (`Main`, `Hoje`, `TesteRapido`, `Tendencia`, `SANS`, `Alerta`, `Perfil`, `OCT`) com o backend ligado.
Abrir com `abrir_app.command` (Mac) ou `abrir_app.bat` (Windows): começa em `Main.html`, em `http://localhost:8000`.
Com duplo clique no ficheiro tudo funciona, **menos a câmara** (distância e entrada pelo rosto).

## Como está ligado

```
ecrã (.html)  ->  window.Visao (ligacao.js)  ->  Armazem, Motor, Modelo, Distancia, Rosto
```

Cada ecrã carrega, por esta ordem: `../dados.js`, `../../motor/regras.js`, `../../motor/motor.js`, `../../motor/modelo.js`,
`../armazenamento.js`, (`../camara/...` só em `Main` e `TesteRapido`), `ligacao.js`, `runtime.js`.

Há dois tipos de sessão, escolhidos em `Main.html`:

| Sessão | Quem | De onde vêm os dados | Guarda? |
|---|---|---|---|
| **Equipa · dados reais** | CHANDY, EDILSON, LUKANGA, MARLLON, NEYDE, SHEINAZE (`Armazem.EQUIPA`) | Testes feitos no aparelho + `Motor` + `Modelo` | Sim, `localStorage` (`dt_registos`) |
| **Demonstração · fictícios** | Marta (A), Daniel (B), Sofia (C) | Valores de exemplo do Marllon | Não |

A sessão real fica em `localStorage["visao-real"]` (id do perfil) e `visao-dia-<ID>` (dia de missão escolhido ao entrar).
Em cada ecrã, a regra é sempre a mesma: `const R = Visao.algo(); usar R se existir, senão os valores de exemplo`.

## O que cada ecrã usa do backend

| Ecrã | Sessão real | Demonstração |
|---|---|---|
| `Main` | Lista de perfis (`Armazem.perfis`), dia de missão, entrada pelo rosto (`Rosto.identificar`), registo do rosto com consentimento (`Rosto.registar`), ou "Entrar sem câmara" | Face ID e palavra-passe simulados (como antes) |
| `TesteRapido` | Compara com a **base** (1.º teste), guarda o teste (`Visao.guardarTeste`), cor decidida por `Motor.corAmsler` e `Motor.corAcuidade` olho a olho, avisos do `Modelo` | Lógica de exemplo do Marllon |
| `TesteRapido` (os dois) | Distância medida pela câmara em directo (`Distancia`): 35 a 45 cm na acuidade, 28 a 38 cm na grelha | igual |
| `Hoje` | Último teste, estado por olho, recomendação (`Visao.resumoHoje`) | Exemplo |
| `SANS` | Linha temporal dos testes guardados (`Visao.linhaTempo`) | Exemplo |
| `Alerta` | Alertas gerados a partir dos testes (`Visao.alertas`) | Exemplo |
| `Perfil` | Só dados verdadeiros do aparelho (`Visao.fichaPerfil`); "Trocar de perfil" volta ao `Main` | Exemplo |
| `Tendencia` | Para todos: séries `DEMO_A/B/C` do simulador, faixas P10/P90/P97 de `FAIXAS` e cor de `Motor.corOCT` | igual |
| `OCT` | Continua a ser um exemplo simulado (não há OCT a bordo); aparece identificado como "Exemplo simulado" | Exemplo |

## Escalas desta interface (atenção)

- Acuidade: **0 a 5 linhas por olho** (`acuidade_oe`, `acuidade_od`). `acuidade_linha` = a pior das duas (para o `Modelo`).
- Grelha de Amsler: 12x12 por olho (`celulas_od`, `celulas_oe`), convertida para as 9 zonas do motor (`amsler_od`, `amsler_oe`); o bloco central 4x4 é a zona 4.
- Perguntas: Não / Ligeiro / Marcado = 0 / 1 / 3.
- Níveis do ecrã: verde 0, amarelo 1 (condições duvidosas), laranja 2 (= amarelo do motor, ou sintomas), vermelho 3 (= vermelho do motor).
- O ecrã de teste antigo (`app/camara/teste_visao.html`) usa 10 linhas e grelha 3x3. **Não misturar os dois no mesmo perfil.**

## Por fazer

- O questionário pré-exame VISION GUARD (9 perguntas, `REGRAS.prontidao`, `Motor.prontidao`) só existe em `app/camara/teste_visao.html`.
  Aqui o passo "Antes de começar" tem a pergunta do movimento da nave e 4 sintomas. Falta o Marllon desenhar esse passo.
- Calibrar a distância (`Distancia.calibrar(40)`) ainda não tem botão nesta interface.
- Criar perfis novos (além da equipa) ainda não tem botão: `Armazem.criarPerfil("NOME")` na consola, ou pelo ecrã de teste antigo.

## Regras

- Sem internet: a fonte Manrope está em `assets/fonte/` (licença OFL). Nada de `<link>` para fora.
- Rosto: só com o acordo da própria pessoa; guarda-se apenas o descritor numérico (`dt_rostos`), nunca fotografias; a entrada à mão existe sempre.
- "Repor a demonstração" (em `index.html`) apaga só as chaves `visao-*`. Os testes reais e os rostos ficam.
