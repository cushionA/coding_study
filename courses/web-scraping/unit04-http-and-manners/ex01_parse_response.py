# ex01_parse_response: requestsのレスポンスモデルを理解する
# requests.get(url) が返す Response オブジェクトは、C#で言えば HttpClient.GetAsync() が返す
# HttpResponseMessage に相当する。status_code(StatusCode)・text(Content文字列)・
# headers(Headers、Dictionaryのようにキーでアクセスできる)・ok(IsSuccessStatusCode)を持つ。
# ここではネットワークを使わず、data/fake_responses.py のダミーResponse(この関数群にとっては
# 引数として渡ってくるだけなので、どちらでも同じコードで動く)で練習する。


# response.ok が True なら response.text を返し、False なら None を返す
# (C#: response.IsSuccessStatusCode ? response.Content : null に相当)
def get_body_if_ok(response):
    # TODO: response.ok を見て text を返すか None を返すか分岐する
    raise NotImplementedError


# response.headers から Content-Type ヘッダの値を取り出す。存在しなければ "unknown" を返す
# (C#: response.Headers.TryGetValue("Content-Type", out var v) に相当。
#  Pythonのdictには get(key, デフォルト値) がある)
def get_content_type(response):
    # TODO: headers辞書からContent-Typeを安全に取り出す(なければ"unknown")
    raise NotImplementedError


# 複数のresponseのリストを受け取り、status_codeごとの件数を数えた辞書を返す
# 例: [200, 200, 404] -> {200: 2, 404: 1}
def count_by_status(responses):
    # TODO: 各responseのstatus_codeを数える辞書を作る
    raise NotImplementedError


# response が成功(2xx)なら本文を返し、失敗なら例外を送出する
# (C#: response.EnsureSuccessStatusCode() に相当する requests の raise_for_status() を使う)
def get_body_or_raise(response):
    # TODO: raise_for_status() を呼んでから text を返す
    raise NotImplementedError
