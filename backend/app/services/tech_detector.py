import re
from typing import List, Dict

class TechStackDetector:
    def __init__(self):
        print("✅ TechStackDetector initialized (simple keyword-based)")
        
        # Comprehensive tech stack keywords with weights
        self.tech_keywords = {
            # Frontend
            'React': {'keywords': ['react', 'reactjs', 'react.js'], 'weight': 2},
            'Vue.js': {'keywords': ['vue', 'vuejs', 'vue.js'], 'weight': 2},
            'Angular': {'keywords': ['angular'], 'weight': 2},
            'TypeScript': {'keywords': ['typescript', 'ts'], 'weight': 1.5},
            'JavaScript': {'keywords': ['javascript', 'js', 'ecmascript'], 'weight': 1},
            'HTML/CSS': {'keywords': ['html', 'css', 'sass', 'scss', 'less'], 'weight': 1},
            'Tailwind CSS': {'keywords': ['tailwind', 'tailwindcss'], 'weight': 1.5},
            
            # Backend
            'Node.js': {'keywords': ['node', 'nodejs', 'node.js'], 'weight': 2},
            'Python': {'keywords': ['python', 'py'], 'weight': 2},
            'Django': {'keywords': ['django'], 'weight': 2},
            'Flask': {'keywords': ['flask'], 'weight': 2},
            'FastAPI': {'keywords': ['fastapi'], 'weight': 2},
            'Express.js': {'keywords': ['express', 'expressjs'], 'weight': 1.5},
            'Java': {'keywords': ['java'], 'weight': 2},
            'Spring Boot': {'keywords': ['springboot', 'spring boot'], 'weight': 2},
            
            # Mobile
            'React Native': {'keywords': ['react native'], 'weight': 2},
            'Flutter': {'keywords': ['flutter'], 'weight': 2},
            
            # Databases
            'MySQL': {'keywords': ['mysql'], 'weight': 1.5},
            'PostgreSQL': {'keywords': ['postgresql', 'postgres'], 'weight': 1.5},
            'MongoDB': {'keywords': ['mongodb'], 'weight': 1.5},
            'Redis': {'keywords': ['redis'], 'weight': 1.5},
            
            # DevOps & Cloud
            'Docker': {'keywords': ['docker'], 'weight': 2},
            'Kubernetes': {'keywords': ['kubernetes', 'k8s'], 'weight': 2},
            'AWS': {'keywords': ['aws', 'amazon web services'], 'weight': 2},
            'Azure': {'keywords': ['azure'], 'weight': 1.5},
            'GitHub Actions': {'keywords': ['github actions'], 'weight': 1.5},
            
            # AI/ML
            'TensorFlow': {'keywords': ['tensorflow'], 'weight': 2},
            'PyTorch': {'keywords': ['pytorch'], 'weight': 2},
            'Scikit-learn': {'keywords': ['scikit-learn', 'sklearn'], 'weight': 1.5},
            
            # Tools
            'Git': {'keywords': ['git'], 'weight': 1},
            'REST API': {'keywords': ['rest', 'rest api', 'restful'], 'weight': 1},
            'GraphQL': {'keywords': ['graphql'], 'weight': 1.5},
        }

    def extract_clean_text(self, content: str) -> str:
        """Extract clean text from content"""
        # Remove code blocks
        content = re.sub(r'```.*?```', '', content, flags=re.DOTALL)
        # Remove inline code
        content = re.sub(r'`.*?`', '', content)
        # Remove URLs
        content = re.sub(r'http[s]?://\S+', '', content)
        # Remove special characters but keep spaces
        content = re.sub(r'[^\w\s]', ' ', content)
        return content.lower().strip()

    def detect_tech_stack(self, readme_content: str, repo_descriptions: List[str], filenames: List[str]) -> List[Dict]:
        """Detect tech stack using advanced keyword matching"""
        print("🔍 Analyzing content for technologies...")
        
        # Combine all text
        all_text = self.extract_clean_text(readme_content + " " + " ".join(repo_descriptions))
        
        tech_scores = {}
        
        # Method 1: Keyword matching with weights
        for tech, data in self.tech_keywords.items():
            score = 0
            for keyword in data['keywords']:
                if keyword in all_text:
                    # Count occurrences and apply weight
                    occurrences = all_text.count(keyword)
                    score += occurrences * data['weight']
            
            if score > 0:
                tech_scores[tech] = score
        
        # Method 2: File-based detection
        file_indicators = {
            'package.json': ['Node.js', 'JavaScript', 'TypeScript'],
            'requirements.txt': ['Python'],
            'Pipfile': ['Python'],
            'dockerfile': ['Docker'],
            'docker-compose.yml': ['Docker'],
            'composer.json': ['PHP'],
            'gemfile': ['Ruby'],
            'cargo.toml': ['Rust'],
            'go.mod': ['Go'],
        }
        
        for filename in filenames:
            filename_lower = filename.lower()
            for file_pattern, techs in file_indicators.items():
                if file_pattern in filename_lower:
                    for tech in techs:
                        tech_scores[tech] = tech_scores.get(tech, 0) + 3
        
        # Convert to final tech stack with confidence levels
        detected_tech = []
        for tech, score in tech_scores.items():
            confidence = min(score / 10.0, 1.0)
            
            # Determine skill level
            if confidence > 0.8:
                level = "expert"
            elif confidence > 0.6:
                level = "advanced" 
            elif confidence > 0.4:
                level = "intermediate"
            else:
                level = "beginner"
            
            detected_tech.append({
                "name": tech,
                "level": level,
                "confidence": round(confidence, 2)
            })
        
        # Sort by confidence
        detected_tech.sort(key=lambda x: x["confidence"], reverse=True)
        
        print(f"✅ Detected {len(detected_tech)} technologies")
        return detected_tech[:12]  # Return top 12