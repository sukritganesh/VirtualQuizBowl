---
name: trivia-questions
description: Create, extend, or review a named JSON question set for Virtual Quiz Bowl's single-player trivia mode. Use when a player asks for a trivia set by count, category, or free-form brief.
---

# Write a trivia question set

## Turn the prompt into a set

Use the requested question count and category. Honor the rest of the prompt as an editorial brief: it can specify an audience, subtopics, exclusions, difficulty, progression, a theme, or an exact number of trick questions. A supplied set name becomes the title. Otherwise, choose a short name that tells a player what they are about to play.

For “10 simple geography questions,” write ten approachable geography questions. For “10 high-school geography questions about countries and capitals, getting harder, with two trick questions,” plan ten slots in play order, cover only countries and capitals, and reserve exactly two slots for fair surprises. A fair trick exploits a plausible misconception and has one defensible answer. For instance, asking for Australia's capital works because Canberra is unambiguous even when Sydney comes to mind. Apply these choices only when the prompt calls for them.

## Write for the ear

- Write each question as **one interrogative sentence of 1–25 words**, ending in a question mark. Use a single space between words. Count contractions, hyphenated words, and numerals as one word each. Read the line aloud to catch awkward phrasing, clues that require seeing a spelling, or two questions joined together.
- Ask for a specific person, place, thing, or value that a player can say in five seconds. For “largest,” name the measure when it matters. For changing facts, anchor the date or choose a stable clue. Verify the keyed fact and any less familiar alternate names against a reliable source.
- Give the scoreboard one concise canonical `answer`. Use `aliases` for other spoken names that identify the same answer in context. “Whitney” works when the question explicitly asks for a mountain. “Sierra Nevada” names its range and would award credit for a different thing. If two different answers fit the clue, revise the question.
- Case and surrounding punctuation are normalized by the planned judge. Spend alias entries on meaningful variations such as a common short name, a translated name, or a number in words. The judge can handle conversational filler.

## JSON format and storage

Save one UTF-8 JSON object per file under the tracked `sets/trivia/` directory. Put it in the directory where players should find it. Each directory is a category in the set browser, so `science/geology/` appears as Science → Geology. Use descriptive directory names with hyphens between words. The JSON `title` names the set, `category` labels it during play, and the `questions` array sets the play order.

```json
{
  "mode": "trivia",
  "title": "Mountain Geography",
  "category": "Geography",
  "questions": [
    {
      "id": "highest-contiguous-us",
      "question": "What is the highest mountain in the contiguous United States?",
      "answer": "Mount Whitney",
      "aliases": ["Whitney", "Mt. Whitney"]
    }
  ]
}
```

Every set needs `mode` equal to `"trivia"`, a nonblank `title`, and at least one question. Include `category` whenever the brief names one. Each question needs a stable, nonblank string `id` unique within its set, the `question`, and a nonblank `answer`. The optional `aliases` array contains distinct, nonblank strings and defaults to empty. Keep existing IDs when editing or reordering a set.

Before handing it over, validate the JSON against the [trivia set schema](../../../schemas/trivia-set.schema.json). Check IDs for uniqueness, read each question as one sentence, and reconcile the final count, order, and any requested quotas with the brief. Review repeated clues and answers for unintended giveaways. The [eight-question astronomy set](../../../sets/trivia/science/astronomy/the-night-sky.json) shows how a finished file reads.
