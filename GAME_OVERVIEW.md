# Virtual Quiz Bowl

Virtual Quiz Bowl is an interactive buzzer trivia game with an AI host. The first version is single-player trivia. From the home screen, the player loads a JSON trivia set and hears one short question at a time.

On the home screen, open **Browse** to explore question sets by category, or choose **Import JSON** to play a local file. Under **Science → Astronomy**, try [The Night Sky](sets/trivia/science/astronomy/the-night-sky.json) for an eight-question round. To make another set, follow the [trivia question authoring skill](.agents/skills/trivia-questions/SKILL.md).

## A trivia round

Each visit to the home screen picks one of two music tracks at random and loops it until the round begins. Settings is available from home and the pause menu, with separate music and narration volumes. Under **Host voice**, the default is **Kokoro · Liam**. Play a model or voice to hear the same fox sentence, then select its name to use it in rounds. In home Settings, expand **Sound effects** and open a cue’s dropdown. Play any clip to hear it, then select its name to use it for a valid buzz, a verdict, or either clock expiring. Quick mute silences all game audio. With narration muted or set to zero, the question highlights silently before the buzzer opens.

When you press **Play**, the opening screen prepares the first local voice clip and, for AI scoring, gets the microphone ready. You can cancel and return to the selected set. During the round the host prepares one question ahead. Kokoro voices and supported browser voices underline the word being spoken. Earlier words stay red.

1. The host reads the whole question as one sentence. The buzzer stays locked until the host finishes, then the player has five seconds to buzz. If the window expires, the question ends with zero points.
2. Buzzing gives the player a fresh five seconds to say their entire answer, even if they buzz at the last moment.
3. In local AI play, the buzz starts a recording. The game stops it at the answer deadline or when the player presses R to submit early. It displays what it heard and compares the reply with the answer key. A missed buzz or an early pass skips recording.
4. Correct earns five points. Wrong answers, silence, and missed buzzes earn zero. Judging happens outside both timers. If the judge runs out of tokens or time, the question stays unscored. Choose **Mark manually** to see the answer and mark it correct or incorrect. Manual scoring is also available before a session.

Hesitation, filler words, and casual phrasing are fine when the player gives one clear answer. Players can spell an answer or alias aloud. Only when the transcript shows individual letters separated by spaces does the judge apply spelling tolerance. It first reads the letters as given. If they could identify another plausible answer in context, such as Manet for Monet, the guess earns zero. Otherwise it may allow up to two letter errors when the spelling clearly identifies the answer or an alias. Conflicting guesses or changing from one answer to another earn zero, even if the last guess is correct.

The player can pause the round from the menu, resume it, or quit and discard the session. Each round action has a button and a shortcut. A buzzes in and N advances after a verdict. The final screen shows total points and counts of correct answers, wrong answers, and questions where the player never buzzed.

## Planned quiz bowl mode

Quiz bowl uses its own JSON sets with longer, progressively revealing questions. The player can interrupt the host by buzzing during a clue. Each question marks its early-buzz cutoff. A correct answer earns 20 points for a buzz before that cutoff, 10 from the cutoff until narration ends, or 5 during the five-second window after narration. Every valid buzz gives the player five full seconds to speak. A wrong or unanswered question earns zero.
