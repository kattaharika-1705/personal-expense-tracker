from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Transaction, User, Category, Budget
from app.dependencies import get_current_user
from calendar import monthrange


router = APIRouter(
    prefix="/analytics",
    tags=["Financial Analytics"]
)


@router.get("/monthly-trends")
def get_monthly_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    # Calculate the first month in the six-month period.
    start_month_index = (today.year * 12 + today.month - 1) - 5
    start_year = start_month_index // 12
    start_month = start_month_index % 12 + 1

    start_date = date(start_year, start_month, 1)

    # Fetch income and expenses grouped by month and transaction type.
    results = (
        db.query(
            func.year(Transaction.date).label("year"),
            func.month(Transaction.date).label("month"),
            Transaction.type,
            func.sum(Transaction.amount).label("total")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date <= today
        )
        .group_by(
            func.year(Transaction.date),
            func.month(Transaction.date),
            Transaction.type
        )
        .all()
    )

    # Prepare all six months, including months with no transactions.
    monthly_data = {}

    for offset in range(6):
        month_index = start_month_index + offset
        year = month_index // 12
        month = month_index % 12 + 1

        monthly_data[(year, month)] = {
            "year": year,
            "month": month,
            "total_income": 0.0,
            "total_expenses": 0.0
        }

    # Add database totals to the corresponding month.
    for row in results:
        key = (row.year, row.month)

        if row.type == "income":
            monthly_data[key]["total_income"] = float(row.total or Decimal("0"))
        elif row.type == "expense":
            monthly_data[key]["total_expenses"] = float(row.total or Decimal("0"))

    # Calculate savings and income-versus-expense differences.
    trends = []

    for item in monthly_data.values():
        income = item["total_income"]
        expenses = item["total_expenses"]

        trends.append({
            "year": item["year"],
            "month": item["month"],
            "total_income": round(income, 2),
            "total_expenses": round(expenses, 2),
            "monthly_savings": round(income - expenses, 2),
            "income_vs_expense": round(income - expenses, 2)
        })

    return {
        "period": "Last 6 months",
        "monthly_trends": trends
    }




@router.get("/category-spending")
def get_category_spending(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Transaction.category_id,
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total_spent")
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense"
        )
        .group_by(
            Transaction.category_id,
            Category.name
        )
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    total_expenses = sum(
        (row.total_spent or Decimal("0") for row in results),
        Decimal("0")
    )

    category_spending = []

    for row in results:
        amount = row.total_spent or Decimal("0")

        percentage = (
            float(amount / total_expenses * 100)
            if total_expenses > 0
            else 0
        )

        category_spending.append({
            "category_id": row.category_id,
            "category": row.category,
            "total_spent": round(float(amount), 2),
            "percentage": round(percentage, 2)
        })

    return {
        "total_expenses": round(float(total_expenses), 2),
        "categories_count": len(category_spending),
        "category_spending": category_spending
    }



@router.get("/monthly-comparison")
def get_monthly_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    current_start = date(today.year, today.month, 1)

    # Calculate previous month, including year changes.
    if today.month == 1:
        previous_year = today.year - 1
        previous_month = 12
    else:
        previous_year = today.year
        previous_month = today.month - 1

    previous_start = date(previous_year, previous_month, 1)

    def get_totals(start_date, end_date):
        income = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "income",
                Transaction.date >= start_date,
                Transaction.date < end_date
            )
            .scalar()
        )

        expenses = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.date >= start_date,
                Transaction.date < end_date
            )
            .scalar()
        )

        income = Decimal(str(income or 0))
        expenses = Decimal(str(expenses or 0))

        return {
            "income": income,
            "expenses": expenses,
            "savings": income - expenses
        }

    current_totals = get_totals(
        current_start,
        today.replace(day=monthrange(today.year, today.month)[1]) + timedelta(days=1)

    )

    previous_totals = get_totals(
        previous_start,
        current_start
    )

    def percentage_change(current, previous):
        if previous == 0:
            return None

        return round(
            float((current - previous) / abs(previous) * 100),
            2
        )

    return {
        "current_month": {
            "month": today.month,
            "year": today.year,
            "income": round(float(current_totals["income"]), 2),
            "expenses": round(float(current_totals["expenses"]), 2),
            "savings": round(float(current_totals["savings"]), 2)
        },
        "previous_month": {
            "month": previous_month,
            "year": previous_year,
            "income": round(float(previous_totals["income"]), 2),
            "expenses": round(float(previous_totals["expenses"]), 2),
            "savings": round(float(previous_totals["savings"]), 2)
        },
        "percentage_change": {
            "income": percentage_change(
                current_totals["income"], previous_totals["income"]
            ),
            "expenses": percentage_change(
                current_totals["expenses"], previous_totals["expenses"]
            ),
            "savings": percentage_change(
                current_totals["savings"], previous_totals["savings"]
            )
        }
    }



