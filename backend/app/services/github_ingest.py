import os
from github import Github
import concurrent.futures
from functools import lru_cache

class GitHubIngest:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GitHubIngest, cls).__new__(cls)
            token = os.getenv("GITHUB_TOKEN")
            if token:
                cls._instance.client = Github(token)
            else:
                cls._instance.client = Github()
            cls._instance.token = token
        return cls._instance

    @lru_cache(maxsize=128)
    def github_profile(self, username: str) -> dict | None:
        try:
            user = self.client.get_user(username)
            profile = {
                "login": user.login,
                "id": user.id,
                "avatar_url": user.avatar_url,
                "html_url": user.html_url,
                "name": user.name,
                "company": user.company,
                "blog": user.blog,
                "location": user.location,
                "public_repos": user.public_repos,
                "followers": user.followers,
                "following": user.following,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "bio": user.bio,
                "email": user.email
            }
            return profile
        except Exception as e:
            print(f"Error fetching GitHub profile for {username}: {e}")
            return None
        
    '''def _get_repos(self,username):
        try:
            user=self.client.get_user(username)
            repos=list(user.get_repos())
            return repos
        except Exception as e:
            print(f" Oh no ,seems like this engineer is a BOZO , couldn't even write a proper code to get repos of {username}: {e}")'''
            
    def _get_repos(self, username, include_forks=False):
        try:
            repos = list(self.client.get_user(username).get_repos())
            if not include_forks:
                repos = [r for r in repos if not r.fork]
            return repos
        except Exception as e:
            print(f"Error fetching repos for {username}: {e}")
            return []

        
    def _repo_lang(self,repo)->dict:
        try:
            languages=repo.get_languages()
            total=sum(languages.values()) or 1
            
            details = {
                "name": repo.name,
                "full_name": repo.full_name,
                "html_url": repo.html_url,
                "url": repo.html_url,
                "description": repo.description,
                "stars": repo.stargazers_count,
                "forks": repo.forks_count,
                "language": repo.language,
                "languages": {
                    lang.lower(): (count / total) * 100
                    for lang, count in languages.items()
                },
                "created_at": repo.created_at.isoformat(),
                "updated_at": repo.updated_at.isoformat(),
                "size": repo.size
            }
            return details
        except Exception as e:
            print(f"Error fetching language details for repo {repo.name}: {e}")
            
    @lru_cache(maxsize=64)
    def get_normalized_repos(self, username: str) -> list[dict]:
        # Implementation to fetch and normalize
        # We need to convert it to a tuple of dicts to make it cacheable if we return it,
        # but since we return list[dict], lru_cache might not work as expected with lists.
        # However, for simple data it's usually fine or we can return a tuple.
        repos = self._get_repos(username) or []
        normalized = []

        # Limit to 30 most recent repos to avoid timeout
        repos = sorted(repos, key=lambda r: r.updated_at, reverse=True)[:30]

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_repo = {executor.submit(self._repo_lang, repo): repo for repo in repos}
            for future in concurrent.futures.as_completed(future_to_repo, timeout=15):
                try:
                    data = future.result()
                    if data:
                        normalized.append(data)
                except Exception:
                    continue  

        return normalized
    
    '''
    #just learned how to fetch data from github
    def get_user_profile(self, username):
        try:
            user = self.client.get_user(username)
            repos = list(user.get_repos())
            
            profile = {
                "login": user.login,
                "id": user.id,
                "avatar_url": user.avatar_url,
                "url": user.url,
                "html_url": user.html_url,
                "name": user.name,
                "company": user.company,
                "blog": user.blog,
                "location": user.location,
                "twitter_username": user.twitter_username,
                "public_repos": user.public_repos,
                "public_gists": user.public_gists,
                "followers": user.followers,
                "following": user.following,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "bio": user.bio,
                "email": user.email,
                "star_count": sum(repo.stargazers_count for repo in repos),
                "tech_stack": self._analyze_tech_stack(repos)  # Add tech stack analysis
            }
            
            return profile
            
        except Exception as e:
            print(f"Error fetching user {username}: {e}")
            return None
    def user_get_top_repos(self,userrname, top_n=5):
        try:
            user = self.client.get_user(userrname)
            repos = list(user.get_repos())
            sorted_repos = sorted(repos, key=lambda r: r.stargazers_count, reverse=True)
            top_repos = [{
                "id": repo.id,
                "name": repo.name,
                "html_url": repo.html_url,
                "description": repo.description,
                "stargazers_count": repo.stargazers_count,
                "forks_count": repo.forks_count,
                "language": repo.language
            } for repo in sorted_repos[:top_n]]
            return top_repos
        except Exception as e:
            print(f"Error fetching top repos for user {userrname}: {e}")
            return None
        
    def analyze_tech_stack(self,repos):
        languages = []
        for repo in repos:
            if repo.language not in languages and repo.language is not None:
                languages.append(repo.language)
        return languages
    
    def get_tech_stack(self, username):
        try:
            user = self.client.get_user(username)
            repos = list(user.get_repos())
            tech_stack = self.analyze_tech_stack(repos)
            return tech_stack
        except Exception as e:
            print(f"Error analyzing tech stack for user {username}: {e}")
            return None
        '''
    
        
        
    

            