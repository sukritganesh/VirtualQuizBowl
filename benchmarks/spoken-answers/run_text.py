"""Replay labeled transcripts through the game's local judge, without a microphone."""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from api import inference


def run(path):
    cases = json.loads(path.read_text(encoding="utf-8"))
    counts = Counter()
    print(f"Model: {inference.OLLAMA_MODEL} | Cases: {path.name}", flush=True)
    for case in cases:
        key = inference.Key(question=case["question"], answer=case["answer"], aliases=case["aliases"])
        try:
            correct = inference.judge(key, case["reply"]).correct
            if case["expected"]:
                outcome = "TP" if correct else "FN"
            else:
                outcome = "FP" if correct else "TN"
            detail = ""
        except inference.NotReady as exc:
            outcome, detail = "unscored", f" ({exc})"
        counts[outcome] += 1
        print(f"{case['id']:2}  {outcome:8} {case['feature']}{detail}", flush=True)
    print(f"{counts['TP'] + counts['TN']}/{len(cases)} correct | "
          f"TP {counts['TP']}, TN {counts['TN']}, FP {counts['FP']}, FN {counts['FN']}, "
          f"unscored {counts['unscored']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cases", type=Path, nargs="?", default=HERE / "spelling.json")
    run(parser.parse_args().cases)
