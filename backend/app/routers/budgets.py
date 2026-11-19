
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status
)
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import Budget, Category, User
from app.schemas import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse
)
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"]
)


# ==========================================
# VALIDATE CATEGORY
# ==========================================

def validate_category(
    category_id: int,
    user_id: int,
    db: Session
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == user_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    if category.type != "expense":
        raise HTTPException(
            status_code=400,
            detail="Budgets can only be created for expense categories"
        )

    return category


# ==========================================
# CREATE BUDGET
# ==========================================

@router.post(
    "/",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED
)
def create_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    validate_category(
        category_id=budget_data.category_id,
        user_id=current_user.id,
        db=db
    )

    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == budget_data.category_id,
        Budget.month == budget_data.month,
        Budget.year == budget_data.year
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=409,
            detail="Budget already exists for this category and month"
        )

    new_budget = Budget(
        user_id=current_user.id,
        category_id=budget_data.category_id,
        amount=budget_data.amount,
        month=budget_data.month,
        year=budget_data.year
    )

    db.add(new_budget)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Budget already exists for this category and month"
        )

    db.refresh(new_budget)

    return new_budget


# ==========================================
# GET ALL BUDGETS
# ==========================================

@router.get(
    "/",
    response_model=list[BudgetResponse]
)
def get_budgets(
    category_id: int | None = Query(default=None, gt=0),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Budget).filter(
        Budget.user_id == current_user.id
    )

    if category_id is not None:
        query = query.filter(
            Budget.category_id == category_id
        )

    if month is not None:
        query = query.filter(
            Budget.month == month
        )

    if year is not None:
        query = query.filter(
            Budget.year == year
        )

    offset = (page - 1) * page_size

    return (
        query.order_by(
            Budget.year.desc(),
            Budget.month.desc(),
            Budget.id.desc()
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )


# ==========================================
# GET BUDGET BY ID
# ==========================================

@router.get(
    "/{budget_id}",
    response_model=BudgetResponse
)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found"
        )

    return budget


# ==========================================
# UPDATE BUDGET
# ==========================================

@router.patch(
    "/{budget_id}",
    response_model=BudgetResponse
)
def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found"
        )

    update_data = budget_data.model_dump(
        exclude_unset=True
    )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update data provided"
        )

    for field in ["category_id", "amount", "month", "year"]:
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=400,
                detail=f"{field} cannot be null"
            )

    new_category_id = update_data.get(
        "category_id", budget.category_id
    )

    new_month = update_data.get(
        "month", budget.month
    )

    new_year = update_data.get(
        "year", budget.year
    )

    validate_category(
        category_id=new_category_id,
        user_id=current_user.id,
        db=db
    )

    duplicate_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == new_category_id,
        Budget.month == new_month,
        Budget.year == new_year,
        Budget.id != budget_id
    ).first()

    if duplicate_budget:
        raise HTTPException(
            status_code=409,
            detail="Budget already exists for this category and month"
        )

    for key, value in update_data.items():
        setattr(budget, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Budget already exists for this category and month"
        )

    db.refresh(budget)

    return budget


# ==========================================
# DELETE BUDGET
# ==========================================

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found"
        )

    db.delete(budget)
    db.commit()

    return {
        "message": "Budget deleted successfully",
        "budget_id": budget_id
    }
