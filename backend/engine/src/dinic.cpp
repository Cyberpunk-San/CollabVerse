#include "dinic.h"
#include <vector>
#include <queue>
#include <algorithm>

using namespace std;

DinicSolver::DinicSolver(int n) : adj(n), level(n), ptr(n) {}

void DinicSolver::add_edge(int from, int to, long long cap) {
    adj[from].push_back({to, cap, 0, (int)adj[to].size()});
    adj[to].push_back({from, 0, 0, (int)adj[from].size() - 1});
}

bool DinicSolver::bfs(int s, int t) {
    fill(level.begin(), level.end(), -1);
    level[s] = 0;
    queue<int> q;
    q.push(s);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (auto& edge : adj[v]) {
            if (edge.cap - edge.flow > 0 && level[edge.to] == -1) {
                level[edge.to] = level[v] + 1;
                q.push(edge.to);
            }
        }
    }
    return level[t] != -1;
}

long long DinicSolver::dfs(int v, int t, long long pushed) {
    if (pushed == 0 || v == t) return pushed;
    for (int& cid = ptr[v]; cid < adj[v].size(); ++cid) {
        auto& edge = adj[v][cid];
        int tr = edge.to;
        if (level[v] + 1 != level[tr] || edge.cap - edge.flow == 0) continue;
        long long tr_pushed = dfs(tr, t, min(pushed, edge.cap - edge.flow));
        if (tr_pushed == 0) continue;
        edge.flow += tr_pushed;
        adj[tr][edge.rev].flow -= tr_pushed;
        return tr_pushed;
    }
    return 0;
}

long long DinicSolver::max_flow(int s, int t) {
    long long flow = 0;
    while (bfs(s, t)) {
        fill(ptr.begin(), ptr.end(), 0);
        while (long long pushed = dfs(s, t, 1e18)) {
            flow += pushed;
        }
    }
    return flow;
}

vector<pair<int, int>> DinicSolver::get_matches(int student_start, int student_end) {
    vector<pair<int, int>> matches;
    for (int i = student_start; i <= student_end; ++i) {
        for (auto& edge : adj[i]) {
            if (edge.flow == 1 && edge.cap == 1 && edge.to > student_end) {
                matches.push_back({i, edge.to});
            }
        }
    }
    return matches;
}