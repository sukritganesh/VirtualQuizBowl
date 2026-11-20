# Virtual Quiz Bowl

Play a single-player trivia set in your browser. Pick a built-in pack or import a [trivia JSON file](sets/trivia/astronomy/the-night-sky.json). The browser reads each question. Buzz, say your answer, and see the local transcript and score. Uncheck **Use local AI** on the home screen to play with manual scoring.

## Run locally

From the repository root with Node.js 24 or newer installed, run:

```sh
npm ci
npm run dev
```

Open [Virtual Quiz Bowl](http://127.0.0.1:52741/). The game uses a dedicated local port so its browser storage and service-worker scope stay separate from other games.

For a production build, run `npm run build` and serve `web/dist/`, or run `npm run preview` and open the [local build preview](http://127.0.0.1:52742/). Run the game-rule tests with `npm test`.

## Local AI on Windows

Use Python 3.13, an NVIDIA GPU with a CUDA 12-compatible driver, and a running [Ollama for Windows](https://ollama.com/download/windows). Run these commands once from the repository root in PowerShell. The downloads include CUDA inference libraries, Whisper large-v3-turbo weights and the local Ollama judge.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r api/requirements.txt
.\.venv\Scripts\python.exe -m api.prepare
ollama pull deepseek-r1:7b
```

With Ollama running, start the local API in a separate terminal before playing:

```powershell
.\.venv\Scripts\python.exe -m uvicorn api.server:app --host 127.0.0.1 --port 52743
```

Both Vite development and preview forward `/api` to that loopback service. The default judge is `deepseek-r1:7b`. Set `VQB_OLLAMA_MODEL` before starting the API to use another installed local model. `VQB_WHISPER_MODEL` accepts a local faster-whisper model directory. The API performs transcription on CUDA and keeps the model loaded between questions. Run its tests with `.\.venv\Scripts\python.exe -m unittest api.test_answers`.

Press **Play** and grant microphone access. The mic track is disabled until a valid buzz. Pausing suspends capture and preserves the remaining time. Clips are processed in memory on the PC. Exact answers and aliases receive immediate credit after transcription. Ollama checks other phrasing against the question and answer key. If processing fails, retry the same clip or choose manual grading for that question.

## Play a round

Open **Settings** from the home screen or pause menu to set narration volume and preview the voices your browser offers. Your choices are saved in this browser. The speaker button toggles mute immediately and restores your previous volume when unmuted. While muted, words highlight silently before the buzz window opens.

| Key | Button | When to use it |
| --- | --- | --- |
| A | Buzz in | Within five seconds after the host finishes. Buzzing starts a fresh five-second answer window. |
| R | Submit answer / Reveal answer | Finish recording early in AI mode, or reveal the key in manual mode. Before buzzing, **Reveal & pass** forfeits the question. |
| C / I | Correct / Incorrect | Mark an answer when using manual grading. Correct earns five points. |
| N | Next question / View results | After scoring, advance to the next question or the final score. |

At the answer deadline, the recording ends and the game checks the answer. The first verdict can take longer while the GPU libraries and judge load. Judging time is outside both clocks. Missing the buzzer scores zero and counts as **Never buzzed**. Open Menu to pause or quit. If narration is unavailable, choose **I've read it** to start the buzzer clock yourself.