@router.get("/budget-performance")
def get_budget_performance(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    selected_month = month if month is not None else today.month
    selected_year = year if year is not None else today.year

    start_date = date(selected_year, selected_month, 1)

    if selected_month == 12:
        end_date = date(selected_year + 1, 1, 1)
    else:
        end_date = date(selected_year, selected_month + 1, 1)

    budgets = (
        db.query(Budget, Category.name.label("category_name"))
        .join(Category, Budget.category_id == Category.id)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == selected_month,
            Budget.year == selected_year
        )
        .all()
    )

    budget_performance = []

    for budget, category_name in budgets:
        spent = (
            db.query(
                func.coalesce(func.sum(Transaction.amount), 0)
            )
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == budget.category_id,
                Transaction.type == "expense",
                Transaction.date >= start_date,
                Transaction.date < end_date
            )
            .scalar()
        )

        budget_amount = Decimal(str(budget.amount))
        total_spent = Decimal(str(spent or 0))

        remaining = budget_amount - total_spent

        usage_percentage = float(
            total_spent / budget_amount * 100
        )

        if total_spent > budget_amount:
            status = "Over Budget"
        elif usage_percentage >= 80:
            status = "Near Budget Limit"
        elif total_spent == 0:
            status = "No Spending"
        else:
            status = "Within Budget"

        budget_performance.append({
            "category_id": budget.category_id,
            "category": category_name,
            "budget_amount": round(float(budget_amount), 2),
            "total_spent": round(float(total_spent), 2),
            "remaining_budget": round(float(remaining), 2),
            "usage_percentage": round(usage_percentage, 2),
            "status": status
        })

    return {
        "month": selected_month,
        "year": selected_year,
        "budgets_count": len(budget_performance),
        "budget_performance": budget_performance
    }




