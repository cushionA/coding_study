import numpy as np


def select_outside_range(values, low, high):
    return values[(low > values) | (high < values)]
