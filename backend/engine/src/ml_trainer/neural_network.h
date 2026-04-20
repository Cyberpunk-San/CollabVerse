#ifndef NEURAL_NETWORK_H
#define NEURAL_NETWORK_H

#include <vector>
#include <string>
#include <random>
#include <chrono>
#include <fstream>
#include <sstream>
#include <iostream>
#include <cmath>
#include <algorithm>
#include <ctime>

class NeuralNetwork {
private:
    struct Layer {
        std::vector<std::vector<float>> weights;
        std::vector<float> biases;
        std::vector<float> outputs;
        std::vector<float> deltas;
        
        Layer(int input_size, int output_size);
        void initialize_xavier(int input_size, int output_size);
    };

    std::vector<Layer> layers;
    float learning_rate;
    std::mt19937 rng;

    // Activation functions
    float sigmoid(float x);
    float sigmoid_derivative(float x);
    float relu(float x);
    float relu_derivative(float x);
    float tanh_derivative(float x);

public:
    // Constructor
    NeuralNetwork(const std::vector<int>& layer_sizes, float lr = 0.01f);
    
    // Core operations
    std::vector<float> forward(const std::vector<float>& input);
    void backward(const std::vector<float>& expected);
    void update_weights();
    
    // Training
    struct TrainingData {
        std::vector<float> input;
        std::vector<float> expected_output;
    };
    
    struct TrainingResult {
        float accuracy;
        float loss;
        int epochs_trained;
        std::vector<float> loss_history;
        std::vector<float> accuracy_history;
        std::string model_id;
    };
    
    TrainingResult train(const std::vector<TrainingData>& dataset, 
                        int epochs, 
                        float target_accuracy = 0.95f,
                        int batch_size = 32,
                        float validation_split = 0.2f);
    
    // Evaluation
    float evaluate(const std::vector<TrainingData>& dataset);
    std::vector<float> predict(const std::vector<float>& input);
    
    // Model persistence
    std::string save_model();
    bool load_model(const std::string& model_str);
    bool save_to_file(const std::string& filename);
    bool load_from_file(const std::string& filename);
    
    // Getters
    int get_input_size() const { return layers.empty() ? 0 : layers[0].weights[0].size(); }
    int get_output_size() const { return layers.empty() ? 0 : layers.back().weights.size(); }
    float get_learning_rate() const { return learning_rate; }
};

// Utility functions for data processing
namespace MLUtils {
    // Normalize data to [0,1] range
    std::vector<float> normalize(const std::vector<float>& data, 
                                 float min_val, float max_val);
    
    // One-hot encode categorical data
    std::vector<float> one_hot_encode(int value, int num_classes);
    
    // Calculate accuracy for classification
    float calculate_accuracy(const std::vector<float>& predictions, 
                            const std::vector<float>& targets);
    
    // Calculate mean squared error
    float mean_squared_error(const std::vector<float>& predictions,
                            const std::vector<float>& targets);
    
    // Split data into training and validation sets
    std::pair<std::vector<NeuralNetwork::TrainingData>,
              std::vector<NeuralNetwork::TrainingData>>
    train_test_split(const std::vector<NeuralNetwork::TrainingData>& data,
                    float test_ratio = 0.2f);
}

#endif