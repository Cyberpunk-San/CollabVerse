from app.domain.mean_balancer import mean_team_skill


def tech_coverage(team: list[dict]) -> set[str]:
    techs = set()
    for member in team:
        techs.update(member.get("skills", {}).keys())
    return techs


def has_min_techs(team: list[dict], min_techs: int) -> bool:
    return len(tech_coverage(team)) >= min_techs


def has_min_mean_skill(team: list[dict], min_mean_skill: float) -> bool:
    return mean_team_skill(team) >= min_mean_skill


def is_valid_team(
    team: list[dict],
    min_mean_skill: float,
    min_techs: int
) -> bool:
    return (
        has_min_mean_skill(team, min_mean_skill)
        and has_min_techs(team, min_techs)
    )
