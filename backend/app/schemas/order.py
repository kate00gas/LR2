
from pydantic import BaseModel, Field, validator
from typing import Optional, List
import uuid
from decimal import Decimal
from .restaurant import Restaurant, MenuItem
from app.models.order import OrderStatusEnum # Импортируем Enum статусов
from datetime import datetime

# --- Minimal Restaurant Schema for Orders ---
class RestaurantBase(BaseModel):
    restaurant_id: uuid.UUID
    name: str

    class Config:
        from_attributes = True

# --- Схемы для OrderItem ---

class OrderItemBase(BaseModel):
    item_id: uuid.UUID
    quantity: int = Field(..., gt=0)

class OrderItemCreate(OrderItemBase):
    # Цена будет взята из БД при создании заказа
    pass

class OrderItem(OrderItemBase):
    order_item_id: uuid.UUID
    order_id: uuid.UUID
    price_per_item: Decimal # Цена на момент заказа
    menu_item: Optional[MenuItem] = None # Загружать опционально

    class Config:
        from_attributes = True

# --- Схемы для Order ---

class OrderBase(BaseModel):
    # user_id получается из токена аутентификации (здесь не реализовано)
    restaurant_id: uuid.UUID
    delivery_address: str = Field(..., min_length=5, max_length=500)

# Схема для создания нового заказа
class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = Field(..., min_items=1)

# Схема для чтения Заказа
class Order(OrderBase):
    order_id: uuid.UUID
    user_id: uuid.UUID # Добавляем ID пользователя
    status: OrderStatusEnum
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    items: List[OrderItem] = [] # Включаем элементы заказа
    restaurant: Optional[RestaurantBase] = None

    class Config:
        from_attributes = True

class OrderUpdate(BaseModel):
    status: OrderStatusEnum
    class Config:
        from_attributes = True