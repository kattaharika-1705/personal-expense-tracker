import csv
from io import BytesIO, StringIO
from decimal import Decimal
from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer
)
from reportlab.lib.styles import getSampleStyleSheet

from app.database import get_db
from app.models import Transaction, User, Category, Budget
from app.dependencies import get_current_user



router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income"
        )
        .scalar()
    )

    total_expenses = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense"
        )
        .scalar()
    )

    total_income = Decimal(str(total_income))
    total_expenses = Decimal(str(total_expenses))

    current_balance = total_income - total_expenses

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "current_balance": current_balance
    }


@router.get("/monthly-summary")
def get_monthly_summary(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if month < 1 or month > 12:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12"
        )

    if year < 2000 or year > 2100:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Year must be between 2000 and 2100"
        )

    total_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            func.extract("month", Transaction.date) == month,
            func.extract("year", Transaction.date) == year
        )
        .scalar()
    )

    total_expenses = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.extract("month", Transaction.date) == month,
            func.extract("year", Transaction.date) == year
        )
        .scalar()
    )

    total_income = Decimal(str(total_income))
    total_expenses = Decimal(str(total_expenses))

    monthly_balance = total_income - total_expenses

    return {
        "month": month,
        "year": year,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "monthly_balance": monthly_balance
    }



@router.get("/category-breakdown")
def get_category_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Category.id,
            Category.name,
            func.coalesce(func.sum(Transaction.amount), 0).label("total_amount")
        )
        .join(
            Transaction,
            Transaction.category_id == Category.id
        )
        .filter(
            Category.user_id == current_user.id,
            Category.type == "expense",
            Transaction.user_id == current_user.id,
            Transaction.type == "expense"
        )
        .group_by(
            Category.id,
            Category.name
        )
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    category_breakdown = []

    for result in results:
        category_breakdown.append({
            "category_id": result.id,
            "category": result.name,
            "total_amount": Decimal(str(result.total_amount))
        })

    return {
        "category_breakdown": category_breakdown
    }




@router.get("/recent-transactions")
def get_recent_transactions(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if limit < 1 or limit > 50:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 50"
        )

    results = (
        db.query(
            Transaction.id,
            Category.name.label("category"),
            Transaction.amount,
            Transaction.type,
            Transaction.description,
            Transaction.date
        )
        .join(
            Category,
            Transaction.category_id == Category.id
        )
        .filter(
            Transaction.user_id == current_user.id
        )
        .order_by(
            Transaction.date.desc(),
            Transaction.id.desc()
        )
        .limit(limit)
        .all()
    )

    recent_transactions = []

    for result in results:
        recent_transactions.append({
            "transaction_id": result.id,
            "category": result.category,
            "amount": Decimal(str(result.amount)),
            "type": result.type,
            "description": result.description,
            "date": result.date
        })

    return {
        "total_transactions": len(recent_transactions),
        "recent_transactions": recent_transactions
    }



@router.get("/budget-overview")
def get_budget_overview(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    selected_month = month if month is not None else today.month
    selected_year = year if year is not None else today.year

    if selected_month < 1 or selected_month > 12:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12"
        )

    if selected_year < 2000 or selected_year > 2100:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Year must be between 2000 and 2100"
        )

    budgets = (
        db.query(Budget, Category.name)
        .join(Category, Budget.category_id == Category.id)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == selected_month,
            Budget.year == selected_year
        )
        .all()
    )

    budget_overview = []

    for budget, category_name in budgets:
        spent = (
            db.query(
                func.coalesce(func.sum(Transaction.amount), 0)
            )
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == budget.category_id,
                Transaction.type == "expense",
                func.extract("month", Transaction.date) == selected_month,
                func.extract("year", Transaction.date) == selected_year
            )
            .scalar()
        )

        budget_amount = Decimal(str(budget.amount))
        total_spent = Decimal(str(spent))
        remaining_budget = budget_amount - total_spent

        usage_percentage = (
            float((total_spent / budget_amount) * 100)
            if budget_amount > 0 else 0
        )

        budget_status = (
            "Exceeded" if total_spent > budget_amount
            else "Within Budget"
        )

        budget_overview.append({
            "category_id": budget.category_id,
            "category": category_name,
            "budget_amount": budget_amount,
            "total_spent": total_spent,
            "remaining_budget": remaining_budget,
            "usage_percentage": round(usage_percentage, 2),
            "status": budget_status
        })

    return {
        "month": selected_month,
        "year": selected_year,
        "total_budgets": len(budget_overview),
        "budget_overview": budget_overview
    }






