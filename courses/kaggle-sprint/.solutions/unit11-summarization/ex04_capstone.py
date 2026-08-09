import re


def extract_facts(text):
    return {match.upper() for match in re.findall(r"(?=[A-Za-z0-9-]*\d)[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", str(text))}


def hallucination_rate(source, summary):
    source_facts = extract_facts(source)
    summary_facts = extract_facts(summary)
    return 0.0 if not summary_facts else len(summary_facts - source_facts) / len(summary_facts)


def generation_work(n_items, input_tokens, output_tokens, beam_width=1):
    return n_items * output_tokens * beam_width * (input_tokens + output_tokens / 2)


def choose_summarizer(options, min_quality, min_factuality):
    eligible = [option for option in options if option["quality"] >= min_quality and option["factuality"] >= min_factuality]
    if not eligible:
        raise ValueError("constraints cannot be met")
    return min(eligible, key=lambda option: option["cost"])
