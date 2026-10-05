from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["admin", "analyst", "viewer"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str = Field(min_length=1, max_length=100)


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    mode: Literal["agent", "demo"]


class Metric(BaseModel):
    label: str
    value: float
    change: float
    format: Literal["currency", "percent", "number"]


class MonthlyRevenue(BaseModel):
    month: str
    revenue: float
    expenses: float
    net_income: float


class DashboardResponse(BaseModel):
    metrics: list[Metric]
    monthly: list[MonthlyRevenue]
    synthetic: bool = True
