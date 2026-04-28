#include "neural_network.h"
#include <algorithm>
#include <numeric>

// Layer constructor
NeuralNetwork::Layer::Layer(int input_size, int output_size) {
    weights.resize(output_size, std::vector<float>(input_size));
    biases.resize(output_size);
    outputs.resize(output_size);
    deltas.resize(output_size);
    
    initialize_xavier(input_size, output_size);
}

// Xavier/Glorot initialization for better convergence
void NeuralNetwork::Layer::initialize_xavier(int input_size, int output_size) {
    std::random_device rd;
    std::mt19937 gen(rd());
    float limit = std::sqrt(6.0f / (input_size + output_size));
    std::uniform_real_distribution<float> dist(-limit, limit);
    
    for (auto& row : weights) {
        for (auto& w : row) {
            w = dist(gen);
        }
    }
    
    for (auto& b : biases) {
        b = 0.0f;
    }
}

// Neural Network constructor
NeuralNetwork::NeuralNetwork(const std::vector<int>& layer_sizes, float lr) 
    : learning_rate(lr), rng(std::chrono::steady_clock::now().time_since_epoch().count()) {
    
    if (layer_sizes.size() < 2) {
        throw std::invalid_argument("Network must have at least input and output layers");
    }
    
    for (size_t i = 0; i < layer_sizes.size() - 1; i++) {
        layers.emplace_back(layer_sizes[i], layer_sizes[i + 1]);
    }
}

// Activation functions
float NeuralNetwork::sigmoid(float x) {
    return 1.0f / (1.0f + std::exp(-x));
}

float NeuralNetwork::sigmoid_derivative(float x) {
    return x * (1.0f - x);
}

float NeuralNetwork::relu(float x) {
    return x > 0 ? x : 0;
}

float NeuralNetwork::relu_derivative(float x) {
    return x > 0 ? 1 : 0;
}

float NeuralNetwork::tanh_derivative(float x) {
    return 1 - x * x;
}

// Forward propagation
std::vector<float> NeuralNetwork::forward(const std::vector<float>& input) {
    if (input.size() != static_cast<size_t>(get_input_size())) {
        throw std::invalid_argument("Input size mismatch");
    }
    
    std::vector<float> current = input;
    
    for (auto& layer : layers) {
        std::vector<float> next(layer.weights.size(), 0.0f);
        
        for (size_t i = 0; i < layer.weights.size(); i++) {
            float sum = layer.biases[i];
            for (size_t j = 0; j < current.size(); j++) {
                sum += layer.weights[i][j] * current[j];
            }
            // Using sigmoid for hidden layers, could be configurable
            next[i] = sigmoid(sum);
        }
        
        layer.outputs = next;
        current = next;
    }
    
    return current;
}

// Backward propagation
void NeuralNetwork::backward(const std::vector<float>& expected) {
    if (expected.size() != static_cast<size_t>(get_output_size())) {
        throw std::invalid_argument("Expected output size mismatch");
    }
    
    // Calculate output layer error
    auto& output_layer = layers.back();
    for (size_t i = 0; i < output_layer.outputs.size(); i++) {
        float output = output_layer.outputs[i];
        output_layer.deltas[i] = (output - expected[i]) * sigmoid_derivative(output);
    }
    
    // Backpropagate through hidden layers
    for (int i = layers.size() - 2; i >= 0; i--) {
        auto& current = layers[i];
        auto& next = layers[i + 1];
        
        for (size_t j = 0; j < current.outputs.size(); j++) {
            float error = 0.0f;
            for (size_t k = 0; k < next.deltas.size(); k++) {
                error += next.deltas[k] * next.weights[k][j];
            }
            current.deltas[j] = error * sigmoid_derivative(current.outputs[j]);
        }
    }
}

// Update weights using gradient descent
void NeuralNetwork::update_weights() {
    for (size_t i = 0; i < layers.size(); i++) {
        auto& layer = layers[i];
        std::vector<float> prev_output;
        
        if (i == 0) {
            // For input layer, we don't have previous outputs stored
            // This will be handled in the training loop
            continue;
        } else {
            prev_output = layers[i - 1].outputs;
        }
        
        for (size_t j = 0; j < layer.weights.size(); j++) {
            for (size_t k = 0; k < layer.weights[j].size(); k++) {
                float gradient = layer.deltas[j] * prev_output[k];
                layer.weights[j][k] -= learning_rate * gradient;
            }
            layer.biases[j] -= learning_rate * layer.deltas[j];
        }
    }
}

