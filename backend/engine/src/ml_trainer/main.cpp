#include "neural_network.h"
#include <iostream>
#include <string>
#include <sstream>
#include <chrono>
#include "../dinic.h"
#include "../synergy_dpp.h"

// Simple JSON parser (in production, use a proper library)
class SimpleJSON {
public:
    static std::string escape(const std::string& str) {
        std::string result;
        for (char c : str) {
            if (c == '"') result += "\\\"";
            else if (c == '\\') result += "\\\\";
            else if (c == '\n') result += "\\n";
            else result += c;
        }
        return result;
    }
    
    static std::string create_response(const std::string& status, 
                                       const std::string& message,
                                       const std::string& data = "") {
        std::stringstream ss;
        ss << "{\"status\":\"" << status << "\","
           << "\"message\":\"" << escape(message) << "\"";
        if (!data.empty()) {
            ss << ",\"data\":" << data;
        }
        ss << "}";
        return ss.str();
    }
};

int main() {
    std::string line;
    std::getline(std::cin, line);
    
    try {
        // Parse command
        std::stringstream ss(line);
        std::string command;
        ss >> command;
        
        if (command == "train_skill_predictor") {
            std::string data_file;
            std::getline(std::cin, data_file);
            
            std::ifstream file(data_file);
            if (!file.is_open()) {
                std::cout << SimpleJSON::create_response("error", "Could not open training data file: " + data_file) << std::endl;
                return 0;
            }

            std::vector<NeuralNetwork::TrainingData> dataset;
            int num_samples;
            file >> num_samples;

            for (int i = 0; i < num_samples; i++) {
                NeuralNetwork::TrainingData data;
                data.input.resize(20);
                for (int j = 0; j < 20; j++) file >> data.input[j];
                
                data.expected_output.resize(4);
                for (int j = 0; j < 4; j++) file >> data.expected_output[j];
                
                dataset.push_back(data);
            }
            file.close();
            
            // Create network: 20 inputs, 16 hidden, 8 hidden, 4 outputs
            NeuralNetwork nn({20, 16, 8, 4}, 0.01f);
            
            auto result = nn.train(dataset, 100, 0.90f);
            
            // Save model
            nn.save_to_file("skill_model.dat");
            
            std::string response = SimpleJSON::create_response(
                "success",
                "Model trained successfully",
                "{\"accuracy\":" + std::to_string(result.accuracy) + 
                ",\"loss\":" + std::to_string(result.loss) +
                ",\"epochs\":" + std::to_string(result.epochs_trained) +
                ",\"model_id\":\"" + result.model_id + "\"}"
            );
            
            std::cout << response << std::endl;
            
        } else if (command == "train_team_predictor") {
            std::string data_file;
            std::getline(std::cin, data_file);
            
            std::ifstream file(data_file);
            if (!file.is_open()) {
                std::cout << SimpleJSON::create_response("error", "Could not open training data file: " + data_file) << std::endl;
                return 0;
            }

            std::vector<NeuralNetwork::TrainingData> dataset;
            int num_samples;
            file >> num_samples;

            for (int i = 0; i < num_samples; i++) {
                NeuralNetwork::TrainingData data;
                data.input.resize(40);
                for (int j = 0; j < 40; j++) file >> data.input[j];
                
                data.expected_output.resize(1);
                for (int j = 0; j < 1; j++) file >> data.expected_output[j];
                
                dataset.push_back(data);
            }
            file.close();
            
            // Create network: 40 inputs, 32 hidden, 16 hidden, 1 outputs
            NeuralNetwork nn({40, 32, 16, 1}, 0.01f);
            
            auto result = nn.train(dataset, 100, 0.90f);
            
            // Save model
            nn.save_to_file("team_model.dat");
            
            std::string response = SimpleJSON::create_response(
                "success",
                "Model trained successfully",
                "{\"accuracy\":" + std::to_string(result.accuracy) + 
                ",\"loss\":" + std::to_string(result.loss) +
                ",\"epochs\":" + std::to_string(result.epochs_trained) +
                ",\"model_id\":\"" + result.model_id + "\"}"
            );
            
            std::cout << response << std::endl;
            
        } else if (command == "predict_skill") {
            NeuralNetwork nn({20, 16, 8, 4});
            nn.load_from_file("skill_model.dat");
            
            // Read input features
            std::vector<float> input(20);
            for (int i = 0; i < 20; i++) {
                if (!(std::cin >> input[i])) break;
            }
            
            auto prediction = nn.predict(input);
            
            std::stringstream pred_ss;
            pred_ss << "[";
            for (size_t i = 0; i < prediction.size(); i++) {
                if (i > 0) pred_ss << ",";
                pred_ss << prediction[i];
            }
            pred_ss << "]";
            
            std::cout << SimpleJSON::create_response(
                "success",
                "Prediction complete",
                "{\"prediction\":" + pred_ss.str() + "}"
            ) << std::endl;
            
        } else if (command == "find_optimal_team") {
            NeuralNetwork nn({40, 32, 16, 1});
            bool has_model = nn.load_from_file("team_model.dat");

            int num_students;
            if (!(std::cin >> num_students)) throw std::runtime_error("Failed to read num_students");
            
            std::vector<std::vector<float>> student_features;
            for (int i = 0; i < num_students; i++) {
                std::vector<float> features(20);
                for (int j = 0; j < 20; j++) {
                    if (!(std::cin >> features[j])) break;
                }
                student_features.push_back(features);
            }
            
            // Build Bipartite Graph for Dinic's Algorithm
            // Graph Structure:
            // 0: Source (S)
            // 1 to num_students: Students Set A
            // num_students + 1 to 2 * num_students: Students Set B
            // 2 * num_students + 1: Sink (T)
            
            int source = 0;
            int sink = 2 * num_students + 1;
            int total_nodes = sink + 1;
            
            DinicSolver graph(total_nodes);
            
            // Connect Source to Set A
            for (int i = 1; i <= num_students; i++) {
                graph.add_edge(source, i, 1);
            }
            
            // Connect Set B to Sink
            for (int i = 1; i <= num_students; i++) {
                graph.add_edge(num_students + i, sink, 1);
            }
            
            // Calculate Synergy and Connect Set A to Set B
            for (int i = 0; i < num_students; i++) {
                for (int j = i + 1; j < num_students; j++) {
                    float compatibility = 0.0f;
                    
                    if (has_model) {
                        std::vector<float> combined(40);
                        for (int k = 0; k < 20; k++) {
                            combined[k] = student_features[i][k];
                            combined[k + 20] = student_features[j][k];
                        }
                        auto prediction = nn.predict(combined);
                        compatibility = prediction[0];
                    } else {
                        // Fallback Heuristic
                        for (int k = 0; k < 4; k++) { 
                            float diff = std::abs(student_features[i][k] - student_features[j][k]);
                            compatibility += (1.0f - diff) * 0.25f;
                        }
                    }
                    
                    // If compatibility > 5%, add directed edges in both permutations as valid matches
                    if (compatibility > 0.05f) {
                        // Scale compatibility to integer weight for flow, though Dinic cap is 1 for assignment
                        graph.add_edge(i + 1, num_students + (j + 1), 1);
                        graph.add_edge(j + 1, num_students + (i + 1), 1);
                    }
                }
            }
            
            // Execute Matchmaking
            long long max_matches = graph.max_flow(source, sink);
            
            // Extract assigned pairs
            auto raw_matches = graph.get_matches(1, num_students);
            
            // Filter duplicates (A matched to B is same as B matched to A)
            std::vector<std::pair<int, int>> best_pairs;
            std::vector<bool> assigned(num_students + 1, false);
            
            for (const auto& match : raw_matches) {
                int a = match.first;
                int b = match.second - num_students;
                if (!assigned[a] && !assigned[b]) {
                    best_pairs.push_back({a - 1, b - 1}); // Convert back to 0-indexed
                    assigned[a] = true;
                    assigned[b] = true;
                }
            }

            std::stringstream result_ss;
            result_ss << "[";
            for (size_t i = 0; i < best_pairs.size(); i++) {
                if (i > 0) result_ss << ",";
                result_ss << "{\"student1\":" << best_pairs[i].first 
                          << ",\"student2\":" << best_pairs[i].second 
                          << "}";
            }
            result_ss << "]";
            
            std::cout << SimpleJSON::create_response(
                "success",
                "Advanced Matchmaking flow complete. Max Matches: " + std::to_string(max_matches),
                "{\"pairs\":" + result_ss.str() + "}"
            ) << std::endl;
            
        } else {
            std::cout << SimpleJSON::create_response(
                "error",
                "Unknown command: " + command
            ) << std::endl;
        }
        
    } catch (const std::exception& e) {
        std::cout << SimpleJSON::create_response(
            "error",
            std::string("Exception: ") + e.what()
        ) << std::endl;
    }
    
    return 0;
}