#include "synergy_dpp.h"
#include <vector>
#include <string>
#include <algorithm>
#include <map>

using namespace std;

SynergyOptimizer::SynergyOptimizer(int s, int r, const vector<vector<int>>& matrix) 
    : num_students(s), num_roles(r), skill_matrix(matrix) {
    memo.assign(s, vector<int>(1 << r, -1));
}

int SynergyOptimizer::solve(int s_idx, int mask) {
    if (mask == (1 << num_roles) - 1) return 0;
    
    if (s_idx == num_students) return -1e9;

    if (memo[s_idx][mask] != -1) return memo[s_idx][mask];

    int res = solve(s_idx + 1, mask);

    for (int r = 0; r < num_roles; ++r) {
        if (!(mask & (1 << r))) {
            res = max(res, skill_matrix[s_idx][r] + solve(s_idx + 1, mask | (1 << r)));
        }
    }

    return memo[s_idx][mask] = res;
}

bool SynergyOptimizer::is_team_viable(int threshold) {
    return solve(0, 0) >= threshold;
}