// Train the network
NeuralNetwork::TrainingResult NeuralNetwork::train(
    const std::vector<TrainingData>& dataset,
    int epochs,
    float target_accuracy,
    int batch_size,
    float validation_split) {
    
    TrainingResult result;
    result.loss_history.reserve(epochs);
    result.accuracy_history.reserve(epochs);
    result.epochs_trained = epochs; 
    
    // Split data
    auto [train_data, val_data] = MLUtils::train_test_split(dataset, validation_split);
    
    std::cerr << "Training with " << train_data.size() << " samples, "
              << "validating with " << val_data.size() << " samples" << std::endl;
    
    for (int epoch = 0; epoch < epochs; epoch++) {
        float epoch_loss = 0.0f;
        
        // Shuffle training data
        std::shuffle(train_data.begin(), train_data.end(), rng);
        
        // Mini-batch training
        for (size_t batch_start = 0; batch_start < train_data.size(); batch_start += batch_size) {
            size_t batch_end = std::min(batch_start + batch_size, train_data.size());
            
            for (size_t i = batch_start; i < batch_end; i++) {
                const auto& data = train_data[i];
                
                // Forward pass
                auto output = forward(data.input);
                
                // Calculate loss
                float sample_loss = 0.0f;
                for (size_t j = 0; j < output.size(); j++) {
                    float diff = output[j] - data.expected_output[j];
                    sample_loss += diff * diff;
                }
                epoch_loss += sample_loss / output.size();
                
                // Backward pass
                backward(data.expected_output);
                
                // Update weights for input layer specially
                if (!layers.empty()) {
                    auto& first_layer = layers[0];
                    for (size_t j = 0; j < first_layer.weights.size(); j++) {
                        for (size_t k = 0; k < first_layer.weights[j].size(); k++) {
                            float gradient = first_layer.deltas[j] * data.input[k];
                            first_layer.weights[j][k] -= learning_rate * gradient;
                        }
                        first_layer.biases[j] -= learning_rate * first_layer.deltas[j];
                    }
                }
                
                // Update weights for other layers
                for (size_t layer_idx = 1; layer_idx < layers.size(); layer_idx++) {
                    auto& layer = layers[layer_idx];
                    auto& prev_output = layers[layer_idx - 1].outputs;
                    
                    for (size_t j = 0; j < layer.weights.size(); j++) {
                        for (size_t k = 0; k < layer.weights[j].size(); k++) {
                            float gradient = layer.deltas[j] * prev_output[k];
                            layer.weights[j][k] -= learning_rate * gradient;
                        }
                        layer.biases[j] -= learning_rate * layer.deltas[j];
                    }
                }
            }
        }
        
        // Calculate average loss
        float avg_loss = epoch_loss / train_data.size();
        result.loss_history.push_back(avg_loss);
        
        // Calculate validation accuracy
        float val_accuracy = evaluate(val_data);
        result.accuracy_history.push_back(val_accuracy);
        
        if (epoch % 10 == 0) {
            std::cerr << "Epoch " << epoch << ": loss=" << avg_loss 
                      << ", val_accuracy=" << val_accuracy << std::endl;
        }
        
        if (val_accuracy >= target_accuracy) {
            result.epochs_trained = epoch + 1;
            break;
        }
    }
    
    result.accuracy = evaluate(val_data);
    result.loss = result.loss_history.back();
    result.model_id = "model_" + std::to_string(std::time(nullptr));
    
    return result;
}

// Evaluate the network
float NeuralNetwork::evaluate(const std::vector<TrainingData>& dataset) {
    if (dataset.empty()) return 0.0f;
    
    int correct = 0;
    
    for (const auto& data : dataset) {
        auto output = forward(data.input);
        
        bool all_close = true;
        for (size_t i = 0; i < output.size(); i++) {
            if (std::abs(output[i] - data.expected_output[i]) > 0.05f) {
                all_close = false;
                break;
            }
        }
        
        if (all_close) correct++;
    }
    
    return static_cast<float>(correct) / dataset.size();
}

