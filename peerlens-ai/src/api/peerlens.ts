// src/api/peerlens.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const PeerLensAPI = {
  async getAllStudents() {
    const res = await axios.get(`${API_BASE}/students`);
    return res.data;
  },

  async analyzeGitHub(username: string) {
    const res = await axios.post(`${API_BASE}/github/analyze/${username}`);
    return res.data;
  },

  async searchByTech(technology: string, minConfidence = 50) {
    const res = await axios.get(`${API_BASE}/github/search`, {
      params: { technology, min_confidence: minConfidence },
    });
    return res.data;
  },

  async getTrending() {
    const res = await axios.get(`${API_BASE}/github/trending`);
    return res.data;
  },

  async recommendTeam(mainStudentId: string, requiredSkills: string[], teamSize = 4) {
    const res = await axios.post(`${API_BASE}/teams/recommend`, {
      main_student_id: mainStudentId,
      required_skills: requiredSkills,
      team_size: teamSize,
    });
    return res.data;
  },

  async analyzeSkillGaps(studentId: string, requiredSkills: string[]) {
    const res = await axios.post(`${API_BASE}/skills/analyze-gaps`, {
      student_id: studentId,
      required_skills: requiredSkills,
    });
    return res.data;
  },
};
