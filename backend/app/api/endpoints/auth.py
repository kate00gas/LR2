from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from app.schemas.user import User, UserCreate, Token
from app.crud.crud_user import get_user_by_username, create_user, verify_password
from app.db.session import get_db
from app.core.config import settings
from app.api.dependencies import create_access_token
from passlib.context import CryptContext

router = APIRouter(tags=["Auth"])

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/users/", response_model=User)
async def create_new_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await get_user_by_username(db, username=user_in.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    if user_in.role != "user":
        raise HTTPException(status_code=400, detail="Only 'user' role is allowed for registration")
    return await create_user(db, user_in)