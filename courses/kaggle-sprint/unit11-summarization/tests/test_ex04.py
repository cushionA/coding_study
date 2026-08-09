from conftest import load_exercise
import pytest

ex = load_exercise("ex04_capstone")


# test_extract_facts_numbers_and_model_codes が要求仕様を満たすか確認する。
def test_extract_facts_numbers_and_model_codes():
    assert ex.extract_facts("売上は120件、型番XR-500Bです") == {"120", "XR-500B"}


# test_hallucination_rate が要求仕様を満たすか確認する。
def test_hallucination_rate():
    source = "XR-500Bを120件販売"
    summary = "XR-500Bを150件販売"
    assert ex.hallucination_rate(source, summary) == 0.5
    assert ex.hallucination_rate(source, "好調でした") == 0.0


# test_generation_work_beam_and_output_length が要求仕様を満たすか確認する。
def test_generation_work_beam_and_output_length():
    greedy = ex.generation_work(100, 200, 50, 1)
    beam = ex.generation_work(100, 200, 50, 4)
    assert beam == 4 * greedy


# test_choose_summarizer_constraints が要求仕様を満たすか確認する。
def test_choose_summarizer_constraints():
    options = [
        {"name": "extractive", "quality": 0.7, "factuality": 1.0, "cost": 1},
        {"name": "small", "quality": 0.85, "factuality": 0.9, "cost": 3},
        {"name": "api", "quality": 0.95, "factuality": 0.92, "cost": 10},
    ]
    assert ex.choose_summarizer(options, 0.8, 0.89)["name"] == "small"
    with pytest.raises(ValueError):
        ex.choose_summarizer(options, 0.99, 0.99)
