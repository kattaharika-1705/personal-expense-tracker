
from datetime import date
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction, Category, User
from app.schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse
)
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


# ==========================================
# VALIDATE CATEGORY
# ==========================================

def validate_category(
    category_id: int,
    transaction_type: str,
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

    if category.type != transaction_type:
        raise HTTPException(
            status_code=400,
            detail="Category type must match transaction type"
        )

    return category


# ==========================================
# CREATE TRANSACTION
# ==========================================

@router.post(
    "/",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    validate_category(
        category_id=transaction_data.category_id,
        transaction_type=transaction_data.type,
        user_id=current_user.id,
        db=db
    )

    new_transaction = Transaction(
        user_id=current_user.id,
        category_id=transaction_data.category_id,
        amount=transaction_data.amount,
        type=transaction_data.type,
        description=transaction_data.description,
        date=transaction_data.date
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return new_transaction


# ==========================================
# GET ALL TRANSACTIONS
# ==========================================

@router.get(
    "/",
    response_model=list[TransactionResponse]
)
def get_transactions(
    transaction_type: str | None = None,
    category_id: int | None = Query(default=None, gt=0),
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if transaction_type and transaction_type not in [
        "income", "expense"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Type must be income or expense"
        )

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    )

    if transaction_type:
        query = query.filter(
            Transaction.type == transaction_type
        )

    if category_id:
        query = query.filter(
            Transaction.category_id == category_id
        )

    if start_date:
        query = query.filter(
            Transaction.date >= start_date
        )

    if end_date:
        query = query.filter(
            Transaction.date <= end_date
        )

    offset = (page - 1) * page_size

    return (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )


# ==========================================
# GET TRANSACTION BY ID
# ==========================================

@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse
)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    return transaction


# ==========================================
# UPDATE TRANSACTION
# ==========================================

@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse
)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    update_data = transaction_data.model_dump(
        exclude_unset=True
    )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update data provided"
        )

    # Validate fields that cannot be null
    for field in ["category_id", "amount", "type", "date"]:
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=400,
                detail=f"{field} cannot be null"
            )

    new_category_id = update_data.get(
        "category_id", transaction.category_id
    )

    new_type = update_data.get(
        "type", transaction.type
    )

    # Validate category ownership and matching type
    validate_category(
        category_id=new_category_id,
        transaction_type=new_type,
        user_id=current_user.id,
        db=db
    )

    for key, value in update_data.items():
        setattr(transaction, key, value)

    db.commit()
    db.refresh(transaction)

    return transaction


# ==========================================
# DELETE TRANSACTION
# ==========================================

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    db.delete(transaction)
    db.commit()

    return {
        "message": "Transaction deleted successfully",
        "transaction_id": transaction_id
    }