@router.get("/export")
def export_dashboard(
    export_format: str = Query("csv", alias="format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if export_format not in ["csv", "excel", "pdf"]:
        raise HTTPException(
            status_code=400,
            detail="Format must be csv, excel, or pdf"
        )

    # Fetch all transactions belonging to the logged-in user.
    results = (
        db.query(Transaction, Category.name)
        .join(Category, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .all()
    )

    total_income = Decimal("0.00")
    total_expenses = Decimal("0.00")
    transaction_rows = []

    for transaction, category_name in results:
        amount = Decimal(str(transaction.amount))

        if transaction.type == "income":
            total_income += amount
        else:
            total_expenses += amount

        transaction_rows.append([
            transaction.id,
            transaction.date,
            category_name,
            transaction.type,
            amount,
            transaction.description or ""
        ])

    current_balance = total_income - total_expenses

    # CSV EXPORT
    if export_format == "csv":
        output = StringIO()
        writer = csv.writer(output)

        writer.writerow(["Personal Expense Tracker - Dashboard Report"])
        writer.writerow(["Total Income", total_income])
        writer.writerow(["Total Expenses", total_expenses])
        writer.writerow(["Current Balance", current_balance])
        writer.writerow([])

        writer.writerow([
            "Transaction ID",
            "Date",
            "Category",
            "Type",
            "Amount",
            "Description"
        ])

        writer.writerows(transaction_rows)

        csv_content = output.getvalue().encode("utf-8-sig")

        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition":
                    'attachment; filename="dashboard_report.csv"'
            }
        )

    # EXCEL EXPORT
    elif export_format == "excel":
        workbook = Workbook()

        summary_sheet = workbook.active
        summary_sheet.title = "Dashboard Summary"

        summary_sheet.append(["Personal Expense Tracker - Dashboard Report"])
        summary_sheet.append(["Total Income", float(total_income)])
        summary_sheet.append(["Total Expenses", float(total_expenses)])
        summary_sheet.append(["Current Balance", float(current_balance)])

        transaction_sheet = workbook.create_sheet("Transactions")

        transaction_sheet.append([
            "Transaction ID",
            "Date",
            "Category",
            "Type",
            "Amount",
            "Description"
        ])

        for row in transaction_rows:
            transaction_sheet.append([
                row[0],
                row[1],
                row[2],
                row[3],
                float(row[4]),
                row[5]
            ])

        for sheet in workbook.worksheets:
            for column in sheet.columns:
                max_length = max(
                    len(str(cell.value or ""))
                    for cell in column
                )
                sheet.column_dimensions[
                    column[0].column_letter
                ].width = min(max_length + 3, 40)

        output = BytesIO()
        workbook.save(output)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
            headers={
                "Content-Disposition":
                    'attachment; filename="dashboard_report.xlsx"'
            }
        )

    # PDF EXPORT
    elif export_format == "pdf":
        output = BytesIO()

        document = SimpleDocTemplate(
            output,
            pagesize=landscape(A4)
        )

        styles = getSampleStyleSheet()
        elements = []

        elements.append(
            Paragraph(
                "Personal Expense Tracker - Dashboard Report",
                styles["Title"]
            )
        )

        elements.append(Spacer(1, 15))

        summary_data = [
            ["Dashboard Summary", "Amount"],
            ["Total Income", f"Rs. {total_income:,.2f}"],
            ["Total Expenses", f"Rs. {total_expenses:,.2f}"],
            ["Current Balance", f"Rs. {current_balance:,.2f}"]
        ]

        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ("PADDING", (0, 0), (-1, -1), 8)
        ]))

        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        transaction_data = [[
            "ID",
            "Date",
            "Category",
            "Type",
            "Amount",
            "Description"
        ]]

        for row in transaction_rows:
            transaction_data.append([
                row[0],
                str(row[1]),
                row[2],
                row[3],
                f"Rs. {row[4]:,.2f}",
                row[5]
            ])

        transaction_table = Table(
            transaction_data,
            repeatRows=1
        )

        transaction_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("PADDING", (0, 0), (-1, -1), 6)
        ]))

        elements.append(transaction_table)

        document.build(elements)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    'attachment; filename="dashboard_report.pdf"'
            }
        )
