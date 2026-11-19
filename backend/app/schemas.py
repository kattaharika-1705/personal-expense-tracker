from datetime import date as Date, datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Literal
from decimal import Decimal
from typing import Optional

# User registration
class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


# User response
class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# JWT token response
class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# ==========================================
# CATEGORY CREATE SCHEMA
# ==========================================

class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    type: Literal["income", "expense"]


# ==========================================
# CATEGORY UPDATE SCHEMA
# ==========================================

class CategoryUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    type: Literal["income", "expense"] | None = None


# ==========================================
# CATEGORY RESPONSE SCHEMA
# ==========================================

class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: str

    model_config = ConfigDict(from_attributes=True)



# ==========================================
# TRANSACTION CREATE SCHEMA
# ==========================================

class TransactionCreate(BaseModel):
    category_id: int = Field(gt=0)

    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2
    )

    type: Literal["income", "expense"]

    description: str | None = Field(
        default=None,
        max_length=1000
    )

    date: Date


# ==========================================
# TRANSACTION UPDATE SCHEMA
# ==========================================

class TransactionUpdate(BaseModel):
    category_id: int | None = Field(
        default=None,
        gt=0
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2
    )

    type: Literal["income", "expense"] | None = None

    description: str | None = Field(
        default=None,
        max_length=1000
    )

    date: Optional[Date] = None


# ==========================================
# TRANSACTION RESPONSE SCHEMA
# ==========================================

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: Decimal
    type: str
    description: str | None
    date: Date
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)




# ==========================================
# BUDGET CREATE SCHEMA
# ==========================================

class BudgetCreate(BaseModel):
    category_id: int = Field(gt=0)

    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2
    )

    month: int = Field(ge=1, le=12)

    year: int = Field(ge=2000, le=2100)


# ==========================================
# BUDGET UPDATE SCHEMA
# ==========================================

class BudgetUpdate(BaseModel):
    category_id: int | None = Field(
        default=None,
        gt=0
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2
    )

    month: int | None = Field(
        default=None,
        ge=1,
        le=12
    )

    year: int | None = Field(
        default=None,
        ge=2000,
        le=2100
    )


# ==========================================
# BUDGET RESPONSE SCHEMA
# ==========================================

class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: Decimal
    month: int
    year: int

    model_config = ConfigDict(from_attributes=True)
