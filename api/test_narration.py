import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch

from pydantic import ValidationError
from . import narration
from .kokoro_timing import align_words


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

    def test_failed_cuda_render_retries_same_voice_and_stays_on_cpu(self):
        gpu, cpu = Mock(), Mock()
        gpu.sess.get_providers.return_value = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        gpu.create_timed.side_effect = RuntimeError("CUDA allocation failed")
        cpu.create_timed.return_value = ([0.5], 24000, ["timing"])
        with patch.object(narration, "_kokoro", gpu), patch.object(narration, "load_kokoro", return_value=cpu) as load:
            self.assertEqual(narration.kokoro_samples("First?", "am_liam", "en-us"), cpu.create_timed.return_value)
            narration.kokoro_samples("Second?", "am_liam", "en-us")
            load.assert_called_once_with(cpu_only=True)
            gpu.create_timed.assert_called_once_with("First?", voice="am_liam", lang="en-us")
            self.assertEqual(cpu.create_timed.call_args_list[0], gpu.create_timed.call_args)
            self.assertEqual(cpu.create_timed.call_count, 2)

    def test_expanded_joined_and_unspoken_words_keep_their_printed_indices(self):
        # The isolated forms of "for the V8" have different vowels and spacing.
        marks = [SimpleNamespace(phoneme=p, start=i / 10) for i, p in enumerate("fərðə vi eɪt")]
        self.assertEqual(align_words(["fɔr", "ðə", "", "vi eɪt"], marks), [0, 300, None, 600])
