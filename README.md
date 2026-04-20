# 🌌 CollabVerse: Intelligent Campus Skill Network

CollabVerse is a high-performance, AI-driven platform designed to revolutionize how students connect and collaborate on campus. By leveraging advanced graph algorithms, machine learning, and real-time synchronization, CollabVerse maps out a campus's technical DNA through GitHub activity and builds optimal teams automatically.

---

## 🚀 Key Features

### 🧠 1. The Synergy Engine (C++)
The backbone of CollabVerse is a high-performance C++ engine that handles complex combinatorial optimizations:
*   **Dinic’s Algorithm**: Used for Maximum Bipartite Matching to ensure the highest number of optimal team assignments across the platform.
*   **Bitmask Dynamic Programming**: Calculates synergy scores by exploring all subset combinations of student skills and project roles.
*   **Heuristic Matching**: A multi-layered fallback system that uses skill embeddings to match students even when historical data is sparse.

### 🛡️ 2. Secure GitHub Verification
A robust, tamper-proof verification system:
*   **Proof-of-Ownership**: Users verify their account by creating a specific repository (`CollabVerse-Verification`) with a unique, time-bound code.
*   **API-Driven Validation**: The backend uses the GitHub REST API (bypassing CDN caches) to decode and verify the repository content instantly.
*   **Database Persistence**: Verification states and codes are persisted in the database, surviving server restarts and reloads.

### 💬 3. Real-Time Collaboration
*   **Unified WebSocket Manager**: A single, persistent connection per user that handles instant messaging, group notifications, and typing indicators.
*   **Presence Tracking**: Real-time "Online/Offline" status updates across all team and chat views.
*   **Reliable Sessions**: Built with a custom `NullPool` SQLite configuration to ensure database stability in high-concurrency async environments.

### 📊 4. AI-Powered Skill Ingestion
*   **GitHub Miner**: Automatically analyzes repositories, commit history, and READMEs to detect a user's true tech stack.
*   **Neural Network Predictor**: Uses a custom-trained MLP (Multi-Layer Perceptron) to predict a student's project success probability and skill growth.

---

## ⚙️ Backend Systems & Architecture

The CollabVerse backend is a highly modular system built for speed, real-time interactivity, and data-driven insights.

### 1. Performance Bridge (Python-C++ Interop)
The backend uses a hybrid architecture. While FastAPI handles the web requests, the heavy mathematical lifting is offloaded to pre-compiled C++ binaries:
*   **Subprocess Execution**: Python uses the `subprocess` module to pipe student features into the C++ Synergy Engine and receives the optimal matching results in structured JSON format.
*   **Efficiency**: This allows us to maintain the developer speed of Python while benefiting from the raw computational power of C++.

### 2. Real-Time WebSocket Manager
Unlike standard REST APIs, CollabVerse maintains a stateful real-time layer:
*   **Connection Pooling**: The `UnifiedConnectionManager` tracks all active users and their socket IDs.
*   **Event Broadcasting**: Supports one-to-one chat, group-wide notifications, and live typing indicators.
*   **Presence Engine**: Automatically updates user status (online/offline) globally when a socket connects or disconnects.

### 3. GitHub Data Ingestion Service
The `GitHubIngest` service is responsible for transforming raw GitHub profiles into structured skill vectors:
*   **Recursive Mining**: It analyzes repository descriptions, primary languages, and `README.md` files using the GitHub REST API.
*   **Metadata Analysis**: It tracks commit frequency and PR activity to weight a student's experience level (e.g., a "Contributor" vs. a "Watcher").

### 4. Authentication & Security
*   **Stateless JWT**: Implements JSON Web Tokens for session management, allowing the backend to scale horizontally without session-store dependencies.
*   **Cryptographic Hashing**: User passwords are encrypted using **bcrypt** with a dynamic salt, protecting against rainbow table and brute-force attacks.
*   **Dependency Injection**: FastAPI's `Depends` system is used to enforce strict access control on all private routes (Profile, Chat, Verification).

### 5. Database & Storage Layer
*   **SQLAlchemy ORM**: Used for all database interactions to ensure type-safety and prevent SQL injection.
*   **Thread-Safe SQLite**: Configured with a `NullPool` strategy to handle concurrent async requests without database locking or "InterfaceErrors."
*   **Local Media Store**: Handles secure file uploads (images/documents) with path validation to prevent directory traversal attacks.

