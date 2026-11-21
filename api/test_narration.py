import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from pydantic import ValidationError
from . import narration


class NarrationTests(unittest.TestCase):
    def test_every_local_default_and_piper_speaker_is_selectable(self):
        for engine, model in narration.CATALOG.items():
            if engine != "browser":
                narration.SpeechRequest(engine=engine, voice=model["default"], text="Question?")
        for voice, speakers in narration.CATALOG["piper"]["speakers"].items():
            narration.SpeechRequest(engine="piper", voice=voice, speaker=len(speakers) - 1, text="Question?")

    def test_invalid_choices_are_rejected_before_running_an_engine(self):
        base = dict(engine="kokoro", voice="am_liam", text="Question?")
        for change in [dict(engine="browser"), dict(engine="missing"), dict(voice="../model"),
                       dict(speaker=1), dict(speaker=-1), dict(text="  ")]:
            with self.subTest(change=change), self.assertRaises(ValidationError):
                narration.SpeechRequest(**(base | change))

    def test_missing_model_reports_setup_before_starting_a_worker(self):
        with TemporaryDirectory() as temp, patch.object(narration, "MODELS", Path(temp)):
            with self.assertRaises(FileNotFoundError):
                narration.render("kokoro", "am_liam", 0, "Missing model?")
