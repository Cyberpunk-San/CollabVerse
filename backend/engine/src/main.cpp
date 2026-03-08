#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <map>
#include "dinic.cpp"      
#include "synergy_dpp.cpp" 
using namespace std;
int main() {
    int student_count, project_count;
    cin >> student_count >> project_count;

    map<int, string> id_to_uuid;
    map<string, int> uuid_to_id;
    int source = 0;
    int sink = student_count + project_count + 1;
    DinicSolver solver(sink + 1);
    for (int i = 1; i <= student_count; ++i) {
        string uuid;
        int skill_val;
        cin >> uuid >> skill_val;
        uuid_to_id[uuid] = i;
        id_to_uuid[i] = uuid;

        solver.add_edge(source, i, 1);
    }

    for (int j = 1; j <= project_count; ++j) {
        string p_uuid;
        int capacity;
        cin >> p_uuid >> capacity;
        int p_id = student_count + j;
        uuid_to_id[p_uuid] = p_id;
        id_to_uuid[p_id] = p_uuid;
        solver.add_edge(p_id, sink, capacity);
    }

    int edge_count;
    cin >> edge_count;
    for (int k = 0; k < edge_count; ++k) {
        string s_uuid, p_uuid;
        cin >> s_uuid >> p_uuid;
        solver.add_edge(uuid_to_id[s_uuid], uuid_to_id[p_uuid], 1);
    }

    long long total_matches = solver.max_flow(source, sink);

    auto matches = solver.get_matches(1, student_count);
    
    for (auto const& [s_id, p_id] : matches) {
        cout << id_to_uuid[s_id] << " " << id_to_uuid[p_id] << endl;
    }

    return 0;
}