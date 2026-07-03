# ex01_parse_response: requestsのレスポンスモデルを理解する
# requests.get(url) が返す Response オブジェクトは、C#で言えば HttpClient.GetAsync() が返す
# HttpResponseMessage に相当する。status_code(StatusCode)・text(Content文字列)・
# headers(Headers、Dictionaryのようにキーでアクセスできる)・ok(IsSuccessStatusCode)を持つ。
# ここではネットワークを使わず、data/fake_responses.py のダミーResponse(この関数群にとっては
# 引数として渡ってくるだけなので、どちらでも同じコードで動く)で練習する。


# response.ok が True なら response.text を返し、False なら None を返す
# (C#: response.IsSuccessStatusCode ? response.Content : null に相当)
def get_body_if_ok(response):
    return response.text if response.ok else None


# response.headers から Content-Type ヘッダの値を取り出す。存在しなければ "unknown" を返す
# (C#: response.Headers.TryGetValue("Content-Type", out var v) に相当。
#  Pythonのdictには get(key, デフォルト値) がある)
def get_content_type(response):
    return response.headers.get("Content-Type", "unknown")


# 複数のresponseのリストを受け取り、status_codeごとの件数を数えた辞書を返す
# 例: [200, 200, 404] -> {200: 2, 404: 1}
def count_by_status(responses):
    counts = {}
    for response in responses:
        counts[response.status_code] = counts.get(response.status_code, 0) + 1
    return counts


# response が成功(2xx)なら本文を返し、失敗なら例外を送出する
# (C#: response.EnsureSuccessStatusCode() に相当する requests の raise_for_status() を使う)
def get_body_or_raise(response):
    response.raise_for_status()
    return response.text
