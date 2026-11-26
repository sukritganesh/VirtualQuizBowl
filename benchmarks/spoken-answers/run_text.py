"""Replay labeled transcripts through the game's local judge, without a microphone."""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from statistics import median
from time import perf_counter

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from api import inference


def run(path, warm_up=False):
    cases = json.loads(path.read_text(encoding="utf-8"))
    counts = Counter()
    verdict_times = []
    print(f"Model: {inference.OLLAMA_MODEL} | Cases: {path.name}", flush=True)
    if warm_up:
        inference.judge(inference.Key(question="What color is fresh grass?", answer="Green"), "I think it's green.")
    for case in cases:
        key = inference.Key(question=case["question"], answer=case["answer"], aliases=case["aliases"])
        start = perf_counter()
        try:
            correct = inference.judge(key, case["reply"]).correct
            elapsed = perf_counter() - start
            verdict_times.append(elapsed)
            if case["expected"]:
                outcome = "TP" if correct else "FN"
            else:
                outcome = "FP" if correct else "TN"
            detail = ""
        except inference.NotReady as exc:
            elapsed = perf_counter() - start
            outcome, detail = "unscored", f" ({exc})"
        counts[outcome] += 1
        print(f"{case['id']:2}  {outcome:8} {elapsed:.3f} s  {case['feature']}{detail}", flush=True)
    print(f"{counts['TP'] + counts['TN']}/{len(cases)} correct | "
          f"TP {counts['TP']}, TN {counts['TN']}, FP {counts['FP']}, FN {counts['FN']}, "
          f"unscored {counts['unscored']}")
    if verdict_times:
        print(f"Time to a verdict: median {median(verdict_times):.3f} s, "
              f"range {min(verdict_times):.3f}-{max(verdict_times):.3f} s")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cases", type=Path, nargs="?", default=HERE / "comparator.json")
    parser.add_argument("--warm-up", action="store_true", help="Grade an unrelated reply before timing the cases.")
    args = parser.parse_args()
    run(args.cases, args.warm_up)
