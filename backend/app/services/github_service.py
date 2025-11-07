import aiohttp
import base64
import os
from typing import Dict, List, Optional
from .tech_detector import TechStackDetector

class GitHubService:
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.token = os.getenv("GITHUB_TOKEN", "")
        self.headers = {"User-Agent": "PeerLens-AI"}
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"
        
        self.tech_detector = TechStackDetector()

    async def get_user_data(self, username: str) -> Optional[Dict]:
        """Get basic user information from GitHub"""
        url = f"{self.base_url}/users/{username}"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Fetched GitHub data for {username}")
                        return data
                    elif response.status == 404:
                        print(f"❌ GitHub user {username} not found")
                        return None
                    else:
                        print(f"❌ GitHub API error: {response.status}")
                        return None
            except Exception as e:
                print(f"❌ Request error: {e}")
                return None

    async def get_user_repos(self, username: str) -> List[Dict]:
        """Get user repositories"""
        url = f"{self.base_url}/users/{username}/repos?sort=updated&per_page=50"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        repos = await response.json()
                        print(f"✅ Fetched {len(repos)} repos for {username}")
                        return repos
                    else:
                        print(f"❌ Could not fetch repos: {response.status}")
                        return []
            except Exception as e:
                print(f"❌ Repos request error: {e}")
                return []

    async def get_readme_content(self, username: str, repo_name: str) -> Optional[str]:
        """Get README content from a repository"""
        url = f"{self.base_url}/repos/{username}/{repo_name}/readme"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        readme_data = await response.json()
                        if 'content' in readme_data:
                            content = base64.b64decode(readme_data['content']).decode('utf-8')
                            return content
                    return None
            except Exception as e:
                print(f"❌ README request error for {repo_name}: {e}")
                return None

    async def analyze_github_profile(self, username: str) -> Dict:
        """Comprehensive GitHub profile analysis using tech detector"""
        print(f"🔍 Analyzing GitHub profile: {username}")
        
        # Get user basic info
        user_data = await self.get_user_data(username)
        if not user_data:
            raise Exception(f"GitHub user '{username}' not found")
        
        # Get user repositories
        repos = await self.get_user_repos(username)
        print(f"📁 Found {len(repos)} repositories")
        
        # Collect data for analysis
        all_readme_content = ""
        repo_descriptions = []
        all_filenames = []
        
        # Analyze top 15 most recent repos
        recent_repos = sorted(repos, key=lambda x: x.get('updated_at', ''), reverse=True)[:15]
        
        for repo in recent_repos:
            repo_name = repo['name']
            repo_description = repo.get('description', '')
            repo_language = repo.get('language', '')
            
            if repo_description:
                repo_descriptions.append(repo_description)
            
            if repo_language:
                repo_descriptions.append(f"Uses {repo_language} programming language")
            
            # Get README content
            readme_content = await self.get_readme_content(username, repo_name)
            if readme_content:
                all_readme_content += f"\n{readme_content}"
            
            # Get repository file structure (simplified)
            files_url = f"{self.base_url}/repos/{username}/{repo_name}/contents"
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(files_url, headers=self.headers) as response:
                        if response.status == 200:
                            files_data = await response.json()
                            for file_data in files_data:
                                if isinstance(file_data, dict) and 'name' in file_data:
                                    all_filenames.append(file_data['name'])
                except:
                    pass
        
        print(f"📄 Collected {len(all_readme_content)} chars from READMEs")
        print(f"📝 Collected {len(repo_descriptions)} repo descriptions")
        print(f"📂 Found {len(all_filenames)} files")
        
        # Detect tech stack using our AI detector
        tech_stack = self.tech_detector.detect_tech_stack(
            all_readme_content, 
            repo_descriptions, 
            all_filenames
        )
        
        print(f"🔧 Detected {len(tech_stack)} technologies")
        
        # Calculate GitHub stats
        total_stars = sum(repo.get('stargazers_count', 0) for repo in repos)
        total_forks = sum(repo.get('forks_count', 0) for repo in repos)
        
        # Analyze languages from repositories
        language_stats = {}
        for repo in repos:
            lang = repo.get('language')
            if lang:
                language_stats[lang] = language_stats.get(lang, 0) + repo.get('size', 0)
        
        return {
            "user_info": user_data,
            "tech_stack": tech_stack,
            "stats": {
                "repos": len(repos),
                "followers": user_data.get('followers', 0),
                "stars": total_stars,
                "forks": total_forks,
                "contributions": len(repos) * 5,  # Estimate
                "languages": language_stats
            },
            "repos_analyzed": len(recent_repos),
            "bio": user_data.get('bio', ''),
            "avatar_url": user_data.get('avatar_url', '')
        }