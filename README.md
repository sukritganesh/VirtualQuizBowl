# Virtual Quiz Bowl

Play a single-player trivia set in your browser. Pick a built-in pack or import a [trivia JSON file](sets/trivia/astronomy/the-night-sky.json). The browser reads the questions aloud, and you mark your spoken answers yourself.

## Run locally

From the repository root with Node.js 24 or newer installed, run:

```sh
npm ci
npm run dev
```

Open [Virtual Quiz Bowl](http://127.0.0.1:52741/). The game uses a dedicated local port so its browser storage and service-worker scope stay separate from other games.

For a production build, run `npm run build` and serve `web/dist/`, or run `npm run preview` and open the [local build preview](http://127.0.0.1:52742/). Run the game-rule tests with `npm test`.

## Play a round

Open **Settings** from the home screen or pause menu to set narration volume and preview the voices your browser offers. Your choices are saved in this browser. The speaker button toggles mute immediately and restores your previous volume when unmuted. While muted, words highlight silently before the buzz window opens.

| Key | Button | When to use it |
| --- | --- | --- |
| A | Buzz in | Within five seconds after the host finishes. Buzzing starts a fresh five-second answer window. |
| R | Reveal answer | While answering, reveal the key early. During narration or before buzzing, **Reveal & pass** forfeits the question. |
| C / I | Correct / Incorrect | After revealing a buzzed answer, mark it once. Correct earns five points. |
| N | Next question / View results | After scoring, advance to the next question or the final score. |

When either clock expires, the answer appears automatically. Missing the buzzer scores zero and counts as **Never buzzed**. Open Menu to pause or quit. If narration is unavailable, choose **I've read it** to start the buzzer clock yourself. This version uses browser speech synthesis and manual grading. It needs no microphone, GPU, or model downloads.
