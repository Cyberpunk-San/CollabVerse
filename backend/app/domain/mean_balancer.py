def mean_team_skill(team: list) -> float:
    total = 0
    count = 0

    for member in team:
        # Handle both SQLAlchemy objects and dictionary structures gracefully
        skills = member.get("skills", {}) if getattr(member, "get", None) else getattr(member, 'skills', {})
        
        if skills:
            for level in skills.values():
                total += level
                count += 1

    return total / count if count else 0.0
