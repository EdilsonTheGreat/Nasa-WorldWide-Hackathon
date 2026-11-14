# CLAUDE.md: regras do projecto para qualquer Claude que trabalhe neste repositório

## O projecto
Deep Thinkers, NASA Space Apps Challenge 2026 (Maputo, 14–15 Nov). Desafio: *Create Health Monitoring Software for Astronauts on Space Missions*.
Construímos uma app que detecta cedo sinais de **SANS** (Síndrome Neuro-Ocular Associada ao Voo Espacial): compara cada astronauta com o seu próprio normal e com a evolução esperada, e mostra um semáforo (verde / amarelo / vermelho) com uma acção.
Ciclo: **teste → comparação → semáforo → acção**.

## Regras que não se negociam
1. **A app funciona SEM internet.** Nada de CDN, APIs externas, fontes do Google, `fetch()` a URLs. Bibliotecas (ex.: Chart.js) ficam copiadas dentro de `app/`.
2. **A app corre em qualquer dispositivo com browser**: telemóvel, tablet, portátil, PC. Layout responsivo. O núcleo (dados, motor, ecrãs) funciona com duplo clique em `app/index.html` (`file://`).
   **Excepção: módulo da câmara** (`app/camara/`). Precisa de `http://localhost`, porque o browser não dá câmara nem carrega o modelo a partir de `file://`. Abrir com `abrir_app.command` (Mac) ou `abrir_app.bat` (Windows): servidor local, continua **sem internet**. Se a câmara falhar, a app tem de continuar (o módulo devolve `estado: "indisponivel"`).
3. **Nunca ler `.json` ou `.csv` com `fetch()` na app.** Em `file://` o browser bloqueia. Os dados entram como JavaScript: `<script src="dados.js">` cria `window.FAIXAS` e `window.ASTRONAUTAS`. As regras entram como `<script src="../motor/regras.js">` → `window.REGRAS`.
4. **JavaScript simples (ES2017+), sem frameworks, sem build, sem npm** na app e no motor. Funções puras sempre que possível.
5. **Textos visíveis ao utilizador em português** (variante de Moçambique / europeia: "acção", "objectivo", "projecto").
6. **Não inventar números médicos.** Limites e textos clínicos estão em `motor/regras.js` e são validados pela equipa de saúde (Sheinaze e Neyde). Se faltar um valor, deixar `// TODO saúde:` e avisar.

## Quem é dono de cada pasta (não editar pastas de outros sem combinar)
| Pasta | Dono | Conteúdo |
|---|---|---|
| `simulador/` | Lukanga | `simulador.py` (Python 3, numpy, matplotlib). Gera `dados/*` e `app/dados.js` |
| `dados/` | gerado | **Não editar à mão.** Correr `python3 simulador/simulador.py` |
| `motor/` | Edilson | `motor.js` (regras do semáforo), `regras.js` (limites e textos), `testes.js` + `teste.html` (9 testes) |
| `app/` | Marllon (+ Chandy no design) | `index.html`, ecrãs, CSS. `app/dados.js` é gerado pelo simulador. `app/camara/` = distância ao ecrã (`distancia.js`), entrada pela cara (`rosto.js`) e teste completo; bibliotecas offline em `vendor/` (não editar). **`app/visao/` = a interface do Marllon já ligada ao backend por `ligacao.js` (ler `app/visao/README.md` antes de mexer); é o que `abrir_app` abre** |
| `docs/` | todos | Especificações. `docs/EDILSON.md` = motor; `docs/MARLLON.md` = como a UI chama o backend (`Armazem`, `Motor`, `Modelo`, `Distancia`) |

## Contrato de dados (mudar só depois de avisar a equipa toda)
- `window.ASTRONAUTAS`: array de registos `{astronauta_id, perfil, dia, oct_um, amsler_zonas, amsler_centro, acuidade_linha, melhora_com_oculos, perg_focar, perg_contraste, perg_dor_cabeca, perg_visao_dupla}`. Campos sem medição nesse dia = `null`. `amsler_zonas` = array de inteiros 0–8 (grelha 3×3, centro = 4).
- `window.FAIXAS`: `p10`, `p50`, `p90`, `p97` = arrays de 181 números (índice = dia 0..180) com o Δ% esperado; `subida_rapida` = lista `{de, ate, taxa_p97_pct_dia}`; `calendario_oct` = `[0,10,30,60,90,120,150]`.
- `perfil`: `populacao` | `demo_verde` (DEMO_A) | `demo_amarelo` (DEMO_B) | `demo_vermelho` (DEMO_C).
- Cores: sempre as strings `"verde"`, `"amarelo"`, `"vermelho"` (e `"a_calibrar"` quando não há linha de base).

## Privacidade (reconhecimento facial)
- Só a própria pessoa regista a sua cara, com consentimento. Guarda-se apenas o descritor numérico, no aparelho (`localStorage`). Nunca guardar nem enviar fotografias. A escolha manual do perfil tem de existir sempre.

## Comandos
- Regenerar dados: `python3 simulador/simulador.py` (seed fixa → resultados iguais)
- Testar o motor e o modelo: abrir `motor/teste.html` no browser (22 testes)
- Teste completo com perfis, câmara e OCT: `abrir_app.command` (Mac) ou `abrir_app.bat` (Windows)

## Git
- Fazer `git pull` antes de começar. Commits pequenos, mensagens em português a dizer **o quê e porquê**.
- Não fazer commit de ficheiros do IDE (`.idea/`) nem de `__pycache__/`.
