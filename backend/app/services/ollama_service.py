# app/services/ollama_service.py
import httpx
import json
from typing import List, Dict, Any
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)


class OllamaService:
    """
    Service for communicating with the local Ollama API to perform AI-driven analysis.
    """

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "phi3:mini")

    async def _post_to_ollama(self, prompt: str, timeout: float = 45.0) -> Dict[str, Any]:
        """
        Internal helper to send prompt requests to Ollama safely and parse the JSON output.
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    },
                )

            if response.status_code != 200:
                logger.error(f"Ollama API error {response.status_code}: {response.text}")
                return {"error": f"Ollama API returned {response.status_code}"}

            result = response.json()
            text = result.get("response", "").strip()

            # Clean extra markdown or formatting
            text = text.replace("```json", "").replace("```", "").strip()

            # Parse JSON safely
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse Ollama JSON response: {text[:200]}...")
                return {"error": "Invalid JSON from model", "raw": text}

        except httpx.RequestError as e:
            return {"error": f"Network error: {str(e)}"}
        except Exception as e:
            return {"error": f"Unexpected error in Ollama service: {str(e)}"}

    # ---------------------------------------------------------------------- #
    #                         ANALYSIS FUNCTIONS                             #
    # ---------------------------------------------------------------------- #

    async def analyze_student_profile(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a student's GitHub profile and generate AI insights.
        """
        prompt = f"""
        You are an AI career assistant analyzing a GitHub developer's profile.

        Profile Summary:
        - Name: {student_data.get('name', '')}
        - Username: {student_data.get('github_username', '')}
        - Bio: {student_data.get('bio', 'No bio provided')}
        - Repositories: {student_data.get('public_repos', 0)}
        - Followers: {student_data.get('followers', 0)}
        - Stars: {student_data.get('total_stars', 0)}
        - Forks: {student_data.get('total_forks', 0)}
        - Top Languages: {list(student_data.get('languages', {}).keys())}
        - Tech Stack: {[t.get('name') for t in student_data.get('tech_stack', [])]}
        - Seeking: {student_data.get('seeking', [])}

        Return JSON with:
        {{
          "technical_skills": [{{"name": "Python", "proficiency": "advanced"}}],
          "experience_level": "beginner"|"intermediate"|"advanced"|"expert",
          "specialization_areas": ["Web Development", "AI/ML"],
          "collaboration_strengths": ["communication", "mentorship"],
          "learning_interests": ["cloud computing", "TypeScript"]
        }}
        Only output valid JSON.
        """
        return await self._post_to_ollama(prompt, timeout=45.0)

    async def generate_team_recommendation(
        self,
        main_student: Dict[str, Any],
        candidates: List[Dict[str, Any]],
        required_skills: List[str],
    ) -> Dict[str, Any]:
        """
        Generate an AI-based team recommendation given a project and candidate pool.
        """
        main_info = f"{main_student.get('name')} (@{main_student.get('github_username')})"
        candidate_descriptions = "\n".join(
            [
                f"- {cand.get('name')} ({cand.get('github_username')}): Skills = {[t['name'] for t in cand.get('tech_stack', [])]}"
                for cand in candidates
            ]
        )

        prompt = f"""
        You are an AI expert in hackathon team formation.
        Task: Select the best 3 members from the candidate pool to complement {main_info}.

        Project Requirements: {required_skills}

        Main Member:
        Skills = {[t.get('name') for t in main_student.get('tech_stack', [])]}
        Experience = {main_student.get('ai_analysis', {}).get('experience_level', 'intermediate')}

        Candidate Pool:
        {candidate_descriptions}

        Return JSON in this format:
        {{
          "selected_members": [
            {{"candidate": "GitHubUsername", "compatibility_score": 9.1}}
          ],
          "reasoning": "Why this team composition works best",
          "role_assignments": {{
            "Lead Developer": "main_student_name",
            "Backend Developer": "candidate_1",
            "Frontend Developer": "candidate_2"
          }},
          "skill_coverage": {{
            "Python": "covered by main_student",
            "React": "covered by candidate_2"
          }},
          "team_strengths": ["balanced skill set", "good communication"],
          "potential_challenges": ["limited DevOps experience"]
        }}
        Output must be valid JSON.
        """
        return await self._post_to_ollama(prompt, timeout=60.0)
