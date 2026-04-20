import subprocess
import json
import os
from typing import List, Dict, Any
import tempfile

class MLTrainer:
    def __init__(self):
        self.binary_path = self._find_binary()
        
    def _find_binary(self) -> str:
        """Find the ML trainer binary"""
        suffixes = ["", ".exe"]
        possible_dirs = [
            os.path.join(os.getcwd(), "bin"),
            os.path.join(os.getcwd(), "engine", "src", "ml_trainer"),
        ]
        
        for d in possible_dirs:
            for s in suffixes:
                path = os.path.join(d, "ml_trainer" + s)
                if os.path.exists(path):
                    return path
        raise FileNotFoundError("ML Trainer binary not found")
    
    def _run_command(self, command: str, input_data: str = "") -> Dict[str, Any]:
        """Run a command and parse JSON response"""
        try:
            process = subprocess.Popen(
                [self.binary_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            full_input = command + "\n" + input_data
            stdout, stderr = process.communicate(input=full_input, timeout=30)
            
            if stderr:
                print(f"ML Trainer stderr: {stderr}")
            
            if not stdout:
                return {"status": "error", "message": f"Empty output from ML Trainer. Stderr: {stderr}"}
                
            try:
                # Find the start of the JSON object
                start_index = stdout.find('{')
                if start_index != -1:
                    json_str = stdout[start_index:]
                    return json.loads(json_str)
                return json.loads(stdout)
            except json.JSONDecodeError:
                return {"status": "error", "message": f"Invalid JSON from ML Trainer: {stdout[:100]}. Stderr: {stderr}"}
            
        except subprocess.TimeoutExpired:
            process.kill()
            return {"status": "error", "message": "Timeout"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def train_skill_predictor(self, training_data: List[Dict]) -> Dict[str, Any]:
        """Train model to predict skill improvements"""
        # Save training data to temp file in simple text format
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(f"{len(training_data)}\n")
            for item in training_data:
                # Features (11)
                feat = self._extract_features(item["features"])
                f.write(" ".join(map(str, feat)) + " ")
                
                # Outcomes (4)
                outcomes = item["outcomes"].get("skill_improvements", {})
                target = [
                    outcomes.get("python", 0),
                    outcomes.get("javascript", 0),
                    outcomes.get("cpp", 0),
                    outcomes.get("teamwork", 0)
                ]
                f.write(" ".join(map(str, target)) + "\n")
            temp_file = f.name
        
        try:
            result = self._run_command("train_skill_predictor", temp_file)
            if os.path.exists(temp_file):
                os.unlink(temp_file)
            return result
        except Exception as e:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
            return {"status": "error", "message": str(e)}
            
    def train_team_predictor(self, training_data: List[Dict]) -> Dict[str, Any]:
        """Train model to predict team compatibility"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(f"{len(training_data)}\n")
            for item in training_data:
                feat1 = self._extract_features(item["features1"])
                feat2 = self._extract_features(item["features2"])
                f.write(" ".join(map(str, feat1)) + " ")
                f.write(" ".join(map(str, feat2)) + "\n")
                
                # Outcomes (1)
                compatibility = item["outcomes"].get("compatibility", 0.0)
                f.write(f"{compatibility}\n")
            temp_file = f.name
        
        try:
            result = self._run_command("train_team_predictor", temp_file)
            if os.path.exists(temp_file):
                os.unlink(temp_file)
            return result
        except Exception as e:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
            return {"status": "error", "message": str(e)}
    
    def predict_skill_improvement(self, student_features: List[float]) -> Dict[str, Any]:
        """Predict how a student's skills will improve"""
        input_str = " ".join(map(str, student_features))
        return self._run_command("predict_skill", input_str)
    
    def find_optimal_team(self, students: List[Dict]) -> Dict[str, Any]:
        """Find optimal team combinations"""
        # Convert students to feature vectors
        features = []
        for student in students:
            feature_vec = self._extract_features(student)
            features.append(feature_vec)
        
        input_str = str(len(features)) + "\n"
        for feat in features:
            input_str += " ".join(map(str, feat)) + "\n"
        
        return self._run_command("find_optimal_team", input_str)
    
    def _extract_features(self, student: Dict) -> List[float]:
        """Extract numerical features from student data"""
        features = []
        
        # GitHub (6)
        features.append(min(1.0, student.get("commits", 0) / 2000))
        features.append(min(1.0, student.get("pull_requests", 0) / 500))
        features.append(min(1.0, student.get("reviews", 0) / 300))
        features.append(min(1.0, student.get("repositories", 0) / 50))
        features.append(min(1.0, student.get("stars", 0) / 1000))
        features.append(min(1.0, student.get("forks", 0) / 500))
        
        # Skills (6)
        skills = student.get("skills", {})
        features.append(skills.get("python", 0))
        features.append(skills.get("javascript", 0))
        features.append(skills.get("cpp", 0))
        features.append(skills.get("java", 0))
        features.append(skills.get("go", 0))
        features.append(skills.get("rust", 0))
        
        # Collaboration (6)
        features.append(min(1.0, student.get("teams_count", 0) / 20))
        features.append(min(1.0, student.get("projects_count", 0) / 30))
        # Response time inverse (max 48h)
        resp_time = student.get("avg_response_time", 24)
        features.append(min(1.0, 1.0 - (resp_time / 48)))
        features.append(min(1.0, student.get("messages_sent", 0) / 1000))
        features.append(min(1.0, student.get("help_given", 0) / 100))
        features.append(min(1.0, student.get("help_received", 0) / 100))
        
        # Learning (2)
        features.append(min(1.0, student.get("courses_count", 0) / 30))
        features.append(min(1.0, student.get("tutorials_count", 0) / 100))
        
        return features

# Singleton instance
ml_trainer = MLTrainer()