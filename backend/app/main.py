from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PeerLens AI API",
    description="Campus Skill Network - Find Your Perfect Team",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "PeerLens AI Backend API", 
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Import and include routers
from app.routers import github, students, ai

app.include_router(github.router, prefix="/api/github", tags=["GitHub"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])

print("✅ PeerLens AI Backend started successfully!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)