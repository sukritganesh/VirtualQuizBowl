# Changelog

## Unreleased

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
