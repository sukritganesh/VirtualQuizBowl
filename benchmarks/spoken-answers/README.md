# Spoken trivia benchmark

Use the [30-question comparator benchmark](comparator.json) as the default for comparing judges and prompt changes. It contains 16 new questions and 14 drawn from the earlier suites. Eight of the 15 ordinary spoken replies and seven of the 15 spelled replies deserve credit. Each row supplies a fixed transcript, and all 30 go through the model in the game's normal scoring path.

Start Ollama and run the default benchmark from the repository root. The runner prints each verdict against its label and counts false positives, false negatives and unscored cases.

```powershell
.\.venv\Scripts\python.exe benchmarks/spoken-answers/run_text.py --warm-up
```

To replay the same transcripts with another installed judge, set the model for the runner's PowerShell session.

```powershell
$env:VQB_OLLAMA_MODEL = 'phi4-mini:3.8b'
.\.venv\Scripts\python.exe benchmarks/spoken-answers/run_text.py --warm-up
```

### Proper names and spelling

A proper name or title must match the key or a listed alias, including each letter when spelled aloud. Case 8 rejects “N I N T E N D D O” for the extra D in Nintendo. Case 1 rejects the singular *Field of Dream*. Surrounding words can provide context, as in “Charlie Brown’s dog? Snoopy, for sure.”

A false positive awards credit to an invalid reply, and a false negative denies credit to a valid reply. An unscored reply receives no verdict and is counted separately.

### Local judges on the same 30 replies

