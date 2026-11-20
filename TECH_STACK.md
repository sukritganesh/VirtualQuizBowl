# Virtual Quiz Bowl tech stack

The first build targets a browser on the same PC as the RTX 4090. The browser runs the round. A Python service transcribes and judges each recorded answer on the PC. The [game overview](GAME_OVERVIEW.md) defines the rules and scoring.

## Browser

Use the [UI pack](design/trivia-ui/SKILL.md) for screen layouts, narration highlighting, pause behavior, and visual references.

- **React, TypeScript, and Vite** for the home screen and round UI. The browser validates the imported JSON set, checks that its mode is `trivia`, and keeps the current question and session score in memory.
- **Browser speech synthesis** for the host. Prefer a local English voice and unlock the buzzer when the utterance ends successfully. If narration fails, offer to replay the question before starting the timer.
- **Microphone capture** with `getUserMedia` and `MediaRecorder`. Request permission before play. Start recording on a valid buzz, stop at the answer deadline, then upload the clip. If the buzz window expires first, the browser resolves the question locally. Use `localhost` for local play and HTTPS for a hosted build. [Browser microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security)

## Answer processing

1. **FastAPI** receives one request containing the finished clip, question, canonical answer, and accepted aliases.
2. **Whisper via faster-whisper** transcribes the clip on the GPU. Start with `large-v3-turbo` and keep the model loaded between questions. [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
3. **Answer matching** first checks the transcript against the answer and aliases, ignoring case and surrounding punctuation. For other phrasing, ask a local Ollama model whether the transcript identifies the keyed answer in context. Start with `deepseek-r1:7b` and request a structured verdict. [Ollama model](https://ollama.com/library/deepseek-r1:7b) · [Structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
4. FastAPI returns the transcript and verdict. The browser applies the scoring rule once. If processing fails, the browser can retry the same clip before scoring.

## Workspace and deployment

Use `web/` for the browser app and `api/` for the Python service. Store named sets anywhere under `sets/trivia/`. The browser validates files against the [trivia set schema](schemas/trivia-set.schema.json), checks that question IDs are unique within the set, and uses array order for play. The initial session needs no database.

For local development, Vite serves the UI and forwards API calls to FastAPI. FastAPI handles the local models and calls Ollama. For a future hosted version, Railway can serve the built UI and API, with GPU inference running on a separate, reachable service. [Railway deployment guidance](https://railway.com/guides/ai-api-hosted-inference)
