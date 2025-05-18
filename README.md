Схема проекта
Папку .idea не вставлять!

restaurant_delivery_lab2/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── admin.py        # Admin endpoints for orders, restaurants, menu
│   │   │   │   ├── auth.py         # Authentication endpoints (login, user creation)
│   │   │   │   ├── orders.py       # User order endpoints
│   │   │   │   └── restaurants.py  # Restaurant and menu endpoints
│   │   │   ├── __init__.py         # Empty
│   │   │   └── dependencies.py     # JWT auth dependencies
│   │   ├── core/
│   │   │   ├── __init__.py         # Empty
│   │   │   └── config.py          # Application settings from .env
│   │   ├── crud/
│   │   │   ├── __init__.py         # Exports CRUD functions
│   │   │   ├── crud_restaurant.py  # CRUD for restaurants and menu items
│   │   │   ├── crud_order.py       # CRUD for orders
│   │   │   └── crud_user.py        # CRUD for users
│   │   ├── db/
│   │   │   ├── __init__.py         # Empty
│   │   │   ├── base_class.py      # SQLAlchemy base class
│   │   │   └── session.py         # Async database session setup
│   │   ├── models/
│   │   │   ├── __init__.py         # Empty
│   │   │   ├── restaurant.py      # Restaurant and MenuItem models
│   │   │   ├── order.py           # Order and OrderItem models
│   │   │   └── user.py            # User model
│   │   ├── schemas/
│   │   │   ├── __init__.py         # Exports schema classes
│   │   │   ├── restaurant.py      # Pydantic schemas for Restaurant, MenuItem
│   │   │   ├── order.py           # Pydantic schemas for Order, OrderItem
│   │   │   └── user.py            # Pydantic schemas for User, Token
│   │   ├── services/
│   │   │   ├── __init__.py         # Empty
│   │   │   ├── cache_service.py   # Redis caching logic
│   │   │   └── message_service.py # RabbitMQ messaging logic
│   │   ├── __init__.py            # Empty
│   │   └── main.py               # Main FastAPI application
│   ├── alembic/                  # Empty directory (for migrations, not used)
│   ├── alembic.ini               # Alembic configuration (not used)
│   ├── Dockerfile                # Dockerfile for backend image
│   ├── requirements.txt          # Python dependencies for backend
│   └── .env                      # Environment variables (not committed)
├── client/
│   ├── __init__.py               # Empty
│   ├── admin.py                 # Admin CLI client
│   ├── client.py                # User CLI client
│   ├── requirements.txt         # Python dependencies for client
│   └── .env                     # Client environment variables
├── database/
│   └── init_db.sql              # SQL script for database initialization
└── docker-compose.yml           # Docker Compose for all services
