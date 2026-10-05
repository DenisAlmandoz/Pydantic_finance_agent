import pytest
from app.tools import calculate_financial_value, summarize_values


def test_calculate_percentage_change() -> None:
    assert calculate_financial_value("percentage_change", 80, 100) == 25


def test_division_by_zero_is_rejected() -> None:
    with pytest.raises(ValueError, match="zero"):
        calculate_financial_value("divide", 12, 0)


def test_statistics_include_sample_standard_deviation() -> None:
    result = summarize_values([2, 4, 6])
    assert result["count"] == 3
    assert result["mean"] == 4
    assert result["median"] == 4
    assert result["sample_standard_deviation"] == 2
