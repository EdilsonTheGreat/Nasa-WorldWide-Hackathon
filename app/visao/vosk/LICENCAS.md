# Offline speech recognition (Vosk)

- `vosk.js`: vosk-browser 0.0.8 (Ciaran O'Reilly), Apache-2.0, https://github.com/ccoreilly/vosk-browser
- `modelo-en.bin` (it is a .tar.gz; the .bin extension stops the server from sending it with Content-Encoding): official `vosk-model-small-en-us-0.15` model from Alpha Cephei, Apache-2.0, https://alphacephei.com/vosk/models
  (`model/` folder, unmodified).

Everything runs inside the browser (WebAssembly, in a Web Worker). Microphone audio never leaves the device and no internet is used.
