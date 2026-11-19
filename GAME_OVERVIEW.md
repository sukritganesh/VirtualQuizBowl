# Virtual Quiz Bowl

Virtual Quiz Bowl is an interactive buzzer trivia game with an AI host. The host reads a question aloud, and the player decides when they know enough to buzz in.

1. The player listens and can buzz at any point, even halfway through a clue.
2. The buzz immediately stops the host's voice and opens the microphone for the player's answer.
3. Local, open-source speech recognition transcribes the answer. A local language model helps judge whether the player's words identify the answer in the question's key.
4. A correct answer wins the question. An incorrect answer loses it.

For example, if a question asks for a mountain and the answer is Mount Whitney, "Whitney" counts. "Sierra Nevada" names the mountain range, so it loses the question.