Each judge graded the same 30 transcripts through the game at `18f022c` (PR #25). The table scores the saved verdicts against the exact-spelling rule, with 15 valid and 15 invalid replies. The game splits explicit corrections into parts for Phi and sends the full reply to each other judge. All four used temperature 0, a 4,096-token context and a 768-token generation limit.

The timings cover one warm pass per model on an RTX 4090 Laptop GPU with Ollama 0.40.16. Each model fit entirely in VRAM. The median and 95th percentile cover all 30 attempts, including the game's model-availability check. Recording, transcription and the initial model load are excluded.

| Judge | “Field of Dream” | Doubled-D Nintendo | Valid accepted | Wrong rejected | Correct | Median | 95th percentile |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Phi-4 Mini 3.8B | Accepted | Accepted | 15/15 | 10/15 | 25/30 | 355 ms | 622 ms |
| Qwen3 4B Instruct | Rejected | Rejected | 15/15 | 14/15 | 29/30 | 359 ms | 1,081 ms |
| Qwen2.5 1.5B | Rejected | Rejected | 4/15 | 15/15 | 19/30 | 194 ms | 228 ms |
| DeepSeek R1 7B | Rejected | Rejected | 12/15 | 9/15 | 21/30 | 32.11 s | 62.70 s |

Qwen3 rejected four wrong answers that Phi credited. They were the singular film title, the extra D in Nintendo, *Titania* for *Titan*, and *Scramble* for *Scrabble*. Qwen3’s only error was giving credit for the unfinished “O T T” for Ottawa. The smaller Qwen rejected all 15 wrong answers and 11 valid ones, including the exact spelled surname “M O Z A R T.”

DeepSeek correctly rejected the Nintendo misspelling and denied credit for the valid “Charlie Brown's dog? Snoopy, for sure.” It reached the token limit on six other replies (cases 5, 11, 14, 21, 22 and 26). Two of the six deserved credit. The other three models returned verdicts on all 30 replies.

In a separate Chrome game with synthesized microphone input, Whisper transcribed “My guess is Field of Dream.” and “n-i-n-t-e-n-d-d-o”. Phi awarded five points for each. Both the missing S and the extra D survived transcription.

With Qwen3 4B Instruct set as the default, a fresh run reproduced all 30 Qwen verdicts at a 432 ms median. In Chrome, the new default scored “My guess is Field of Dream.” zero and “I think it was hidden figures.” five points.

In a separate pass, the last prompt sentence explicitly allowed one accidental doubled letter in an otherwise exact spelled name. Both Qwen models gave the same 30 verdicts as before. Phi still accepted the Nintendo misspelling and also credited *Manet* for *Monet* and *ROM* for *RAM*, dropping from 25/30 to 23/30. DeepSeek scored 23/30 with one unscored reply. It began crediting the singular film title and still rejected the Nintendo misspelling.

### Qwen3.5 9B and the output limit

On the same 30 replies with the game's 768-token output cap, Qwen3.5 9B with thinking enabled returned 22 correct verdicts and hit the token limit on eight replies. With thinking disabled it returned all 30 verdicts, scoring 27/30. The 4B Instruct judge scored 29/30 in that comparison.

Only the eight unfinished replies were retried with a 1,536-token cap. Four finished correctly, including sodium at 770 generated tokens, *Hidden Figures* at 806 and the Nintendo rejection at 1,034. Cases 10 (fusion), 13 (Istanbul), 28 (flamingo) and 29 (egg yolk and white) reached the separate 90-second request timeout. For those requests the game received neither a verdict nor a final token count.

### Earlier Phi-4 Mini prompt comparison

The table uses the saved verdicts from before and after PR #25, scored with the corrected Nintendo label.

| Phi-4 Mini on the same 30 transcripts | Original prompt | With the proper-name sentence |
| --- | ---: | ---: |
| Correct verdicts | 25/30 | 25/30 |
| Valid answers accepted | 15/15 | 15/15 |
| Wrong answers rejected | 10/15 | 10/15 |
| False positives / false negatives / unscored | 5 / 0 / 0 | 5 / 0 / 0 |

Both prompts rejected *Manet* for *Monet* and accepted the exact title *Hidden Figures* in a longer reply. Both incorrectly awarded credit on the same five cases.

| Case | Key | Reply that received credit |
| --- | --- | --- |
| 1 | Field of Dreams | “Field of Dream, I think. The one with Kevin Costner.” |
| 8 | Nintendo | “Let me spell that one. N I N T E N D D O.” |
| 14 | Titan | “I'm going with T I T A N I A.” |
| 24 | Ottawa | “O T T ... that's all I can remember.” |
| 30 | Scrabble | “Is it Scramble? S C R A M B L E.” |

The comparison used local `phi4-mini:3.8b` (digest `78fad5d182a7`), Ollama 0.40.16 and the production judging options. The baseline was `56a3f12` and the proper-name sentence was in `aa990c3`. Each pass started with an unrelated warm-up. A repeat of the proper-name sentence reproduced all 30 verdicts. Additional wording trials used separate questions. One alternative sentence with a title example scored 24/30, additionally accepting the three extra letters in *flamingo*. The earlier spelling instructions already named Manet and Monet.

In a browser round with synthesized microphone input, Whisper returned “My guess is Field of Dream.” The judge awarded five points even though the transcript preserved the singular. The same round correctly awarded credit for “I think it was hidden figures.”

## Earlier question sets

| Set | Cases | What it tests |
| --- | ---: | --- |
| [Original model comparison](cases.json) | 20 | Filler, aliases, changed guesses and abstentions across two speech recognition and judging setups. |
| [Spelled answers](spelling.json) | 20 | Spelled-out adaptations of original replies and additional spelling challenges. |
| [Closely spelled alternatives](spelled-alternatives.json) | 15 | A near miss that identifies another answer versus an unambiguous typo. |
| [Spelling boundaries](spelling-boundaries.json) | 13 | Ten cases from the spelling-scope experiment, plus three additional cases from the spelling-limit trials. Includes Iran versus Iraq and two versus three extra letters in *flamingo*. |
| [Microphone answers](microphone-answers.json) | 8 | Six intended correct replies and two deliberately wrong ones, in recorder order. Say “Manet” for Monet and “silicon” for silicone. |
| [Whisper question context](whisper-context.json) | 17 | The scripted replies to four questions from the synthetic speech experiment, including wrong answers and abstentions. Each phrase appears once per question across voices and noise conditions. |

Each row has a question, answer key, accepted aliases, scripted reply and expected verdict. For a speech comparison, record or synthesize the **reply** once and give each model the same clip. The expected verdict describes the scripted reply. Compare the transcript to what was said to measure recognition separately. The original synthetic experiment also included silence and noise-only audio controls.

To compare judges on the written replies, pass any of these files to the existing runner with Ollama running. For example, from the repository root on Windows run

```powershell
.\.venv\Scripts\python.exe benchmarks/spoken-answers/run_text.py benchmarks/spoken-answers/spelling-boundaries.json --warm-up
```

## Spelling answers aloud

The [spelling benchmark](spelling.json) has ten spelled-out adaptations of questions from the original model comparison and ten new cases. Each adaptation retains its original question, key, aliases, and expected verdict. Its `source_case` points to the original case ID. The new cases include a transposed pair of letters, an omitted letter, an ambiguous prefix, a different acronym, and guesses changed or repeated across corrections. Ten replies should earn credit and ten should score zero.

On November 21, 2026, the local Phi-4 Mini judge (`phi4-mini:3.8b`) produced these verdicts for the spelling rule merged in PR #21. Both runs used the game's normal grading path with the same 20 written transcripts. The labels were fixed before comparing prompt wording. These examples were also used to select that wording.

| On the spelling benchmark | Previous prompt (`988ed3f`) | Revised prompt |
| --- | ---: | ---: |
| Correct verdicts | 12/20 | 16/20 |
| Valid replies awarded credit | 9/10 | 9/10 |
| Wrong replies rejected | 3/10 | 7/10 |
| False positives | 7 | 3 |
| False negatives | 1 | 1 |

The revised prompt rejected “V E N U S or Mercury,” spelled XPeng for Xiaomi, spelled Kyoto for Tokyo, and Paris → Lyon → Paris. These previously earned credit. Both prompts accepted “I think it’s X I A O M I” and “F R A N K E N S T I E N.” Both rejected “Show me.”

The three false positives were Manet for Monet (8), ROM for RAM (16), and the unfinished “A U S T R” (17). Both prompts rejected the valid “Samuel, last name C L E M E N S” for Mark Twain (9). Both scored 20/20 on the original written replies and 20/20 on the saved Whisper transcripts from the earlier model comparison.

To replay the spelling cases using the installed game judge, start Ollama and run this from the repository root. The optional argument accepts another case file, including `benchmarks/spoken-answers/cases.json`. Each row reports its verdict against the label. Service failures are reported as unscored.

```powershell
.\.venv\Scripts\python.exe benchmarks/spoken-answers/run_text.py benchmarks/spoken-answers/spelling.json
```

## When the letters spell a different answer

The [15 close-spelling cases](spelled-alternatives.json) cover eight subjects. Eight replies spell a different real answer within two letter edits of the key. Five contain an unambiguous typo and two spell a valid alias exactly. Seven questions pair a wrong answer with a valid spelling using the same lead-in. The labels were set before the comparison. The new prompt sentence was chosen using the earlier spelling examples, including Manet for Monet.

Phi-4 Mini scored **9/15 with either prompt**. Both accepted six of seven valid replies and rejected three of eight wrong ones. All 15 verdicts stayed the same across four passes per prompt. The five false positives were distinct writers, countries, hydrocarbons, moons and nuclear processes. The false negative was one substituted letter in *violin*.

| Key or alias | Letters in the reply | Expected | Both judges | Previous median (ms) | Revised median (ms) |
|---|---|---|---|---:|---:|
| Austen | A U D E N | Reject | **Accept** | 237 | 249 |
| Titan | T I T A A N | Accept | Accept | 239 | 250 |
| TCP | U D P | Reject | Reject | 243 | 262 |
| Fusion | F U I S O N | Accept | Accept | 246 | 250 |
| Niger | N I G E R I A | Reject | **Accept** | 246 | 238 |
| Austen | A U S T T E N | Accept | Accept | 250 | 238 |
| Violin | V I O L A | Reject | Reject | 286 | 286 |
| TCP | T C P | Accept | Accept | 263 | 262 |
| Ethene | E T H A N E | Reject | **Accept** | 262 | 282 |
| Niger | N I G R | Accept | Accept | 267 | 286 |
| Titan | T I T A N I A | Reject | **Accept** | 235 | 239 |
| Violin | V I O L I M | Accept | **Reject** | 298 | 269 |
| Fusion | F I S S I O N | Reject | **Accept** | 268 | 270 |
| Ethene (ethylene) | E T H Y L E N E | Accept | Accept | 265 | 268 |
| Cosine | S I N E | Reject | Reject | 268 | 242 |

On the RTX 4090 Laptop GPU, the median time from transcript to verdict was **253 ms before and 252 ms after**. The 90th percentile was 298 ms before and 290 ms after. The revised prompt ranged from 172 to 334 ms. The elapsed time includes the game's model-availability check and Ollama response. Recording, Whisper transcription and initial model loading are outside this measurement.

On the earlier spelling set, the score rose from 16/20 to 18/20. The new sentence explicitly names Manet for Monet, and Phi now rejected both that example and ROM for RAM. It still accepted the unfinished “A U S T R” and rejected Samuel Clemens for Mark Twain. The original 20 written replies and their 20 saved Whisper transcripts both stayed at 20/20.

The local run used `phi4-mini:3.8b` (digest `78fad5d182a7`), Ollama 0.40.16 and the game's normal grading path. The baseline was `ef0b7cb`. Each prompt graded all 15 transcripts four times, alternating which prompt ran first in each pair of passes. Each pass started with a separate, untimed warm-up. All 120 timed replies reached the model and returned a verdict. This command repeats one warm pass with the checked-out prompt.

```powershell
.\.venv\Scripts\python.exe benchmarks/spoken-answers/run_text.py benchmarks/spoken-answers/spelled-alternatives.json --warm-up
```

### Check what the letters spell before allowing a typo

The next prompt revision made the order explicit for space-separated letters. Against main at `e6fdf10`, Phi-4 Mini went from 9/15 to 10/15 on the close-spelling cases. One verdict changed. It rejected “Uh, no wait, not sure, no wait, E T H A N E” for ethene. Four false positives remained (Auden, Nigeria, Titania and fission), along with one false negative (V I O L I M for violin). These cases were used to compare candidate wordings. The earlier spelling benchmark stayed at 18/20, and the original written replies and saved Whisper transcripts each stayed at 20/20.

In a Chrome round, Whisper transcribed the letters alone as “E-T-H-A-N-E” and Phi incorrectly awarded credit for ethene. Replaying the same letters with spaces also earned credit. With the benchmark's “no wait” lead-in, Phi rejected both versions. The lead-in selects the game's correction prompt.

## Follow-up on the judging rule

On November 20, the prompt explicitly distinguished changed guesses from hesitation and casual phrasing. With that edit, the default DeepSeek judge scored 18/20 on the written replies. It rejected the Camry correction and “Venus or Mercury” and accepted the hesitant Civic answer. Its two misses were rejecting the repeated name for China and awarding credit for a request to repeat the question. Qwen scored 12/20 and still rejected the hesitant Civic reply.

The default game also replayed four recordings through Whisper and the updated judge. It rejected the correction and the two-planet guess and accepted the hesitant Civic and Mozart replies.

## Baseline results

These verdicts and timings use the judge prompt from game commit `f936fcb`, before the explicit rule for changes of answer. The benchmark's `current` profile is pinned to DeepSeek R1 7B to reproduce the original GPU results. The game defaults to Qwen3 4B Instruct.

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
