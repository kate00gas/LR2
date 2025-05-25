from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

class UserBase(BaseModel):
    username: str
    phone_number: Optional[str] = None  # Added phone_number

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    phone_number: str  # Required for registration

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    user_id: uuid.UUID
    username: str
    role: str
    phone_number: Optional[str] = None  # Added phone_number
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str