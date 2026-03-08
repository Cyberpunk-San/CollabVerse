def scale_skill(value: float) -> int:
    if value >= 80:
        return 4
    elif value >= 50:
        return 3
    elif value >= 30:
        return 2
    else:
        return 1