#include "neural_network.h"
#include <json/json.h>
#include <fstream>
#include <algorithm>

class StudentDataProcessor {
private:
    struct StudentFeatures {
        // GitHub activity
        int total_commits;
        int total_prs;
        int total_reviews;
        int repos_owned;
        int stars_received;
        int forks_count;
        
        // Skills (normalized 0-1)
        float python_proficiency;
        float javascript_proficiency;
        float cpp_proficiency;
        float java_proficiency;
        float go_proficiency;
        float rust_proficiency;
        
        // Collaboration metrics
        int teams_joined;
        int projects_completed;
        float avg_response_time;
        int messages_sent;
        int help_given;
        int help_received;
        
        // Learning metrics
        int courses_completed;
        int tutorials_finished;
        float avg_quiz_score;
        int days_active;
    };
    
public:
    // Convert student data to neural network input
    std::vector<float> extract_features(const Json::Value& student_json) {
        StudentFeatures features;
        
        // Parse JSON into features
        features.total_commits = student_json["github"]["commits"].asInt();
        features.total_prs = student_json["github"]["pull_requests"].asInt();
        features.total_reviews = student_json["github"]["reviews"].asInt();
        features.repos_owned = student_json["github"]["repositories"].asInt();
        features.stars_received = student_json["github"]["stars"].asInt();
        features.forks_count = student_json["github"]["forks"].asInt();
        
        // Parse skills
        features.python_proficiency = student_json["skills"]["python"].asFloat();
        features.javascript_proficiency = student_json["skills"]["javascript"].asFloat();
        features.cpp_proficiency = student_json["skills"]["cpp"].asFloat();
        features.java_proficiency = student_json["skills"]["java"].asFloat();
        features.go_proficiency = student_json["skills"]["go"].asFloat();
        features.rust_proficiency = student_json["skills"]["rust"].asFloat();
        
        // Parse collaboration
        features.teams_joined = student_json["collaboration"]["teams"].asInt();
        features.projects_completed = student_json["collaboration"]["projects_completed"].asInt();
        features.avg_response_time = student_json["collaboration"]["avg_response_time"].asFloat();
        features.messages_sent = student_json["collaboration"]["messages_sent"].asInt();
        features.help_given = student_json["collaboration"]["help_given"].asInt();
        features.help_received = student_json["collaboration"]["help_received"].asInt();
        
        // Parse learning
        features.courses_completed = student_json["learning"]["courses"].asInt();
        features.tutorials_finished = student_json["learning"]["tutorials"].asInt();
        features.avg_quiz_score = student_json["learning"]["avg_quiz_score"].asFloat();
        features.days_active = student_json["learning"]["days_active"].asInt();
        
        // Convert to vector and normalize
        return normalize_features(features);
    }
    
    // Create training data for skill prediction
    std::vector<NeuralNetwork::TrainingData> create_skill_prediction_data(
        const std::vector<Json::Value>& students) {
        
        std::vector<NeuralNetwork::TrainingData> dataset;
        
        for (const auto& student : students) {
            NeuralNetwork::TrainingData data;
            
            // Input: past activity and current skills
            data.input = {
                (float)student["github"]["commits"].asInt() / 1000.0f,
                (float)student["github"]["pull_requests"].asInt() / 100.0f,
                (float)student["github"]["reviews"].asInt() / 100.0f,
                (float)student["github"]["repositories"].asInt() / 50.0f,
                (float)student["github"]["stars"].asInt() / 500.0f,
                (float)student["github"]["forks"].asInt() / 200.0f,
                student["skills"]["python"].asFloat(),
                student["skills"]["javascript"].asFloat(),
                student["skills"]["cpp"].asFloat(),
                (float)student["learning"]["courses"].asInt() / 20.0f,
                (float)student["learning"]["tutorials"].asInt() / 50.0f,
                student["learning"]["avg_quiz_score"].asFloat() / 100.0f
            };
            
            // Output: future skill improvements (next 3 months)
            data.expected_output = {
                student["future"]["python_improvement"].asFloat(),
                student["future"]["javascript_improvement"].asFloat(),
                student["future"]["cpp_improvement"].asFloat(),
                student["future"]["teamwork_improvement"].asFloat()
            };
            
            dataset.push_back(data);
        }
        
        return dataset;
    }
    
    // Create training data for team compatibility
    std::vector<NeuralNetwork::TrainingData> create_team_compatibility_data(
        const std::vector<std::pair<Json::Value, Json::Value>>& teams) {
        
        std::vector<NeuralNetwork::TrainingData> dataset;
        
        for (const auto& team : teams) {
            const auto& student1 = team.first;
            const auto& student2 = team.second;
            
            NeuralNetwork::TrainingData data;
            
            // Input: features from both students
            data.input = {
                // Student 1 skills
                student1["skills"]["python"].asFloat(),
                student1["skills"]["javascript"].asFloat(),
                student1["skills"]["cpp"].asFloat(),
                student1["skills"]["java"].asFloat(),
                
                // Student 2 skills
                student2["skills"]["python"].asFloat(),
                student2["skills"]["javascript"].asFloat(),
                student2["skills"]["cpp"].asFloat(),
                student2["skills"]["java"].asFloat(),
                
                // Activity levels
                (float)student1["github"]["commits"].asInt() / 500.0f,
                (float)student2["github"]["commits"].asInt() / 500.0f,
                
                // Previous collaboration
                student1["collaboration"]["teams"].asFloat() / 10.0f,
                student2["collaboration"]["teams"].asFloat() / 10.0f,
                
                // Timezone difference (simplified)
                std::abs(student1["timezone"].asFloat() - student2["timezone"].asFloat()) / 24.0f
            };
            
            // Output: compatibility score (0-1)
            data.expected_output = {
                student1["compatibility_with"][std::to_string(student2["id"].asInt())].asFloat()
            };
            
            dataset.push_back(data);
        }
        
        return dataset;
    }
    
private:
    std::vector<float> normalize_features(const StudentFeatures& features) {
        std::vector<float> normalized;
        
        // GitHub (6)
        normalized.push_back(std::min(1.0f, features.total_commits / 2000.0f));
        normalized.push_back(std::min(1.0f, features.total_prs / 500.0f));
        normalized.push_back(std::min(1.0f, features.total_reviews / 300.0f));
        normalized.push_back(std::min(1.0f, features.repos_owned / 50.0f));
        normalized.push_back(std::min(1.0f, features.stars_received / 1000.0f));
        normalized.push_back(std::min(1.0f, features.forks_count / 500.0f));
        
        // Skills (6)
        normalized.push_back(features.python_proficiency);
        normalized.push_back(features.javascript_proficiency);
        normalized.push_back(features.cpp_proficiency);
        normalized.push_back(features.java_proficiency);
        normalized.push_back(features.go_proficiency);
        normalized.push_back(features.rust_proficiency);
        
        // Collaboration (6)
        normalized.push_back(std::min(1.0f, features.teams_joined / 20.0f));
        normalized.push_back(std::min(1.0f, features.projects_completed / 30.0f));
        normalized.push_back(std::min(1.0f, 1.0f - (features.avg_response_time / 48.0f)));
        normalized.push_back(std::min(1.0f, features.messages_sent / 1000.0f));
        normalized.push_back(std::min(1.0f, features.help_given / 100.0f));
        normalized.push_back(std::min(1.0f, features.help_received / 100.0f));
        
        // Learning (2)
        normalized.push_back(std::min(1.0f, features.courses_completed / 30.0f));
        normalized.push_back(std::min(1.0f, features.tutorials_finished / 100.0f));
        
        return normalized;
    }
};