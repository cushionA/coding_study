import html
import re
import unicodedata


def remove_html_noise(text):
    decoded = html.unescape(str(text))
    return re.sub(r"<[^>]+>", " ", decoded)


def normalize_unicode_space(text):
    value = unicodedata.normalize("NFKC", str(text)).lower()
    return re.sub(r"\s+", " ", value).strip()


def replace_price(text):
    pattern = re.compile(r"(?:[¥￥]\s*\d[\d,]*|\d[\d,]*\s*(?:円|jpy))", re.IGNORECASE)
    return pattern.sub("<num>", str(text))


def clean_text(text):
    return replace_price(normalize_unicode_space(remove_html_noise(text)))
