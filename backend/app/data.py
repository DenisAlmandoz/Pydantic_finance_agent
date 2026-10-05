import csv
from pathlib import Path

from app.schemas import DashboardResponse, Metric, MonthlyRevenue

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "synthetic_financials.csv"


def read_financial_data() -> list[dict[str, str]]:
    with DATA_PATH.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def dashboard_data() -> DashboardResponse:
    rows = read_financial_data()
    monthly = [
        MonthlyRevenue(
            month=row["month"],
            revenue=float(row["revenue"]),
            expenses=float(row["expenses"]),
            net_income=float(row["net_income"]),
        )
        for row in rows
    ]
    latest = monthly[-1]
    previous = monthly[-2]
    revenue_change = ((latest.revenue - previous.revenue) / previous.revenue) * 100
    total_revenue = sum(item.revenue for item in monthly)
    total_expenses = sum(item.expenses for item in monthly)
    return DashboardResponse(
        metrics=[
            Metric(
                label="Revenue YTD", value=total_revenue, change=revenue_change, format="currency"
            ),
            Metric(
                label="Operating expenses", value=total_expenses, change=-1.8, format="currency"
            ),
            Metric(
                label="Net margin",
                value=sum(item.net_income for item in monthly) / total_revenue * 100,
                change=2.4,
                format="percent",
            ),
            Metric(label="Reporting periods", value=len(monthly), change=0, format="number"),
        ],
        monthly=monthly,
    )
