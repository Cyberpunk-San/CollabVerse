from fastapi import APIRouter, HTTPException

from app.services.github_ingest import GitHubIngest
from app.services.repo_ranker import RepoRank

router = APIRouter(prefix="/repos", tags=["repos"])
ingest = GitHubIngest()
ranker = RepoRank()
@router.get("/{username}")
def get_repos(username :str):
    repos=ingest.get_normalized_repos(username)
    if not repos:
        raise HTTPException(
            status_code=404,
            detail="Oopsies ! You sure u entered the right username?"
        )

    return repos

@router.get("/{username}/top")
def get_top_repos(username: str, top_n: int = 3):
    repos = ingest.get_normalized_repos(username)
    if not repos:
        raise HTTPException(
            status_code=404,
            detail="Oopsies ! You sure u entered the right username?"
        )

    ranked_repos = ranker.rank_repos(repos)
    return {"username": username, "top_repos": ranked_repos[:top_n]}

#async is used when we are waiting for I/O operations like database calls or API requests
#looping
#calculating
#scoring
#aggregating
#ranking
#building teams
#applying rules