---

## 🗂️ Project Structure

```text
CollabVerse/
├── backend/
│   ├── app/                # FastAPI Application
│   │   ├── api/            # API Routes (Verify, Chat, ML, etc.)
│   │   ├── core/           # Database & Config
│   │   ├── models/         # SQLAlchemy Models
│   │   └── services/       # Business Logic (GitHub Ingest)
│   ├── engine/             # C++ Performance Modules
│   │   ├── src/            # Dinic's, Synergy, and NN source
│   │   └── bin/            # Compiled Binaries
│   └── uploads/            # User-uploaded files/media
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API Clients
│   │   ├── components/     # UI Components
│   │   ├── context/        # React Context Providers
│   │   ├── hooks/          # Custom React Hooks
│   │   └── pages/          # Application Views
└── CollabVerse_CP_Report.tex # Full Technical/Academic Report
```

---

## 📥 Installation & Setup

### 1. Prerequisites
*   Node.js 18+
*   Python 3.10+
*   C++ Compiler (GCC/Clang or MSVC)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🧠 Algorithmic Deep-Dive (DAA & CP Focus)

This project serves as a practical implementation of several core concepts from the **Design and Analysis of Algorithms (DAA)** curriculum and **Competitive Programming (CP)**.

### 1. Maximum Bipartite Matching (Network Flow)
To solve the team allocation problem, we model the community as a **Bipartite Graph** $G = (U \cup P, E)$, where $U$ is the set of users and $P$ is the set of project roles. 
*   **The Algorithm**: We implement **Dinic’s Algorithm** for Maximum Flow. While many textbooks suggest Ford-Fulkerson ($O(E \cdot f)$) or Edmonds-Karp ($O(VE^2)$), we chose Dinic's for its superior performance.
*   **The Model**: We transform the matching problem into a flow problem by adding a **Super Source (S)** connected to all users and a **Super Sink (T)** connected to all project roles. Every edge has a capacity of 1 to ensure 1-to-1 matching.
*   **Complexity**: On a bipartite network with unit capacities, Dinic’s algorithm runs in **$O(E\sqrt{V})$**, making it the most efficient choice for large-scale student matching.

### 2. Synergy Optimization (Dynamic Programming + Bitmasking)
When calculating the best possible team for a specific project, we face an optimization problem that would normally be $O(N!)$ if solved via brute force.
*   **The Algorithm**: **Bitmask DP**. We use an integer (mask) where each bit represents whether a project role is "filled" or "empty."
*   **State Transition**: `dp[student_idx][mask] = max(compatibility + solve(student_idx + 1, mask | (1 << role_idx)))`.
*   **Complexity**: This reduces the complexity to **$O(N \cdot 2^R)$**, where $N$ is the number of students and $R$ is the number of roles (typically small, e.g., 4-8), making it computationally feasible for real-time suggestions.

### 3. Graph Traversal & Connectivity
*   **BFS (Breadth-First Search)**: Used to construct the **Level Graph** in Dinic's algorithm, ensuring we only push flow along the shortest augmenting paths.
*   **DFS (Depth-First Search)**: Used to find **Blocking Flows** within the level graph during the augmentation phase.
*   **Complexity**: Both operate in **$O(V + E)$**, ensuring minimal overhead during pre-processing.

### 4. Memory-Efficient Data Structures
In competitive programming, memory limits are tight. 
*   **Adjacency Lists**: Instead of an $O(V^2)$ adjacency matrix, we use **Adjacency Lists** (`std::vector<std::vector<Edge>>`). This ensures our space complexity is strictly **$O(V + E)$**, allowing the engine to handle thousands of nodes and edges even on low-resource servers.
*   **STL Optimization**: We leverage the C++ Standard Template Library (STL) for fast `std::queue` operations and `std::vector` re-allocations.

---

## 📑 Technical Report & Proofs

For a deep dive into the mathematical proofs, formal complexity derivations, and LaTeX-formatted pseudocode, please refer to:
👉 **[LaTeX CP Report](./CollabVerse_CP_Report.tex)**


---

## 👥 Contributors
*   **Sansriti Mishra** (2401030293)
*   **Sanvi Dhingra** (2401030310)
*   **Anant Kumar Verma** (2401030295)

**Supervised By**: Dr. Kirti Jain & Dr. Aastha Maheswari
