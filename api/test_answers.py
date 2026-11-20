import io
import json
import unittest
import wave
from unittest.mock import patch

from . import inference


class AnswerTests(unittest.TestCase):
    key = inference.Key(question="Which mountain?", answer="Mount Whitney", aliases=["Whitney"])

    def test_alias_and_silence(self):
        with patch.object(inference, "ollama", side_effect=AssertionError("unexpected model call")):
            self.assertTrue(inference.judge(self.key, " WHITNEY. ").correct)
            self.assertFalse(inference.judge(self.key, "").correct)

    def test_model_judges_ambiguous_phrasing(self):
        for answer, correct in [("It was Mount Whitney, I think", True), ("the Sierra Nevada", False)]:
            with patch.object(inference, "ollama", return_value={"message": {"content": json.dumps({"correct": correct})}}) as chat:
                result = inference.judge(self.key, answer)
                self.assertEqual(result.correct, correct)
                self.assertEqual(result.transcript, answer)
                prompt = json.loads(chat.call_args.args[1]["messages"][1]["content"])
                self.assertEqual(prompt["aliases"], ["Whitney"])
                self.assertEqual(prompt["player_reply"], answer)

    def test_invalid_model_response_is_retryable(self):
        with patch.object(inference, "ollama", return_value={"message": {"content": '{"correct":"false"}'}}):
            with self.assertRaises(inference.NotReady):
                inference.judge(self.key, "Perhaps another mountain")

    def test_remote_judge_rejected_before_sending_transcript(self):
        with patch.object(inference, "ollama", return_value={"remote_host": "remote"}) as call:
            with self.assertRaises(inference.NotReady):
                inference.judge(self.key, "I think it was Whitney")
            call.assert_called_once_with("show", {"model": inference.OLLAMA_MODEL}, timeout=10)

    def test_audio_limit_and_invalid_clip(self):
        wav = io.BytesIO()
        with wave.open(wav, "wb") as output:
            output.setparams((1, 2, 44100, 0, "NONE", "not compressed"))
            output.writeframes(bytes(44100 * 2 * 7))
        self.assertEqual(len(inference.decode_clip(wav.getvalue())), inference.MAX_SAMPLES)
        with self.assertRaises(inference.BadClip):
            inference.decode_clip(b"broken recording")
