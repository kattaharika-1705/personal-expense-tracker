
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, Transaction, Budget, User
from app.schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse
)
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


# ==========================================
# CREATE CATEGORY
# ==========================================

@router.post(
    "/",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED
)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    name = category_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Category name cannot be empty"
        )

    existing_category = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.name == name,
        Category.type == category_data.type
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    new_category = Category(
        user_id=current_user.id,
        name=name,
        type=category_data.type
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


# ==========================================
# GET ALL CATEGORIES
# ==========================================

@router.get(
    "/",
    response_model=list[CategoryResponse]
)
def get_categories(
    category_type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if category_type and category_type not in ["income", "expense"]:
        raise HTTPException(
            status_code=400,
            detail="Category type must be income or expense"
        )

    query = db.query(Category).filter(
        Category.user_id == current_user.id
    )

    if category_type:
        query = query.filter(
            Category.type == category_type
        )

    return query.order_by(Category.id.desc()).all()


# ==========================================
# GET CATEGORY BY ID
# ==========================================

@router.get(
    "/{category_id}",
    response_model=CategoryResponse
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return category


# ==========================================
# UPDATE CATEGORY
# ==========================================

@router.patch(
    "/{category_id}",
    response_model=CategoryResponse
)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    update_data = category_data.model_dump(exclude_unset=True)

    if "name" in update_data:
        if update_data["name"] is None:
            raise HTTPException(
                status_code=400,
                detail="Category name cannot be null"
            )

        update_data["name"] = update_data["name"].strip()

        if not update_data["name"]:
            raise HTTPException(
                status_code=400,
                detail="Category name cannot be empty"
            )

    new_name = update_data.get("name", category.name)
    new_type = update_data.get("type", category.type)

    duplicate = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.name == new_name,
        Category.type == new_type,
        Category.id != category_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    if new_type != category.type:
        has_transactions = db.query(Transaction).filter(
            Transaction.category_id == category.id
        ).first()

        if has_transactions:
            raise HTTPException(
                status_code=400,
                detail="Cannot change category type while transactions exist"
            )

    for key, value in update_data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)

    return category


# ==========================================
# DELETE CATEGORY
# ==========================================

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    has_transactions = db.query(Transaction).filter(
        Transaction.category_id == category.id
    ).first()

    if has_transactions:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category because transactions are linked to it"
        )

    has_budgets = db.query(Budget).filter(
        Budget.category_id == category.id
    ).first()

    if has_budgets:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category because budgets are linked to it"
        )

    db.delete(category)
    db.commit()

    return {
        "message": "Category deleted successfully",
        "category_id": category_id
    }
