# STAGE 1: Build the C++ Engine
FROM gcc:latest AS builder

# Create working directory for the engine
WORKDIR /app/engine

# Copy the C++ source files and headers
COPY ./engine /app/engine

# Compile the C++ solver into a static binary
# We combine main, dinic, and synergy logic into one executable
RUN mkdir -p /app/bin && \
    g++ -O3 src/main.cpp -o /app/bin/solver

# STAGE 2: Run the Python FastAPI Backend
FROM python:3.13-slim

# Install system dependencies (like sqlite if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled C++ binary from the builder stage
COPY --from=builder /app/bin/solver ./bin/solver
# Ensure the binary has execution permissions
RUN chmod +x ./bin/solver

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the FastAPI application
COPY . .

# Expose the port FastAPI runs on
EXPOSE 8000

# Start the application using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]