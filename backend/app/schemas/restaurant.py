from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from decimal import Decimal
from datetime import datetime

class MenuItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0, decimal_places=2)
    category: Optional[str] = Field(None, max_length=100)
    is_available: bool = True

class MenuItemCreate(MenuItemBase):
    restaurant_id: uuid.UUID

class MenuItem(MenuItemBase):
    item_id: uuid.UUID
    restaurant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RestaurantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    address: str = Field(..., min_length=5, max_length=500)
    phone_number: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None)
    is_active: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    updated_at: datetime

class RestaurantCreate(RestaurantBase):
    pass

class Restaurant(RestaurantBase):
    restaurant_id: uuid.UUID

    class Config:
        from_attributes = True

class RestaurantWithMenu(Restaurant):
    menu_items: List[MenuItem] = []

    class Config:
        from_attributes = True



