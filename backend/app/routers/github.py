from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.services.github_service import GitHubService
from app.routers.students import students_db  # shared in-memory DB

router = APIRouter()
github_service = GitHubService()

# In-memory cache for analyzed profiles
student_cache = {}


@router.post("/analyze/{username}")
async def analyze_github_profile(username: str):
    """Analyze a GitHub profile and extract technologies."""
    print(f"🔍 Analyzing GitHub profile: {username}")

    # Check cache first
    if username.lower() in student_cache:
        print(f"🎯 Using cached data for {username}")
        return student_cache[username.lower()]

    # Fetch GitHub user data
    user_data = await github_service.get_user_data(username)
    if not user_data:
        raise HTTPException(status_code=404, detail="GitHub user not found")

    # Fetch repositories
    repos = await github_service.get_user_repos(username)
    print(f"📁 Retrieved {len(repos)} repositories for {username}")

    # Prepare data for tech stack detection
    readme_texts = " ".join([repo.get("description", "") or "" for repo in repos])
    repo_descriptions = [repo.get("description", "") or "" for repo in repos]
    repo_names = [repo["name"] for repo in repos]

    # Detect technologies using the TechStackDetector inside GitHubService
    tech_stack = github_service.tech_detector.detect_tech_stack(
        readme_texts, repo_descriptions, repo_names
    )

    # Calculate basic GitHub statistics
    total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)
    total_forks = sum(repo.get("forks_count", 0) for repo in repos)

    # Aggregate language usage
    language_stats = {}
    for repo in repos:
        lang = repo.get("language")
        if lang:
            language_stats[lang] = language_stats.get(lang, 0) + repo.get("size", 0)

    # Build student object
    student = {
        "id": username.lower(),
        "name": user_data.get("name", username),
        "github_username": username,
        "avatar_url": user_data.get("avatar_url", ""),
        "bio": user_data.get("bio", ""),
        "tech_stack": tech_stack,
        "github_stats": {
            "repos": user_data.get("public_repos", 0),
            "followers": user_data.get("followers", 0),
            "stars": total_stars,
            "forks": total_forks,
            "languages": language_stats,
        },
        "projects": [repo["name"] for repo in repos[:5]],
        "seeking": ["Hackathon Team", "Open Source Collaboration"],
        "last_updated": datetime.now().isoformat(),
    }

    # Save to global student DB + cache
    students_db[username.lower()] = student
    student_cache[username.lower()] = student

    print(f"✅ Analysis complete for {username} - added to students database.")
    return student
