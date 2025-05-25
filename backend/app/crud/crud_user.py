from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from passlib.context import CryptContext
from app.models.user import User
from app.schemas.user import UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_user_by_username(db: AsyncSession, username: str) -> User:
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_phone_number(db: AsyncSession, phone_number: str) -> User:
    stmt = select(User).where(User.phone_number == phone_number)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_all_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[User]:
    stmt = select(User).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    existing_user = await get_user_by_username(db, username=user_in.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    existing_phone = await get_user_by_phone_number(db, phone_number=user_in.phone_number)
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    hashed_password = pwd_context.hash(user_in.password)
    db_user = User(
        username=user_in.username,
        hashed_password=hashed_password,
        role=user_in.role,
        phone_number=user_in.phone_number
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)