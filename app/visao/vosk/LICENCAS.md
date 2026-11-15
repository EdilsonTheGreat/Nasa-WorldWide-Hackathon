# Reconhecimento de voz offline (Vosk)

- `vosk.js`: vosk-browser 0.0.8 (Ciaran O'Reilly), Apache-2.0, https://github.com/ccoreilly/vosk-browser
- `modelo-en.bin` (é um .tar.gz; a extensão .bin evita que o servidor o mande com Content-Encoding): modelo oficial `vosk-model-small-en-us-0.15` da Alpha Cephei, Apache-2.0, https://alphacephei.com/vosk/models
  (pasta `model/`, sem alterações).

Tudo corre dentro do browser (WebAssembly, num Web Worker). O som do microfone nunca sai do aparelho e não é usada internet.
