def estimate_skills(features: dict) -> dict:
    skills = {}

    for tech, value in features.items():
        if value >= 80:
            skills[tech] = 4  
        elif value >= 50:
            skills[tech] = 3
        elif value >= 30:
            skills[tech] = 2
        else:
            skills[tech] = 1

    return skills