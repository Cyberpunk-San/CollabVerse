from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging import setup_logging

from app.api import students, repos, teams, profile, requests, chat, group, auth, verify, websocket, stats


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
    )

    import uuid
    from fastapi import Request

    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://127.0.0.1",
    ]
    if settings.ENV == "production":
        origins = [
            "https://collabverse.example.com"
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    setup_logging()

    Base.metadata.create_all(bind=engine)

    os.makedirs("uploads/chat_files", exist_ok=True)
    os.makedirs("uploads/chat_files/thumbnails", exist_ok=True)
    os.makedirs("uploads/group_files", exist_ok=True)
    os.makedirs("uploads/group_files/thumbnails", exist_ok=True) 
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    
    from fastapi import APIRouter
    api_router = APIRouter(prefix="/api/v1")
    api_router.include_router(students.router)
    api_router.include_router(repos.router)
    api_router.include_router(teams.router)
    api_router.include_router(profile.router)
    api_router.include_router(requests.router)
    api_router.include_router(chat.router)
    api_router.include_router(group.router)
    api_router.include_router(auth.router)
    api_router.include_router(verify.router)
    api_router.include_router(stats.router)
    
    app.include_router(api_router)
    app.include_router(websocket.router, prefix="/ws")

    @app.get("/")
    async def root():
        return {
            "message": f"Welcome to {settings.APP_NAME}",
            "version": "1.0.0",
            "status": "running"
        }
    
    @app.get("/health")
    async def health_check():
        db_status = "connected"
        try:
            with engine.connect() as conn:
                pass
        except Exception:
            db_status = "disconnected"
            
        return {
            "status": "healthy" if db_status == "connected" else "unhealthy",
            "dependencies": {
                "database": db_status
            }
        }
    
    @app.on_event("shutdown")
    async def shutdown_event():
        try:
            from app.api.ws_manager import ws_manager
            users = list(ws_manager.active_connections.keys())
            for u in users:
                try:
                    await ws_manager.active_connections[u].close(code=1001)
                except Exception:
                    pass
        except Exception as e:
            print(f"Error during shutdown: {e}")

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)