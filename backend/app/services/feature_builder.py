def agg_lang_features(repos: list[dict])->dict:
    languages = {}
    for repo in repos:
        for lang, percent in repo.get("languages", {}).items():
            languages[lang] = languages.get(lang, 0) + percent
    repo_count = len(repos) or 1
    for lang in languages:
        languages[lang] = languages[lang] / repo_count
    return languages

def normalize_features(languages: dict, cap: float = 100.0) -> dict:
    outcome ={
        
        lang: min(value, cap)
        for lang, value in languages.items()
    }
    return outcome

def build_features(repos: list[dict])->dict:
    raw_langs = agg_lang_features(repos)
    normalized_langs = normalize_features(raw_langs)
    return normalized_langs

