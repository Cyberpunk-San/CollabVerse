class RepoRank:
    def score_repo(self, repo: dict) -> float:
        score = 0.0

        score += min(repo.get("stars", 0), 50) * 0.4
        score += min(repo.get("forks", 0), 30) * 0.2
        score += min(len(repo.get("languages", {})), 10) * 0.4

        return score

    def rank_repos(self, repos: list[dict]) -> list[dict]:
        return sorted(
            repos,
            key=lambda repo: self.score_repo(repo),
            reverse=True
        )

    def get_top_ranked_repos(
        self,
        repos: list[dict],
        top_n: int = 5
    ) -> list[dict]:
        return self.rank_repos(repos)[:top_n]
