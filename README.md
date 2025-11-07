<div align="center">

# 🧬 CollabVerse  
### *Find your perfect campus match — for projects, not dates 😉*

![Built with React](https://img.shields.io/badge/Built%20with-React-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green?style=for-the-badge&logo=fastapi)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript)
![Python](https://img.shields.io/badge/AI-Python-yellow?style=for-the-badge&logo=python)
![License: MIT](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Database-Firebase-red?style=for-the-badge&logo=firebase)

</div>

---

## 📖 Overview

**CollabVerse** is an **AI-powered campus skill network** that helps students discover who to collaborate with — whether for hackathons, projects, or research.  
It maps out the skills of students from their **GitHub activity** and visualizes them as a dynamic **social graph**.

> Think *LinkedIn + GitHub + AI*, but built for your campus.

---

## 🚀 Features

- 🔍 **AI-Based Skill Detection** – Analyzes GitHub repos and READMEs to identify a student’s tech stack.
- 🌐 **Interactive Skill Graph** – D3.js visualization that connects students by shared or complementary skills.
- ⚡ **Skill Search** – Type “React”, “AI”, or “Robotics” to instantly highlight matching profiles.
- 🤖 **AI Team Recommendations** – Suggests ideal teammates using skill embeddings and GPT analysis.
- 👤 **Smart Profiles** – View student cards with skills, GitHub links, and collaboration interests.
- 🔄 **Real-Time Updates** – Automatically refreshes data as students update their projects.

---

## 🧠 Why CollabVerse

Unlike LinkedIn, which connects people for jobs, **CollabVerse connects students for collaboration**.  
It uses *real project data* instead of self-declared skills — so the network is authentic, visual, and built on actual coding work.

> 💡 CollabVerse turns your campus into a living skill map — so you can *find the right person to build with, instantly.*

---

## ⚙️ Tech Stack

### 🖥️ **Frontend**
- React + TypeScript  
- D3.js (for graph visualization)  
- Tailwind CSS (for styling & animations)  

### ⚙️ **Backend**
- FastAPI (Python REST API)  
- Sentence Transformers (for skill embeddings)  
- GPT-4o (for teammate suggestions & summaries)  

### ☁️ **Database & Auth**
- Firebase (Firestore + Authentication)  
- GitHub REST API (for project data)

---


---

## 🧰 Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<your-username>/CollabVerse.git
cd CollabVerse
cd backend
uvicorn app.main:app --reload --port 8000 
cd ../peerlens-ai
npm install
npm run dev