// Predict single input
std::vector<float> NeuralNetwork::predict(const std::vector<float>& input) {
    return forward(input);
}

// Save model to string
std::string NeuralNetwork::save_model() {
    std::stringstream ss;
    
    // Save architecture
    ss << layers.size() << std::endl;
    for (const auto& layer : layers) {
        ss << layer.weights.size() << " " << layer.weights[0].size() << std::endl;
    }
    
    // Save weights and biases
    for (const auto& layer : layers) {
        for (const auto& row : layer.weights) {
            for (float w : row) {
                ss << w << " ";
            }
            ss << std::endl;
        }
        for (float b : layer.biases) {
            ss << b << " ";
        }
        ss << std::endl;
    }
    
    ss << learning_rate << std::endl;
    
    return ss.str();
}

// Load model from string
bool NeuralNetwork::load_model(const std::string& model_str) {
    std::stringstream ss(model_str);
    
    size_t num_layers;
    ss >> num_layers;
    
    std::vector<int> layer_sizes;
    for (size_t i = 0; i < num_layers; i++) {
        int rows, cols;
        ss >> rows >> cols;
        if (i == 0) layer_sizes.push_back(cols);
        layer_sizes.push_back(rows);
    }
    
    // Reconstruct network
    *this = NeuralNetwork(layer_sizes);
    
    // Load weights and biases
    for (auto& layer : layers) {
        for (auto& row : layer.weights) {
            for (auto& w : row) {
                ss >> w;
            }
        }
        for (auto& b : layer.biases) {
            ss >> b;
        }
    }
    
    ss >> learning_rate;
    
    return true;
}

// Save to file
bool NeuralNetwork::save_to_file(const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) return false;
    
    file << save_model();
    file.close();
    return true;
}

// Load from file
bool NeuralNetwork::load_from_file(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) return false;
    
    std::stringstream ss;
    ss << file.rdbuf();
    file.close();
    
    return load_model(ss.str());
}

// Utility functions implementation
namespace MLUtils {

std::vector<float> normalize(const std::vector<float>& data, float min_val, float max_val) {
    std::vector<float> result(data.size());
    float range = max_val - min_val;
    
    if (range == 0) return result;
    
    for (size_t i = 0; i < data.size(); i++) {
        result[i] = (data[i] - min_val) / range;
    }
    
    return result;
}

std::vector<float> one_hot_encode(int value, int num_classes) {
    std::vector<float> encoding(num_classes, 0.0f);
    if (value >= 0 && value < num_classes) {
        encoding[value] = 1.0f;
    }
    return encoding;
}

float calculate_accuracy(const std::vector<float>& predictions, 
                        const std::vector<float>& targets) {
    if (predictions.empty()) return 0.0f;
    
    int correct = 0;
    for (size_t i = 0; i < predictions.size(); i++) {
        if (std::abs(predictions[i] - targets[i]) < 0.5f) {
            correct++;
        }
    }
    
    return static_cast<float>(correct) / predictions.size();
}

float mean_squared_error(const std::vector<float>& predictions,
                        const std::vector<float>& targets) {
    if (predictions.empty()) return 0.0f;
    
    float sum = 0.0f;
    for (size_t i = 0; i < predictions.size(); i++) {
        float diff = predictions[i] - targets[i];
        sum += diff * diff;
    }
    
    return sum / predictions.size();
}

std::pair<std::vector<NeuralNetwork::TrainingData>,
          std::vector<NeuralNetwork::TrainingData>>
train_test_split(const std::vector<NeuralNetwork::TrainingData>& data,
                float test_ratio) {
    
    size_t test_size = static_cast<size_t>(data.size() * test_ratio);
    size_t train_size = data.size() - test_size;
    
    std::vector<NeuralNetwork::TrainingData> train, test;
    train.reserve(train_size);
    test.reserve(test_size);
    
    // Simple split - in production, use random shuffle
    for (size_t i = 0; i < data.size(); i++) {
        if (i < train_size) {
            train.push_back(data[i]);
        } else {
            test.push_back(data[i]);
        }
    }
    
    return {train, test};
}

} // namespace MLUtils