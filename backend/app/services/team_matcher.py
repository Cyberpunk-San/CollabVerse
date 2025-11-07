# app/services/team_matcher.py
from typing import List, Dict, Any
import asyncio
import math
import logging

from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)


class TeamMatcher:
    """
    Hybrid team-matching service.
    Combines deterministic skill-matching with AI reasoning from Ollama.
    """

    def __init__(self):
        self.ollama = OllamaService()

    # -----------------------------------------------------------
    #              BASELINE SCORING FUNCTIONS
    # -----------------------------------------------------------

    def _compute_skill_overlap(self, main_skills: List[str], candidate_skills: List[str]) -> float:
        """
        Compute overlap between two skill lists (0–1).
        """
        if not main_skills or not candidate_skills:
            return 0.0
        overlap = len(set(main_skills) & set(candidate_skills))
        total_unique = len(set(main_skills) | set(candidate_skills))
        return round(overlap / total_unique, 3)

    def _experience_weight(self, exp: str) -> float:
        """
        Convert AI experience labels into numerical weights.
        """
        mapping = {
            "beginner": 0.3,
            "intermediate": 0.6,
            "advanced": 0.8,
            "expert": 1.0
        }
        return mapping.get(exp.lower(), 0.5)

    def _calculate_compatibility(self, main_student: Dict, candidate: Dict) -> float:
        """
        Determine compatibility score (0–10) between two students.
        Based on shared skills, diversity, experience, and interests.
        """
        main_skills = [t["name"].lower() for t in main_student.get("tech_stack", [])]
        candidate_skills = [t["name"].lower() for t in candidate.get("tech_stack", [])]

        overlap = self._compute_skill_overlap(main_skills, candidate_skills)
        exp_main = self._experience_weight(
            main_student.get("ai_analysis", {}).get("experience_level", "intermediate")
        )
        exp_candidate = self._experience_weight(
            candidate.get("ai_analysis", {}).get("experience_level", "intermediate")
        )

        exp_balance = 1 - abs(exp_main - exp_candidate)
        shared_interests = len(set(main_student.get("seeking", [])) & set(candidate.get("seeking", [])))
        shared_interest_score = min(shared_interests / 3, 1)

        compatibility = (
            (overlap * 0.5) +
            (exp_balance * 0.3) +
            (shared_interest_score * 0.2)
        ) * 10  # scale 0–10

        return round(compatibility, 2)

    # -----------------------------------------------------------
    #             MAIN TEAM FORMATION LOGIC
    # -----------------------------------------------------------

    async def find_optimal_team(
        self,
        main_student: Dict[str, Any],
        other_students: List[Dict[str, Any]],
        required_skills: List[str],
        team_size: int = 4
    ) -> Dict[str, Any]:
        """
        Find an optimal team based on hybrid scoring + AI reasoning.
        """

        # 1️⃣ Compute baseline compatibility for all candidates
        scored_candidates = []
        for candidate in other_students:
            score = self._calculate_compatibility(main_student, candidate)
            scored_candidates.append({
                "student": candidate,
                "compatibility_score": score
            })

        # Sort by score
        scored_candidates.sort(key=lambda c: c["compatibility_score"], reverse=True)

        # Select top (team_size - 1)
        top_candidates = scored_candidates[: max(1, team_size - 1)]

        # 2️⃣ Generate reasoning using Ollama
        try:
            ai_response = await self.ollama.generate_team_recommendation(
                main_student=main_student,
                candidates=[c["student"] for c in top_candidates],
                required_skills=required_skills
            )
        except Exception as e:
            logger.error(f"Ollama team recommendation failed: {e}")
            ai_response = {"error": "AI reasoning unavailable"}

        # 3️⃣ Merge deterministic + AI data
        team_result = {
            "members": [],
            "reasoning": ai_response.get("reasoning", "Team formed using skill and experience matching."),
            "total_score": 0.0
        }

        total_score = 0
        for member in top_candidates:
            student = member["student"]
            score = member["compatibility_score"]
            total_score += score

            role = "Contributor"
            if ai_response.get("role_assignments"):
                for k, v in ai_response["role_assignments"].items():
                    if v == student.get("github_username") or v == student.get("name"):
                        role = k
                        break

            strengths = ai_response.get("team_strengths", ["good balance", "technical diversity"])

            team_result["members"].append({
                "student": student,
                "compatibility_score": score,
                "role": role,
                "strengths": strengths
            })

        team_result["total_score"] = round(total_score / len(top_candidates), 2)
        return team_result

    # -----------------------------------------------------------
    #              SKILL GAP ANALYSIS
    # -----------------------------------------------------------

    async def analyze_skill_gaps(self, student: Dict[str, Any], required_skills: List[str]) -> Dict[str, Any]:
        """
        Compare a student's skill set to required project skills.
        """
        student_skills = {t["name"].lower(): t.get("confidence", 0) for t in student.get("tech_stack", [])}
        missing = []
        partial = []
        covered = []

        for skill in required_skills:
            s = skill.lower()
            confidence = student_skills.get(s, 0)
            if confidence >= 70:
                covered.append(skill)
            elif 30 <= confidence < 70:
                partial.append(skill)
            else:
                missing.append(skill)

        coverage_score = round((len(covered) + 0.5 * len(partial)) / len(required_skills) * 100, 2)

        return {
            "student_name": student.get("name"),
            "required_skills": required_skills,
            "covered": covered,
            "partial": partial,
            "missing": missing,
            "coverage_score": coverage_score
        }