@router.get("/daily-trends")
def get_daily_trends(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    selected_month = month if month is not None else today.month
    selected_year = year if year is not None else today.year

    start_date = date(selected_year, selected_month, 1)
    days_in_month = monthrange(selected_year, selected_month)[1]

    if selected_month == 12:
        end_date = date(selected_year + 1, 1, 1)
    else:
        end_date = date(selected_year, selected_month + 1, 1)

    results = (
        db.query(
            Transaction.date.label("transaction_date"),
            Transaction.type,
            func.sum(Transaction.amount).label("total")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .group_by(
            Transaction.date,
            Transaction.type
        )
        .order_by(Transaction.date)
        .all()
    )

    daily_data = {
        day: {
            "day": day,
            "income": 0.0,
            "expenses": 0.0,
            "savings": 0.0
        }
        for day in range(1, days_in_month + 1)
    }

    for row in results:
        day = row.transaction_date.day
        amount = float(row.total or Decimal("0"))

        if row.type == "income":
            daily_data[day]["income"] = amount
        elif row.type == "expense":
            daily_data[day]["expenses"] = amount

    total_income = 0.0
    total_expenses = 0.0

    daily_trends = []

    for item in daily_data.values():
        item["savings"] = round(
            item["income"] - item["expenses"], 2
        )

        item["income"] = round(item["income"], 2)
        item["expenses"] = round(item["expenses"], 2)

        total_income += item["income"]
        total_expenses += item["expenses"]

        daily_trends.append(item)

    return {
        "month": selected_month,
        "year": selected_year,
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "total_savings": round(total_income - total_expenses, 2),
        "daily_trends": daily_trends
    }




@router.get("/spending-insights")
def get_spending_insights(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    selected_month = month if month is not None else today.month
    selected_year = year if year is not None else today.year

    start_date = date(selected_year, selected_month, 1)

    if selected_month == 12:
        end_date = date(selected_year + 1, 1, 1)
    else:
        end_date = date(selected_year, selected_month + 1, 1)

    # Calculate total expenses and transaction count.
    summary = (
        db.query(
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
            func.avg(Transaction.amount).label("average")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .first()
    )

    total_expenses = Decimal(str(summary.total or 0))
    transaction_count = summary.count or 0
    average_expense = Decimal(str(summary.average or 0))

    # Find the highest-spending category.
    top_category = (
        db.query(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total")
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .first()
    )

    # Find the largest individual expense.
    largest_expense = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .order_by(Transaction.amount.desc())
        .first()
    )

    return {
        "month": selected_month,
        "year": selected_year,
        "total_expenses": round(float(total_expenses), 2),
        "expense_transactions_count": transaction_count,
        "average_expense": round(float(average_expense), 2),
        "top_spending_category": (
            {
                "category": top_category.category,
                "amount": round(float(top_category.total), 2)
            }
            if top_category else None
        ),
        "largest_expense": (
            {
                "amount": round(float(largest_expense.amount), 2),
                "description": largest_expense.description,
                "date": largest_expense.date.isoformat()
            }
            if largest_expense else None
        )
    }




@router.get("/income-insights")
def get_income_insights(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    selected_month = month if month is not None else today.month
    selected_year = year if year is not None else today.year

    start_date = date(selected_year, selected_month, 1)

    if selected_month == 12:
        end_date = date(selected_year + 1, 1, 1)
    else:
        end_date = date(selected_year, selected_month + 1, 1)

    # Calculate total income, count, and average.
    summary = (
        db.query(
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
            func.avg(Transaction.amount).label("average")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .first()
    )

    total_income = Decimal(str(summary.total or 0))
    transaction_count = summary.count or 0
    average_income = Decimal(str(summary.average or 0))

    # Find the highest-earning category.
    top_category = (
        db.query(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total")
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .first()
    )

    # Find the largest individual income.
    largest_income = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .order_by(Transaction.amount.desc())
        .first()
    )

    return {
        "month": selected_month,
        "year": selected_year,
        "total_income": round(float(total_income), 2),
        "income_transactions_count": transaction_count,
        "average_income": round(float(average_income), 2),
        "top_income_category": (
            {
                "category": top_category.category,
                "amount": round(float(top_category.total), 2)
            }
            if top_category else None
        ),
        "largest_income": (
            {
                "amount": round(float(largest_income.amount), 2),
                "description": largest_income.description,
                "date": largest_income.date.isoformat()
            }
            if largest_income else None
        )
    }



@router.get("/savings-rate")
def get_savings_rate(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    selected_month = month if month is not None else today.month
    selected_year = year if year is not None else today.year

    start_date = date(selected_year, selected_month, 1)

    if selected_month == 12:
        end_date = date(selected_year + 1, 1, 1)
    else:
        end_date = date(selected_year, selected_month + 1, 1)

    results = (
        db.query(
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date < end_date
        )
        .group_by(Transaction.type)
        .all()
    )

    income = Decimal("0")
    expenses = Decimal("0")

    for row in results:
        if row.type == "income":
            income = Decimal(str(row.total))
        elif row.type == "expense":
            expenses = Decimal(str(row.total))

    savings = income - expenses

    savings_rate = (
        float(savings / income * 100)
        if income > 0
        else None
    )

    return {
        "month": selected_month,
        "year": selected_year,
        "total_income": round(float(income), 2),
        "total_expenses": round(float(expenses), 2),
        "total_savings": round(float(savings), 2),
        "savings_rate_percentage": (
            round(savings_rate, 2)
            if savings_rate is not None
            else None
        ),
        "status": (
            "Positive Savings" if savings > 0
            else "Break Even" if savings == 0
            else "Negative Savings"
        ) if income > 0 else "No Income"
    }
