"""Map Kokoro's timed pronunciation of a whole sentence back to its printed words."""
from difflib import SequenceMatcher
from functools import lru_cache


@lru_cache(maxsize=2)
def _phonemizer(language):
    # Kokoro initializes eSpeak in this single-threaded worker before we use it.
    from phonemizer.backend import EspeakBackend
    return EspeakBackend(language, preserve_punctuation=True, with_stress=True)


def word_starts_ms(text, language, marks):
    if not marks:
        return []
    words = text.split()
    pronunciations = _phonemizer(language).phonemize(words, strip=True)
    if len(pronunciations) != len(words):
        return []
    return align_words(pronunciations, marks)


def align_words(pronunciations, marks):
    # A printed word can expand (2020, V8), and two words can run together
    # ("for the"). Keep the printed word that owns each isolated phoneme, then
    # align those phonemes against the pronunciation actually used for synthesis.
    owners = []
    expected = []
    for index, pronunciation in enumerate(pronunciations):
        for phone in pronunciation:
            if not phone.isspace():
                owners.append(index)
                expected.append(phone)

    spoken = [mark for mark in marks if not mark.phoneme.isspace()]
    alignment = SequenceMatcher(None, expected, [mark.phoneme for mark in spoken], autojunk=False)
    starts = [None] * len(pronunciations)
    for operation, left, right, start, end in alignment.get_opcodes():
        if operation in ("delete", "insert"):
            continue
        for position in range(left, right):
            word = owners[position]
            if starts[word] is None:
                # Within a contextual pronunciation change, distribute only
                # the changed sounds across that change's actual timed span.
                timing = start + (position - left) * (end - start) // (right - left)
                starts[word] = round(spoken[timing].start * 1000)
    return starts
