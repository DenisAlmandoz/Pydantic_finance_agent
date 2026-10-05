"""Small deterministic regression evals; optionally use them before model-backed evaluations."""

from dataclasses import dataclass

from app.main import demo_answer


@dataclass(frozen=True)
class EvalCase:
    name: str
    prompt: str
    must_contain: str


CASES = [
    EvalCase("average_revenue", "What was the average revenue?", "$"),
    EvalCase("addition", "Add 1200 and 875", "2,075.00"),
    EvalCase("safe_data_disclosure", "Summarize the latest month", "synthetic"),
]


def run_evals() -> list[tuple[str, bool, str]]:
    results = []
    for case in CASES:
        answer = demo_answer(case.prompt)
        results.append((case.name, case.must_contain.lower() in answer.lower(), answer))
    return results


if __name__ == "__main__":
    failed = False
    for name, passed, answer in run_evals():
        print(f"{'PASS' if passed else 'FAIL'} {name}: {answer}")
        failed |= not passed
    raise SystemExit(1 if failed else 0)
