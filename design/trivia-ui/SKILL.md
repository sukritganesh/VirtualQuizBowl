---
name: trivia-ui
description: Design or review Virtual Quiz Bowl screens using the shared visual language, layout, and interaction states in this UI pack. Apply when adding a page, mode, control, or round state.
---

# Virtual Quiz Bowl UI

Open the [screen preview](mockups/preview.html) locally. Its bottom toolbar lets you inspect frozen states, including the incorrect and missed-buzz outcomes. The toolbar belongs to the design viewer. Read the [game overview](../../GAME_OVERVIEW.md) for rules.

## Visual language

Build around one thing the player needs to see right now. On the home screen that is the set picker, during a round it is the question, and at the end it is the score. Keep the instrument-like detail in the margins: fine blue rules, a small three-bar signal mark, and compact labels. Leave generous empty space around the primary text.

| Role | Reference | Use |
| --- | --- | --- |
| Canvas and surface | Ink `#090F1C`, slate `#111C30` | Matte backgrounds, a restrained blue glow, and one raised surface for the pause dialog. |
| Text | White `#F3F6FC`, silver `#AEBCCE` | White for questions and actions, silver for supporting information. |
| Action | Blue `#245BDB`, ice `#A5C5FF` | Primary button, keyboard focus, active microphone and clock. |
| Points | Gold `#E7C47D` | Score, score delta, and occasional small details. |
| Narration | Red `#FF827F` | Spoken words accumulate in red. Underline the active word as a second cue. Reserve red for narration across the round. |

Use Inter or a clean system sans for the title, question, and controls. Use a system monospace with tabular digits for the timer, question count, and score. Let the question wrap naturally. Keep all its words visible from the start and change their styling in place as the host reads. The host speaks the question in one utterance. Highlight each word when the voice reports its position. If the voice supplies no word positions, turn the question red when the utterance ends.

## Screens

- **Home.** Pair the game title with one stylized buzzer. Keep the set picker and Play together. Play becomes available after a valid trivia JSON set is selected. Show the selected title, question count, and optional category before play. On a narrow display the controls come first and the illustration yields space.
- **Question sets.** Browse opens a compact modal at the top-level categories. Category rows show how many sets they contain and a chevron to go deeper. Pack rows show question counts and mark the current selection. The breadcrumb goes back to any ancestor. Choosing a pack returns to Home, while Close or Escape keeps the previous choice. Keep Import JSON on Home.
- **Round.** At the top left, place Menu first and the timer immediately beside it. Reserve the timer's width during narration. Keep points at the upper right. Put the question number and optional pack category above the prompt. Anchor feedback and the primary action in a strip below it. Long questions or small screens can scroll vertically.
- **Sound controls.** Put quick mute beside Settings on the home screen and beside Menu during a round. Settings has separate narration and music volume sliders, a voice selector, and a spoken preview. In home Settings, each round cue has a dropdown in the collapsed Sound effects section. Each option pairs a selectable name with its own preview button. Mark the current choice with a check. Escape closes an open dropdown first. Menu music continues in Settings opened from home and stops when a round begins. Back or Escape returns to the screen that opened it.
- **Pause.** The menu opens a modal over the current frame with Close (×), Settings, and Quit game. Keep the round paused throughout a visit to Settings. Closing the pause menu resumes in place. Freeze narration, highlight, and both clocks while paused. Quit discards the session and returns home.
- **Summary.** Give total points the largest type, with separate counts for Correct, Wrong, and Never buzzed. Count each completed question once. Silence after a buzz counts as wrong. Back to home returns to set selection.

## Round states

The home screen offers local AI scoring and manual scoring. In AI play, show **Recording answer** during the five-second window with **Submit answer (R)** to finish early. In manual play, show **Reveal answer (R)**, then the canonical answer, accepted aliases, and **Correct (C)** or **Incorrect (I)**. Before buzzing, label the reveal action **Reveal & pass** in both modes.

| State | What the player sees and can do |
| --- | --- |
| Reading | Full question in white, progressively turning red. The strip says “Host is reading” and the buzzer is disabled. |
| Buzz open | On successful narration end, the upper-left clock starts at 5 seconds and the strip offers Buzz in. Click, tap, or press A. A missed buzz ends the question for zero points. |
| Answering | A valid buzz starts a fresh 5 seconds. The clock label changes from Buzz to Answer. The strip prompts the player to speak. Pausing suspends both capture and countdown. |
| Judging | At the recording deadline the mic closes. Show “Checking answer” until the verdict arrives. If grading fails, offer to retry the clip or mark the answer manually. |
| Verdict | Show Correct, Incorrect, or Never buzzed, the point change and the keyed answer. For an AI verdict, show what the microphone heard. Click Next question or press N to advance. The final action reads View results. |

When extending the game, reuse these anchors, text roles, and state changes before adding another panel. Give each state an explicit label and keep keyboard focus visible. Move focus inside the pause dialog, contain it there, and restore it to Menu on close. Announce phase changes once for assistive technology. Let the complete question remain a single readable sentence regardless of individual word highlights.

## Reference frames

[Home](mockups/home.png) · [Reading](mockups/reading.png) · [Answering](mockups/answering.png) · [Paused](mockups/paused.png) · [Summary](mockups/summary.png)
