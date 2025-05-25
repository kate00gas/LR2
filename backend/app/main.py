

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware # Для разрешения запросов из браузера клиента
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.endpoints import restaurants, orders # Импортируем роутеры
from app.services.cache_service import cache_service # Импортируем сервисы
from app.services.message_service import message_service
import logging
from app.api.endpoints import restaurants, orders, admin, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Асинхронный контекстный менеджер для управления жизненным циклом приложения
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код, выполняемый при старте приложения
    logger.info("Application startup...")
    logger.info("Connecting to services...")
    # Подключаемся к Redis и RabbitMQ
    await cache_service.connect()
    await message_service.connect()
    logger.info("Service connections established.")
    yield # Приложение работает здесь
    # Код, выполняемый при остановке приложения
    logger.info("Application shutdown...")
    logger.info("Disconnecting from services...")
    await cache_service.disconnect()
    await message_service.disconnect()
    logger.info("Service connections closed.")
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan # Передаем lifespan менеджер
)

# Настройка CORS (Cross-Origin Resource Sharing)
# Разрешаем запросы от любого источника (*) для простоты примера.
# В продакшене укажите конкретные домены вашего фронтенда.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Или ["http://localhost:3000", "https://your-frontend.com"]
    allow_credentials=True,
    allow_methods=["*"], # Разрешаем все методы (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Разрешаем все заголовки
)

# Подключаем роутеры эндпоинтов
app.include_router(restaurants.router, prefix=f"{settings.API_V1_STR}/restaurants", tags=["Restaurants"])
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/orders", tags=["Orders"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])


@app.get("/", tags=["Root"])
async def read_root():
    """Корневой эндпоинт для проверки работы API."""
    return {"message": f"Welcome to {settings.PROJECT_NAME}!"}




# Если вы хотите запустить напрямую через python main.py (без uvicorn cli)
# if __name__ == "__main__":
#    import uvicorn
#    uvicorn.run(app, host="0.0.0.0", port=8000)