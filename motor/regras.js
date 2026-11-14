// =====================================================================
// regras.js: limites e textos do semáforo
//
// QUEM EDITA: a equipa de saúde (Sheinaze e Neyde). Não é preciso mexer
// no motor.js para mudar um limite ou uma frase: basta mudar aqui.
//
// Valores PROVISÓRIOS, tirados do documento do MVP. Quando a equipa de
// saúde os validar, mudar "provisorio" para false.
//
// Porquê .js e não .json: a app abre do disco (file://) e aí o browser
// bloqueia a leitura de .json. Um <script src="regras.js"> funciona sempre.
// =====================================================================
window.REGRAS = {
  versao: 1,
  provisorio: true,

  // Grelha de Amsler 3x3, zonas numeradas:
  //   0 1 2
  //   3 4 5
  //   6 7 8
  // Uma zona NOVA no centro dá vermelho; noutro sítio dá amarelo.
  amsler: { zona_centro: 4 },

  // Acuidade de perto: perder esta quantidade de linhas (ou mais) dá amarelo.
  // Se, além disso, não melhorar com os óculos de reserva, dá vermelho.
  acuidade: { perda_amarelo_linhas: 1 },

  // Frases mostradas ao astronauta e intervalo até ao próximo teste.
  textos: {
    a_calibrar: { mensagem: "A calibrar o teu normal. Faz o próximo teste daqui a uma semana.", proximo_teste_dias: 7 },
    verde:      { mensagem: "Dentro do esperado. Próximo teste daqui a uma semana.", proximo_teste_dias: 7 },
    amarelo:    { mensagem: "Repete daqui a 3 dias. Usa os óculos de reserva. Confirma o CO₂ na cabine.", proximo_teste_dias: 3 },
    vermelho:   { mensagem: "Avisa já o médico de voo. O pacote com os teus resultados está pronto.", proximo_teste_dias: 1 }
  }
};
