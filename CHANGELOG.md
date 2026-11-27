# Changelog

## Unreleased

- Added a 30-question comparator benchmark and asked the judge to require exact proper names, titles or listed aliases. The benchmark credits an unambiguous doubled letter in a spelled name and compares four local judges on the same replies.

- Added reusable question sets from the microphone, Whisper context and spelling-boundary experiments to the [spoken-answer benchmarks](benchmarks/spoken-answers/README.md).

- Players can spell a trivia answer aloud. When the transcript shows space-separated letters, the judge is asked to allow up to two letter errors if the intended answer is clear.
- For space-separated letters, the judge checks for a plausible different answer before allowing a spelling slip, even when the two names are only one or two letters apart.

- Kokoro voices highlight the word being spoken, including years and model names. Each question’s word timings are prepared with its audio.

- Kokoro uses NVIDIA acceleration when available and falls back to CPU. A round prepares its opening question on a loading screen and gets the next voice clip ready during play.
- Kokoro’s Liam is the default host. In Settings, preview and choose voices from Kokoro, Qwen3-TTS, Kyutai Pocket TTS, Piper, or your browser.

- Added four 20-question automotive sets for casual car enthusiasts, covering Corvettes, supercars, Chinese electric cars, and a general automotive smorgasbord.
- Home Settings now offers 22 round sounds. Each dropdown shows up to four sounds at a time and scrolls to the rest. Play a sound to preview it, then click its name to select it. New players start with Arcade select, Menu confirmation, Falling synth, and Last-life alert.

- Switched the default Ollama judge to Phi-4 Mini for faster spoken-answer verdicts.
- Browse built-in trivia sets by category from the home screen. Science includes Astronomy and Geology, with a new 10-question geology pack, *Written in Stone*.
- Added two looping home-menu tracks. Each visit picks one at random, and Settings now has a separate music volume control.
- The host now reads each trivia question in one continuous sentence. Voices that report word positions still highlight each word as they speak.
- Limited the trivia judge to 768 generated tokens per answer. If it reaches the limit or times out, the game explains what happened and offers manual scoring.
- Added four 20-question automotive trivia sets covering production cars, workshop know-how, motorsport, and car culture. All four are available in the home screen's question-set picker.
- Updated the trivia judge to reject conflicting guesses and changes of answer while accepting correct replies with hesitation or casual phrasing.
- Added a 20-case [spoken-answer benchmark](benchmarks/spoken-answers/README.md) comparing the current GPU setup with a smaller CPU-only setup.
- Clarified how the trivia judge handles shortened names, aliases, and filler words in spoken answers.
- Added local AI scoring with five-second microphone capture, CUDA Whisper transcription, accepted aliases, and Ollama judging. The result shows what the game heard. Manual scoring remains available.
- Added audio settings on the home and pause screens, including voice preview, saved volume and voice choices, and quick mute during play.
- Assigned dedicated local ports to Virtual Quiz Bowl so the development game and build preview have predictable browser addresses.
- Added playable single-player trivia with browser narration, independent buzz and answer clocks, manual grading, keyboard and button controls, pause, and final stats.
- Added four medium-difficulty mixed trivia packs with eight distinct questions each, available from the home screen alongside JSON import.
- Defined the trivia JSON format, added a skill for authoring questions and spoken answers, and included *The Night Sky*, an eight-question sample set.
- Added a UI design pack with mockups for set selection, the trivia round, the pause menu, and final stats.
- Added a tech stack overview for the planned browser app, local speech recognition, and answer judging.
- Documented single-player trivia, its separate five-second buzz and answer windows, and the scoring planned for quiz bowl.
- Added the game overview and a shared workflow for contributors.
