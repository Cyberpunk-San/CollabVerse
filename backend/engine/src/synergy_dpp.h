#ifndef SYNERGY_DPP_H
#define SYNERGY_DPP_H

#include <vector>
#include <string>
#include <algorithm>
#include <map>

class SynergyOptimizer {
private:
    int num_students;
    int num_roles;
    std::vector<std::vector<int>> skill_matrix;
    std::vector<std::vector<int>> memo;

    int solve(int s_idx, int mask);

public:
    SynergyOptimizer(int s, int r, const std::vector<std::vector<int>>& matrix);
    bool is_team_viable(int threshold);
};

#endif // SYNERGY_DPP_H
