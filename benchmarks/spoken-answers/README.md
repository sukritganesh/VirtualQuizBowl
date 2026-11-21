# Spoken trivia benchmark

Twenty English replies test when a contestant should get credit. The [cases](cases.json) give the full questions, answer keys, aliases, replies, and expected verdicts. Ten should earn credit. Ten should score zero. Case 3 follows the player's rule that naming a wrong car before correcting to the right one scores zero. Case 4 counts a manufacturer followed by the right model as a single answer.

## Follow-up on the judging rule

On November 20, the prompt explicitly distinguished changed guesses from hesitation and casual phrasing. With that edit, the default DeepSeek judge scored 18/20 on the written replies. It rejected the Camry correction and “Venus or Mercury” and accepted the hesitant Civic answer. Its two misses were rejecting the repeated name for China and awarding credit for a request to repeat the question. Qwen scored 12/20 and still rejected the hesitant Civic reply.

The default game also replayed four recordings through Whisper and the updated judge. It rejected the correction and the two-planet guess and accepted the hesitant Civic and Mozart replies.

## Baseline results

These verdicts and timings use the judge prompt from game commit `f936fcb`, before the explicit rule for changes of answer. The benchmark's `current` profile is pinned to DeepSeek R1 7B to reproduce the original GPU results. The game now defaults to Phi-4 Mini.

| Measured on this laptop | Current GPU setup | Smaller CPU setup |
|---|---:|---:|
| Correct verdicts on written replies | 18/20 | 12/20 |
| Correct verdicts from audio | 16/20 | 13/20 |
| Valid spoken replies awarded credit | 9/10 | 3/10 |
| Wrong spoken replies awarded credit | 3/10 | 0/10 |
| Median Whisper time per clip | 0.24 s | 17.72 s |
| Median scoring time on written replies | 4.92 s | 1.04 s |
| Median time from clip to verdict | 5.76 s | 18.87 s |
| Fastest–slowest clip to verdict | 0.23–14.36 s | 5.62–70.04 s |

DeepSeek accepted the incorrect first guess followed by a correction in case 3 and the two guesses in case 5, even on the original text. With speech input, it also accepted a request to repeat the question and rejected “N.A.” for sodium. It had accepted the written “N A.” In case 10, Turbo produced the digits “144,” which matched the answer key and skipped the judge. All 40 written-reply decisions and the other 39 speech-input decisions used Ollama.

Qwen rejected eight valid written replies and seven valid spoken replies. Both Whisper models heard “China People's Republic of China” in case 2. DeepSeek accepted it and Qwen rejected it. Qwen also rejected “The Bard of Avon” for Shakespeare and “Samuel Clemens” for Mark Twain with the intended names present in its transcripts.

Small.en matched the reference word sequence on 15 of 20 clips and Turbo on 14 of 20. This comparison ignores capitalization and punctuation and retains accents. It counts “144” and “a hundred and forty four” as different transcriptions even though both identify the right answer. Both judges finished all trials and returned valid decisions.

A separate workload was active during the CPU test. The four-thread CPU timings measure that run under load. They should be rechecked on an idle target laptop before choosing a default. See the raw [GPU results](current.json) and [CPU results](laptop.json) for timings, model digests, and transcripts.

## All 20 verdicts

Bold verdicts disagree with the expected outcome. Text columns use the written replies. Audio columns use the transcripts below.

| # | Player reply | Expected | GPU text | CPU text | GPU audio | CPU audio |
|---:|---|---|---|---|---|---|
| 1 | Uh is it Mozart | Accept | Accept | **Reject** | Accept | Accept |
| 2 | China Peoples Republic of China | Accept | Accept | **Reject** | Accept | **Reject** |
| 3 | Camry no wait correction Honda Civic | Reject | **Accept** | Reject | **Accept** | Reject |
| 4 | Honda uh is it the Civic | Accept | Accept | **Reject** | Accept | **Reject** |
| 5 | Venus or Mercury | Reject | **Accept** | Reject | **Accept** | Reject |
| 6 | I'm going with N A | Accept | Accept | **Reject** | **Reject** | **Reject** |
| 7 | Emily Brontë I think | Reject | Reject | Reject | Reject | Reject |
| 8 | The Pacific definitely | Accept | Accept | Accept | Accept | Accept |
| 9 | I can rule out New Zealand | Reject | Reject | Reject | Reject | Reject |
| 10 | A hundred and forty four | Accept | Accept | **Reject** | Accept | **Reject** |
| 11 | Nineteen forty I think | Reject | Reject | Reject | Reject | Reject |
| 12 | Manet spelled M A N E T | Reject | Reject | Reject | Reject | Reject |
| 13 | The Bard of Avon I think | Accept | Accept | **Reject** | Accept | **Reject** |
| 14 | Australia but I forget the city | Reject | Reject | Reject | Reject | Reject |
| 15 | I know him as Samuel Clemens | Accept | Accept | **Reject** | Accept | **Reject** |
| 16 | The Amazon rainforest | Reject | Reject | Reject | Reject | Reject |
| 17 | My guess is Kyoto | Reject | Reject | Reject | Reject | Reject |
| 18 | Van Gogh pretty sure | Accept | Accept | **Reject** | Accept | **Reject** |
| 19 | I think Apollo eleven | Accept | Accept | Accept | Accept | Accept |
| 20 | Could you repeat the question | Reject | Reject | Reject | **Accept** | Reject |

