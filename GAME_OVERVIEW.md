# Virtual Quiz Bowl

Virtual Quiz Bowl is an interactive buzzer trivia game with an AI host. The first version is single-player trivia. From the home screen, the player loads a JSON trivia set and hears one short question at a time.

Try [The Night Sky](sets/trivia/astronomy/the-night-sky.json) for an eight-question round. To make another set, follow the [trivia question authoring skill](.agents/skills/trivia-questions/SKILL.md).

## A trivia round

The home screen and pause menu both offer audio settings. Players can preview a host voice, adjust volume, or mute directly from the home screen or round. While muted, the question highlights silently before the buzzer opens.

1. The buzzer stays locked while the host reads. When the host finishes, the player has five seconds to buzz. If the window expires, the question ends with zero points.
2. Buzzing gives the player a fresh five seconds to say their entire answer, even if they buzz at the last moment.
3. When the answer window ends, the game reveals the key. Press R to reveal it earlier. Revealing before buzzing counts as a pass. A missed buzz also reveals the answer.
4. After buzzing, compare your reply with the key and mark it correct (C) or incorrect (I). Correct earns five points. Wrong answers, silence, and missed buzzes earn zero. Manual judging takes place outside both timers.

The player can pause the round from the menu, resume it, or quit and discard the session. Each round action has a button and a shortcut. A buzzes in and N advances after a verdict. The final screen shows total points and counts of correct answers, wrong answers, and questions where the player never buzzed.

## Planned quiz bowl mode

Quiz bowl uses its own JSON sets with longer, progressively revealing questions. The player can interrupt the host by buzzing during a clue. Each question marks its early-buzz cutoff. A correct answer earns 20 points for a buzz before that cutoff, 10 from the cutoff until narration ends, or 5 during the five-second window after narration. Every valid buzz gives the player five full seconds to speak. A wrong or unanswered question earns zero.
