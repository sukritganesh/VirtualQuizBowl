# Virtual Quiz Bowl

Virtual Quiz Bowl is an interactive buzzer trivia game with an AI host. The first version is single-player trivia. From the home screen, the player loads a JSON trivia set and hears one short question at a time.

## A trivia round

1. The buzzer stays locked while the host reads. When the host finishes, the player has five seconds to buzz. If the window expires, the question ends with zero points.
2. Buzzing gives the player a fresh five seconds to say their entire answer, even if they buzz at the last moment.
3. The game shows what it heard and whether the reply identifies the answer. For example, "Whitney" counts for Mount Whitney, while "Sierra Nevada" names the range.
4. A correct answer earns five points. An incorrect answer or silence earns zero. The time it takes to judge the answer is outside both timers.

## Planned quiz bowl mode

Quiz bowl uses its own JSON sets with longer, progressively revealing questions. The player can interrupt the host by buzzing during a clue. Each question marks its early-buzz cutoff. A correct answer earns 20 points for a buzz before that cutoff, 10 from the cutoff until narration ends, or 5 during the five-second window after narration. Every valid buzz gives the player five full seconds to speak. A wrong or unanswered question earns zero.