## What Whisper heard

| # | Turbo on GPU | Small English on CPU |
|---:|---|---|
| 1 | Uh, is it Mozart? | How is it Mozart? |
| 2 | China People's Republic of China | China People's Republic of China |
| 3 | Camry no weight correction Honda Civic | Camry no wait correction Honda Civic |
| 4 | Honda is at the Civic | Honda is at the Civic. |
| 5 | Venus or Mercury | Venus or Mercury. |
| 6 | I'm going with N.A. | I'm going with N A. |
| 7 | Emily Bronte, I think. | Emily Bronte, I think. |
| 8 | The Pacific definitely. | The Pacific definitely. |
| 9 | I can rule out New Zealand. | I can rule out New Zealand. |
| 10 | 144 | A hundred and forty four. |
| 11 | 1940 I think | 1940 I think. |
| 12 | Manet spelled M-A-N-E-T | Manet spelled m-a-n-e-t |
| 13 | The bard of Avon, I think. | The Bard of Avon, I think. |
| 14 | Australia but I forget the city. | Australia but I forget the city |
| 15 | I know him as Samuel Clemens. | I know him as Samuel Clemens. |
| 16 | The Amazon Rainforest | The Amazon rainforest. |
| 17 | My guess is Kyoto. | My guess is Kyoto. |
| 18 | Van Gogh pretty sure | Van Gogh pretty sure |
| 19 | I think Apollo 11. | I think Apollo 11 |
| 20 | Could you repeat the question? | Could you repeat the question? |

## Method

The baseline run took place on November 19, 2026.

The comparison used an Intel Core i9-13900H and an RTX 4090 Laptop GPU with 16 GiB of VRAM. The current profile used Whisper large-v3-turbo in CUDA FP16 and DeepSeek R1 7B in Ollama. The laptop profile used Whisper small.en in CPU INT8 and Qwen 2.5 1.5B on four CPU threads. The runner checked GPU placement through Ollama. Both profiles used the game's transcription settings, answer matcher, judge prompt, 4,096-token context, and temperature of zero.

Windows synthesized one recording per reply using the David and Zira desktop voices on alternating cases. Each clip contains 16 kHz mono PCM and trailing silence to fill the five-second answer window. Both profiles received identical audio. The first pass through each judge used the written replies. The second used that profile's Whisper transcripts. Each pass used the normal scoring path, including the exact-answer shortcut.

One unscored clip and one unrelated grading question warmed each profile. Timings are from one run per case and exclude model loading, speech synthesis, and the five-second recording window. Processing time adds each clip's transcription and scoring times before taking the median. The CPU measurements describe this laptop processor. Accents, background noise, microphones and lower-power processors can change the results.

## Reproduce the run on Windows

Start with the local AI setup in the [game README](../../README.md) and a running Ollama service. The additional speech bindings drive the offline Windows voices for the benchmark. From the repository root, run these commands in PowerShell.

```powershell
.\.venv\Scripts\python.exe -m pip install pywin32==312
ollama pull qwen2.5:1.5b
.\.venv\Scripts\python.exe -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-small.en', revision='d1d751a5f8271d482d14ca55d9e2deeebbae577f', local_dir='.models/small.en', allow_patterns=['config.json', 'model.bin', 'tokenizer.json', 'vocabulary.txt'])"
.\.venv\Scripts\python.exe benchmarks/spoken-answers/make_audio.py
.\.venv\Scripts\python.exe benchmarks/spoken-answers/run.py current
.\.venv\Scripts\python.exe benchmarks/spoken-answers/run.py laptop
```

The runner writes audio and per-case JSON under `scratch/spoken-answers/`. Each row includes the clip hash, actual transcript, both decisions, shortcut flags, and separate transcription and judging times. Model versions and judge memory placement are recorded with each run.
