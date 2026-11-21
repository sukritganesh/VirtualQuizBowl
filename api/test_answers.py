import io
import json
import unittest
import wave
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from fastapi import HTTPException, UploadFile

from . import inference, server


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
                payload = chat.call_args.args[1]
                self.assertEqual(payload["options"]["num_predict"], 768)
                self.assertNotEqual(payload.get("think"), False)
                prompt = json.loads(payload["messages"][1]["content"])
                self.assertEqual(prompt["aliases"], ["Whitney"])
                self.assertEqual(prompt["player_reply"], answer)

    def test_phi_receives_both_parts_of_an_explicit_correction(self):
        key = inference.Key(question="Which Honda compact car comes in a Type R version?",
                            answer="Honda Civic", aliases=["Civic"])
        for transcript in ("Camry No Weight Correction Honda Civic", "Camry, no, wait. Correction, Honda Civic"):
            with (
                self.subTest(transcript=transcript),
                patch.object(inference, "OLLAMA_MODEL", inference.DEFAULT_OLLAMA_MODEL),
                patch.object(inference, "ollama", return_value={"message": {"content": '{"correct":false}'}}) as chat,
            ):
                verdict = inference.judge(key, transcript)
                self.assertFalse(verdict.correct)
                self.assertEqual(verdict.transcript, transcript)
                payload = json.loads(chat.call_args.args[1]["messages"][1]["content"])
                self.assertEqual(payload, {**key.model_dump(), "first_part": "Camry", "second_part": "Honda Civic"})

        transcript = "Camry, no wait, Honda Civic"
        with patch.object(inference, "OLLAMA_MODEL", "deepseek-r1:7b"):
            payload = json.loads(inference.judge_messages(key, transcript)[1]["content"])
            self.assertEqual(payload, {**key.model_dump(), "player_reply": transcript})

    def test_phi_receives_every_guess_when_player_corrects_twice(self):
        transcript = "Whitney, no wait, Shasta, no wait, Mount Whitney."
        with patch.object(inference, "OLLAMA_MODEL", inference.DEFAULT_OLLAMA_MODEL):
            payload = json.loads(inference.judge_messages(self.key, transcript)[1]["content"])
            self.assertEqual(payload["reply_parts"], ["Whitney", "Shasta", "Mount Whitney."])

    def test_invalid_model_response_is_retryable(self):
        with patch.object(inference, "ollama", return_value={"message": {"content": '{"correct":"false"}'}}):
            with self.assertRaises(inference.NotReady):
                inference.judge(self.key, "Perhaps another mountain")

    def test_length_stop_never_scores_even_if_the_partial_json_looks_valid(self):
        for content in ("", '{"correct":', '{"correct":true}'):
            with self.subTest(content=content), patch.object(inference, "ollama", side_effect=[
                {}, {"done_reason": "length", "message": {"content": content}},
            ]):
                with self.assertRaisesRegex(inference.NotReady, "judge couldn't finish within its token limit"):
                    inference.judge(self.key, "I think it was Whitney")

    def test_timeout_offers_manual_scoring_for_this_answer(self):
        for timeout in (TimeoutError(), URLError(TimeoutError()), HTTPError("local", 504, "Timed out", None, None)):
            with (
                self.subTest(timeout=type(timeout)),
                patch.object(inference, "transcribe", return_value="I think it was Whitney"),
                patch.object(inference, "check_local_judge"),
                patch.object(inference, "build_opener") as opener,
            ):
                opener.return_value.open.side_effect = timeout
                with self.assertRaises(HTTPException) as raised:
                    server.grade(UploadFile(io.BytesIO()), self.key.model_dump_json())
                self.assertEqual(raised.exception.status_code, 504)
                self.assertIn("judge couldn't finish in time", raised.exception.detail)

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
