
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Numeric,
    Text,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ==========================================
# USER MODEL
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    categories = relationship(
        "Category",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    transactions = relationship(
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    budgets = relationship(
        "Budget",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# ==========================================
# CATEGORY MODEL
# ==========================================

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "user_id", "name", "type",
            name="uq_user_category_type"
        ),
        CheckConstraint(
            "type IN ('income', 'expense')",
            name="check_category_type"
        ),
    )

    user = relationship("User", back_populates="categories")

    transactions = relationship(
        "Transaction",
        back_populates="category"
    )

    budgets = relationship(
        "Budget",
        back_populates="category"
    )


# ==========================================
# TRANSACTION MODEL
# ==========================================

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False
    )

    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_transaction_amount"
        ),
        CheckConstraint(
            "type IN ('income', 'expense')",
            name="check_transaction_type"
        ),
    )

    user = relationship("User", back_populates="transactions")

    category = relationship(
        "Category",
        back_populates="transactions"
    )


# ==========================================
# BUDGET MODEL
# ==========================================

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False
    )

    amount = Column(Numeric(12, 2), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "user_id", "category_id", "month", "year",
            name="uq_user_category_month_year"
        ),
        CheckConstraint(
            "amount > 0",
            name="check_budget_amount"
        ),
        CheckConstraint(
            "month BETWEEN 1 AND 12",
            name="check_budget_month"
        ),
    )

    user = relationship("User", back_populates="budgets")

    category = relationship(
        "Category",
        back_populates="budgets"
    )
