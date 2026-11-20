# Virtual Quiz Bowl tech stack

The first playable build runs in the browser. React handles manual judging and scoring, and browser speech synthesis voices the host. The [game overview](GAME_OVERVIEW.md) defines the rules and scoring. The planned AI version adds a local Python service on the PC with the RTX 4090.

## Browser

Use the [UI pack](design/trivia-ui/SKILL.md) for screen layouts, narration highlighting, pause behavior, and visual references.

- **React, TypeScript, and Vite** for the home screen and round UI. The browser validates the imported JSON set, checks that its mode is `trivia`, and keeps the current question and session score in memory.
- **Browser speech synthesis** for the host. Read the available voices through `getVoices()` and refresh the settings selector on `voiceschanged`. Store the chosen voice URI, volume, and mute preference in browser local storage. Use the selected voice for both preview and narration, falling back to an available English voice when needed. Silent reading advances the highlight on a local timer. If audible narration fails, offer to replay the question before starting the timer.
- **Manual judging.** The browser owns both deadlines and pauses them with the round. Revealing an answer after buzzing enables manual scoring. A pass or missed buzz resolves the question locally.

## Planned AI answer processing

In the AI version, capture the answer with `getUserMedia` and `MediaRecorder`. Request microphone permission before play, record during the answer window, and upload the finished clip. [Browser microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security)

1. **FastAPI** receives one request containing the finished clip, question, canonical answer, and accepted aliases.
2. **Whisper via faster-whisper** transcribes the clip on the GPU. Start with `large-v3-turbo` and keep the model loaded between questions. [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
3. **Answer matching** first checks the transcript against the answer and aliases, ignoring case and surrounding punctuation. For other phrasing, ask a local Ollama model whether the transcript identifies the keyed answer in context. Start with `deepseek-r1:7b` and request a structured verdict. [Ollama model](https://ollama.com/library/deepseek-r1:7b) · [Structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
4. FastAPI returns the transcript and verdict. The browser applies the scoring rule once. If processing fails, the browser can retry the same clip before scoring.

## Workspace and deployment

Use `web/` for the browser app and `api/` for the Python service. Store named sets anywhere under `sets/trivia/`. The browser validates files against the [trivia set schema](schemas/trivia-set.schema.json), checks that question IDs are unique within the set, and uses array order for play. The initial session needs no database.

Vite serves the playable version locally and builds a static site in `web/dist/`. In the AI version, the browser will send answer clips to FastAPI. Railway could host the UI and API with GPU inference on a separate, reachable service. [Railway deployment guidance](https://railway.com/guides/ai-api-hosted-inference)
