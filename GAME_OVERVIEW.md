# Virtual Quiz Bowl

Virtual Quiz Bowl is an interactive buzzer trivia game with an AI host. The first version is single-player trivia. From the home screen, the player loads a JSON trivia set and hears one short question at a time.

Try [The Night Sky](sets/trivia/astronomy/the-night-sky.json) for an eight-question round. To make another set, follow the [trivia question authoring skill](.agents/skills/trivia-questions/SKILL.md).

## A trivia round

The home screen and pause menu both offer audio settings. Players can preview a host voice, adjust volume, or mute directly from the home screen or round. While muted, the question highlights silently before the buzzer opens.

1. The buzzer stays locked while the host reads. When the host finishes, the player has five seconds to buzz. If the window expires, the question ends with zero points.
2. Buzzing gives the player a fresh five seconds to say their entire answer, even if they buzz at the last moment.
3. In local AI play, the buzz starts a recording. The game stops it at the answer deadline or when the player presses R to submit early. It displays what it heard and compares the reply with the answer key. A missed buzz or an early pass skips recording.
4. Correct earns five points. Wrong answers, silence, and missed buzzes earn zero. Judging happens outside both timers. Players can also choose manual scoring before a session or after an AI error.

Hesitation, filler words, and casual phrasing are fine when the player gives one clear answer. Conflicting guesses or changing from one answer to another earn zero, even if the last guess is correct.

The player can pause the round from the menu, resume it, or quit and discard the session. Each round action has a button and a shortcut. A buzzes in and N advances after a verdict. The final screen shows total points and counts of correct answers, wrong answers, and questions where the player never buzzed.

## Planned quiz bowl mode

Quiz bowl uses its own JSON sets with longer, progressively revealing questions. The player can interrupt the host by buzzing during a clue. Each question marks its early-buzz cutoff. A correct answer earns 20 points for a buzz before that cutoff, 10 from the cutoff until narration ends, or 5 during the five-second window after narration. Every valid buzz gives the player five full seconds to speak. A wrong or unanswered question earns zero.
