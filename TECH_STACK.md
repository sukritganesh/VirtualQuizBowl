# Virtual Quiz Bowl tech stack

React runs the round in the browser. The host uses browser speech synthesis. A loopback FastAPI service runs Whisper on the RTX 4090 and calls the local Ollama judge. The [game overview](GAME_OVERVIEW.md) defines the rules and scoring.

## Browser

Use the [UI pack](design/trivia-ui/SKILL.md) for screen layouts, narration highlighting, pause behavior, and visual references.

- **React, TypeScript, and Vite** for the home screen and round UI. The browser validates the imported JSON set, checks that its mode is `trivia`, and keeps the current question and session score in memory.
- **Browser speech synthesis** for the host. Read the available voices through `getVoices()` and refresh the settings selector on `voiceschanged`. Store the chosen voice URI, volume, and mute preference in browser local storage. Use the selected voice for both preview and narration, falling back to an available English voice when needed. Speak the question in one utterance and drive the highlight from its word events. Its end event opens the buzzer even if the voice supplied no word positions. Silent reading advances the highlight on a local timer. If audible narration fails, offer to replay the question before starting the timer.
- **Manual judging.** The browser owns both deadlines and pauses them with the round. Revealing an answer after buzzing enables manual scoring. A pass or missed buzz resolves the question locally.

- **Menu music** uses a looping HTML audio element owned by the home screen. Each visit selects one of two bundled tracks. Music volume is saved with the other audio preferences.

- **Round sound effects** use local audio files and the shared [sound catalog](web/src/soundLibrary.json). Home Settings saves one filename per cue with the audio preferences. The round reducer identifies an accepted buzz, verdict or expired deadline so keyboard and button inputs produce the same sound. Playback runs independently of microphone capture and scoring. The [asset credits](web/public/sounds/CREDITS.md) record the sources and licenses.

## Local AI answer processing

The browser checks local model availability and requests microphone permission before play. A valid buzz enables the mic and starts `MediaRecorder`. Pausing suspends the recorder and disables the track. Each question owns its clip, request and verdict. The session releases the microphone on quit or completion. [Browser microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security)

1. **FastAPI** receives one request containing the finished clip, question, canonical answer, and accepted aliases.
2. **Whisper via faster-whisper** transcribes in English on CUDA using local `large-v3-turbo` weights and voice activity detection. PyAV decodes up to five seconds of mono audio in memory. [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
3. **Answer matching** first checks the transcript against the answer and aliases, ignoring case and surrounding punctuation. For other phrasing, ask a local Ollama model whether the transcript identifies the keyed answer in context. Phi-4 Mini (`phi4-mini:3.8b`) is the default and returns a structured verdict. For explicit corrections such as “no, wait,” pass each part of the reply to Phi so it can apply the rule on changed guesses. [Ollama model](https://ollama.com/library/phi4-mini:3.8b) · [Structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
4. The judge uses the selected model's default behavior and a 768-token output limit, which also covers any reasoning tokens the model generates. A length stop or a 90-second Ollama chat timeout leaves the question unscored. The browser offers manual grading or a retry with the same clip. On success, FastAPI returns the transcript and verdict and the browser applies the score once.

## Workspace and deployment

Use `web/` for the browser app and `api/` for the Python service. Vite bundles the JSON files under `sets/trivia/`. Each directory becomes a category in the set browser, and a directory can contain both sets and subcategories. The set's JSON supplies its title and in-game category. The browser validates files against the [trivia set schema](schemas/trivia-set.schema.json), checks that question IDs are unique within the set, and uses array order for play. The initial session needs no database.

Vite serves the playable version locally and builds a static site in `web/dist/`. Development and preview proxy `/api` to FastAPI on `127.0.0.1:52743`. Setup commands are in the [README](README.md). A standalone static deployment supports manual mode and requires an inference service for AI mode.
