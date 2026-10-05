import statistics
from typing import Literal

from pydantic import BaseModel, Field


class CalculationInput(BaseModel):
    operation: Literal["add", "subtract", "multiply", "divide", "percentage_change"]
    first: float
    second: float


class StatisticsInput(BaseModel):
    values: list[float] = Field(min_length=1, max_length=10_000)


def calculate_financial_value(operation: str, first: float, second: float) -> float:
    if operation == "add":
        return first + second
    if operation == "subtract":
        return first - second
    if operation == "multiply":
        return first * second
    if operation == "divide":
        if second == 0:
            raise ValueError("Cannot divide by zero")
        return first / second
    if operation == "percentage_change":
        if first == 0:
            raise ValueError("Percentage change requires a non-zero starting value")
        return ((second - first) / abs(first)) * 100
    raise ValueError("Unsupported operation")


def summarize_values(values: list[float]) -> dict[str, float | int]:
    if not values:
        raise ValueError("At least one value is required")
    result: dict[str, float | int] = {
        "count": len(values),
        "mean": statistics.fmean(values),
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
    }
    if len(values) > 1:
        result["sample_standard_deviation"] = statistics.stdev(values)
    return result
