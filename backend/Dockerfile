# STAGE 1: Build the C++ Engine
FROM gcc:latest AS builder

# Install additional build tools
RUN apt-get update && apt-get install -y \
    cmake \
    make \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app/engine

# Copy all C++ source files
COPY ./engine /app/engine

# Create bin directory
RUN mkdir -p /app/bin

# Compile the original solver (Dinic + Synergy)
RUN echo "Compiling main solver..." && \
    g++ -O3 -std=c++17 \
        src/main.cpp \
        -o /app/bin/solver

# 🔴 NEW: Compile the ML Trainer
RUN echo "Compiling ML Trainer..." && \
    # Create build directory
    mkdir -p /app/engine/src/ml_trainer/build && \
    cd /app/engine/src/ml_trainer/build && \
    # Compile with optimization and C++17
    g++ -O3 -std=c++17 \
        -I../ \
        ../neural_network.cpp \
        ../data_processor.cpp \
        ../main.cpp \
        -o /app/bin/ml_trainer \
        -pthread

# Verify binaries were created
RUN ls -la /app/bin/ && \
    file /app/bin/solver && \
    file /app/bin/ml_trainer

# STAGE 2: Run the Python FastAPI Backend
FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled C++ binaries from builder
COPY --from=builder /app/bin/solver ./bin/solver
COPY --from=builder /app/bin/ml_trainer ./bin/ml_trainer

# Set execution permissions
RUN chmod +x ./bin/solver ./bin/ml_trainer

# 🔴 NEW: Create directories for ML models and data
RUN mkdir -p /app/models /app/data /app/logs

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the FastAPI application
COPY . .

# 🔴 NEW: Set environment variables for ML Trainer
ENV ML_MODEL_PATH=/app/models
ENV ML_DATA_PATH=/app/data
ENV ML_LOG_PATH=/app/logs
ENV PYTHONUNBUFFERED=1

# Expose ports
EXPOSE 8000

# 🔴 NEW: Health check to verify binaries
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]