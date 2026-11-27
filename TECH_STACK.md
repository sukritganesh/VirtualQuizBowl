# Virtual Quiz Bowl tech stack

React runs the round in the browser. The host defaults to Kokoro-82M with the Liam voice. A loopback FastAPI service runs Whisper on the RTX 4090 and calls the local Ollama judge. The [game overview](GAME_OVERVIEW.md) defines the rules and scoring.

## Browser

Use the [UI pack](design/trivia-ui/SKILL.md) for screen layouts, narration highlighting, pause behavior, and visual references.

- **React, TypeScript, and Vite** for the home screen and round UI. The browser validates the imported JSON set, checks that its mode is `trivia`, and keeps the current question and session score in memory.
- **Host narration** uses a shared model and voice catalog in [shared/narrators.json](shared/narrators.json). The browser saves the model, voice, speaker, volume, and mute setting. Explicit voice URIs from older settings carry over to Browser speech. Settings and rounds share the playback path.
- **Local speech** posts one question or preview sentence to `/api/narration` and plays the returned WAV. The service serializes synthesis and sends each WAV with `Cache-Control: no-store`. Each round owns the current and next questions’ WAVs or pending requests in browser memory. On Play, it prepares the opening question alongside microphone setup. Once local playback begins it prepares one question ahead. Advancing, switching narrators, muting, or leaving the round releases obsolete clips. Pausing preserves the playback position. The buzzer opens on playback end.
- **Narration hardware** stays inside the service. Kokoro and Piper have separate workers because each phonemizer owns process-wide native state. Kokoro prefers the ONNX Runtime CUDA provider and retries a failed GPU render on CPU. Windows setup isolates the CUDA 12 runtime in the Kokoro model directory so Piper and Whisper can keep their existing dependencies. Piper, Pocket and Qwen use CPU.
- **Word highlighting** uses one word-index callback. Browser voices such as Microsoft David report live boundaries. A local renderer can return a `NarrationClip` with one millisecond onset per printed word (null for a skipped word). The API sends these in the optional `X-Narration-Word-Starts-Ms` header alongside the WAV. The round prepares both together and follows the audio element’s clock, including after a pause. Kokoro gets phoneme timings from the same synthesis pass and aligns them to the original words using eSpeak pronunciations. Voices without timings mark the question as spoken when playback ends.
- **Browser speech** discovers system voices through `getVoices()` and `voiceschanged`. It also serves as the round fallback if the local service is unavailable. Muting advances the read-along on a local timer. If audible narration fails, the player can retry or open the buzzer manually.
- **Manual judging.** The browser owns both deadlines and pauses them with the round. Revealing an answer after buzzing enables manual scoring. A pass or missed buzz resolves the question locally.

- **Menu music** uses a looping HTML audio element owned by the home screen. Each visit selects one of two bundled tracks. Music volume is saved with the other audio preferences.

- **Round sound effects** use local audio files and the shared [sound catalog](web/src/soundLibrary.json). Home Settings saves one filename per cue with the audio preferences. The round reducer identifies an accepted buzz, verdict or expired deadline so keyboard and button inputs produce the same sound. Playback runs independently of microphone capture and scoring. The [asset credits](web/public/sounds/CREDITS.md) record the sources and licenses.

## Local AI answer processing

The browser checks local model availability and requests microphone permission before play. A valid buzz enables the mic and starts `MediaRecorder`. Pausing suspends the recorder and disables the track. Each question owns its clip, request and verdict. The session releases the microphone on quit or completion. [Browser microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security)

1. **FastAPI** receives one request containing the finished clip, question, canonical answer, and accepted aliases.
2. **Whisper via faster-whisper** transcribes in English on CUDA using local `large-v3-turbo` weights and voice activity detection. PyAV decodes up to five seconds of mono audio in memory. [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
3. **Answer matching** first checks the transcript against the answer and aliases, ignoring case and surrounding punctuation. For other phrasing, Qwen3 4B Instruct (`qwen3:4b-instruct`) grades the whole reply in context and returns a structured verdict. It scored 29/30 on the comparator at a median of 359 ms. When Phi-4 Mini is selected, the game splits explicit corrections such as “no, wait” so Phi can evaluate each guess. [Benchmark results](benchmarks/spoken-answers/README.md#local-judges-on-the-same-30-replies) · [Structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
4. The judge uses the selected model's default behavior and a 768-token output limit, which also covers any reasoning tokens the model generates. A length stop or a 90-second Ollama chat timeout leaves the question unscored. The browser offers manual grading or a retry with the same clip. On success, FastAPI returns the transcript and verdict and the browser applies the score once.

## Workspace and deployment

Use `web/` for the browser app and `api/` for the Python service. Vite bundles the JSON files under `sets/trivia/`. Each directory becomes a category in the set browser, and a directory can contain both sets and subcategories. The set's JSON supplies its title and in-game category. The browser validates files against the [trivia set schema](schemas/trivia-set.schema.json), checks that question IDs are unique within the set, and uses array order for play. The initial session needs no database.

Vite serves the playable version locally and builds a static site in `web/dist/`. Development and preview proxy `/api` to FastAPI on `127.0.0.1:52743`. Setup commands are in the [README](README.md). A standalone static deployment supports manual mode and requires an inference service for AI mode.
