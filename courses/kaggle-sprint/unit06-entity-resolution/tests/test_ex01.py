from conftest import load_exercise

ex = load_exercise("ex01_blocking_and_pairs")


# test_all_pairs_count_and_order が要求仕様を満たすか確認する。
def test_all_pairs_count_and_order():
    assert ex.all_pairs(4) == {(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)}


# test_all_pairs_small_boundary が要求仕様を満たすか確認する。
def test_all_pairs_small_boundary():
    assert ex.all_pairs(1) == set()


# test_blocking_pairs_unions_multiple_keys が要求仕様を満たすか確認する。
def test_blocking_pairs_unions_multiple_keys():
    rows = [{"brand": "A", "cat": "x"}, {"brand": "A", "cat": "y"}, {"brand": "B", "cat": "y"}]
    result = ex.blocking_pairs(rows, [lambda r: r["brand"], lambda r: r["cat"]])
    assert result == {(0, 1), (1, 2)}


# test_pair_recall_normalizes_direction が要求仕様を満たすか確認する。
def test_pair_recall_normalizes_direction():
    assert ex.pair_recall({(1, 0), (2, 3)}, {(0, 1), (0, 2)}) == 0.5
