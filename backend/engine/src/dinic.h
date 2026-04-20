#ifndef DINIC_H
#define DINIC_H

#include <vector>
#include <queue>
#include <algorithm>

struct Edge {
    int to;
    long long cap;
    long long flow;
    int rev; 
};

class DinicSolver {
private:
    std::vector<std::vector<Edge>> adj;
    std::vector<int> level;
    std::vector<int> ptr;

    bool bfs(int s, int t);
    long long dfs(int v, int t, long long pushed);

public:
    DinicSolver(int n);
    void add_edge(int from, int to, long long cap);
    long long max_flow(int s, int t);
    std::vector<std::pair<int, int>> get_matches(int student_start, int student_end);
};

#endif // DINIC_H
