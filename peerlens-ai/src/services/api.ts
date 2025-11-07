import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🧠 Get all analyzed students
export const getStudents = async () => {
  try {
    const response = await api.get('/students/');
    return response.data;
  } catch (err: any) {
    console.error('❌ Failed to fetch students:', err);
    throw new Error('Could not fetch students from backend.');
  }
};

// 🤖 Analyze a GitHub user
export const analyzeGitHubUser = async (username: string) => {
  try {
    const response = await api.post(`/github/analyze/${username}`);
    const userData = response.data;
    
    // Generate AI overview on frontend
    const overview = generateAIOverview(userData);
    
    return {
      ...userData,
      overview: overview
    };
  } catch (err: any) {
    console.error('❌ Failed to analyze GitHub user:', err);
    const detail = err.response?.data?.detail || err.message;
    throw new Error(detail || 'Failed to analyze user.');
  }
};

// 👤 Add user by enrollment number
export const addUserByEnrollment = async (enrollmentNumber: string, githubUsername: string) => {
  try {
    const response = await api.post('/users/add-by-enrollment', {
      enrollment_number: enrollmentNumber,
      github_username: githubUsername
    });
    const userData = response.data;
    
    // Generate AI overview on frontend
    const overview = generateAIOverview(userData);
    
    return {
      ...userData,
      overview: overview
    };
  } catch (err: any) {
    console.error('❌ Failed to add user:', err);
    const detail = err.response?.data?.detail || err.message;
    throw new Error(detail || 'Failed to add user.');
  }
};

// 🧬 Get AI team suggestions for specific language
export const getTeamSuggestions = async (mainStudentId: string, requiredSkill: string) => {
  try {
    const response = await api.post(
      `/ai/team-suggestions?main_student_id=${mainStudentId}&required_skill=${requiredSkill}`
    );
    return response.data;
  } catch (err: any) {
    console.error('❌ Failed to get team suggestions:', err);
    const detail = err.response?.data?.detail || err.message;
    throw new Error(detail || 'Failed to get team suggestions.');
  }
};

// 👥 Make team with best 3 teammates (FRONTEND-ONLY IMPLEMENTATION)
export const makeTeam = async (mainStudentId: string, allStudents: any[]) => {
  try {
    // Frontend-only team matching algorithm
    const mainStudent = allStudents.find(s => s.id === mainStudentId);
    if (!mainStudent) {
      throw new Error('Main student not found');
    }

    const otherStudents = allStudents.filter(s => s.id !== mainStudentId);
    
    // Calculate compatibility scores
    const scoredStudents = otherStudents.map(student => {
      const score = calculateCompatibility(mainStudent, student);
      return { ...student, compatibility_score: score };
    });

    // Sort by compatibility score (highest first)
    scoredStudents.sort((a, b) => b.compatibility_score - a.compatibility_score);
    
    // Take top 3
    const topTeammates = scoredStudents.slice(0, 3);

    // Generate reasoning
    const reasoning = generateTeamReasoning(mainStudent, topTeammates);

    return {
      members: topTeammates,
      reasoning: reasoning,
      required_skill: "Auto-Matched Compatibility"
    };
  } catch (err: any) {
    console.error('❌ Failed to create team:', err);
    throw new Error(err.message || 'Failed to create team.');
  }
};

// 🧠 Generate AI Overview (Frontend-only implementation)
const generateAIOverview = (userData: any) => {
  const {
    name,
    github_username,
    bio,
    tech_stack,
    github_stats,
    projects,
    seeking
  } = userData;

  // Analyze tech stack
  const primaryTechs = tech_stack.slice(0, 3).map((tech: any) => tech.name);
  const techLevels = tech_stack.map((tech: any) => tech.level);
  const expertLevel = techLevels.filter((level: string) => 
    ['expert', 'advanced'].includes(level.toLowerCase())
  ).length;

  // Analyze GitHub activity
  const activityLevel = github_stats.repos > 20 ? 'high' : 
                       github_stats.repos > 10 ? 'medium' : 'low';
  
  const topLanguages = Object.entries(github_stats.languages || {})
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 3)
    .map(([lang]) => lang);

  // Generate summary
  const summary = generateSummary(name, github_username, bio, activityLevel, primaryTechs);

  // Generate strengths
  const strengths = generateStrengths(tech_stack, github_stats, projects, expertLevel);

  // Generate tech insights
  const techInsights = generateTechInsights(primaryTechs, topLanguages, tech_stack);

  // Generate recommendations
  const recommendations = generateRecommendations(seeking, tech_stack, activityLevel);

  return {
    summary,
    strengths,
    tech_insights: techInsights,
    recommendations
  };
};

// Helper functions for AI overview generation
const generateSummary = (name: string, username: string, bio: string, activityLevel: string, primaryTechs: string[]) => {
  const namePart = name || username;
  const bioPart = bio ? ` focused on ${bio.toLowerCase()}` : '';
  const activityPart = activityLevel === 'high' ? 'highly active' : 
                      activityLevel === 'medium' ? 'moderately active' : 'developing';
  
  return `${namePart} is a ${activityPart} developer${bioPart} with expertise in ${primaryTechs.join(', ')}. Shows strong potential for collaborative projects and team contributions.`;
};

const generateStrengths = (techStack: any[], githubStats: any, projects: string[], expertLevel: number) => {
  const strengths = [];
  
  if (expertLevel >= 2) {
    strengths.push(`Deep expertise in ${expertLevel} advanced technologies`);
  }
  
  if (githubStats.repos > 15) {
    strengths.push(`Proven track record with ${githubStats.repos} repositories`);
  } else if (githubStats.repos > 5) {
    strengths.push(`Solid experience with ${githubStats.repos} active projects`);
  }
  
  if (githubStats.followers > 10) {
    strengths.push(`Strong community presence with ${githubStats.followers} followers`);
  }
  
  if (projects.length >= 3) {
    strengths.push(`Diverse project portfolio showcasing real-world applications`);
  }
  
  if (techStack.length >= 5) {
    strengths.push(`Versatile skill set spanning ${techStack.length} technologies`);
  }
  
  // Fallback strengths
  if (strengths.length === 0) {
    strengths.push(
      "Strong foundation in core programming concepts",
      "Active learner with growing GitHub presence",
      "Potential for rapid skill development"
    );
  }
  
  return strengths.slice(0, 4);
};

const generateTechInsights = (primaryTechs: string[], topLanguages: string[], techStack: any[]) => {
  const insights = [];
  
  if (primaryTechs.length > 0) {
    insights.push(`Primary technology focus on ${primaryTechs.join(', ')}`);
  }
  
  if (topLanguages.length > 0) {
    insights.push(`Strongest in ${topLanguages.join(', ')} based on repository analysis`);
  }
  
  const backendTechs = techStack.filter(tech => 
    ['node.js', 'python', 'java', 'go', 'rust', 'spring', 'django', 'flask']
      .some(backend => tech.name.toLowerCase().includes(backend))
  );
  
  const frontendTechs = techStack.filter(tech => 
    ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css']
      .some(frontend => tech.name.toLowerCase().includes(frontend))
  );
  
  if (backendTechs.length > 0 && frontendTechs.length > 0) {
    insights.push("Full-stack capabilities with both frontend and backend experience");
  } else if (backendTechs.length > 0) {
    insights.push("Backend-focused development skills");
  } else if (frontendTechs.length > 0) {
    insights.push("Frontend-focused development expertise");
  }
  
  // Fallback insights
  if (insights.length === 0) {
    insights.push(
      "Building comprehensive software development skills",
      "Exploring multiple programming paradigms and technologies",
      "Developing practical experience through project work"
    );
  }
  
  return insights.slice(0, 3);
};

const generateRecommendations = (seeking: string[], techStack: any[], activityLevel: string) => {
  const recommendations = [];
  
  if (seeking && seeking.length > 0) {
    recommendations.push(`Focus on ${seeking.join(' and ')} as indicated in profile goals`);
  } else {
    recommendations.push("Consider defining specific learning goals in your profile");
  }
  
  if (activityLevel === 'low' && techStack.length < 3) {
    recommendations.push("Build more diverse projects to expand technical portfolio");
    recommendations.push("Contribute to open source to gain collaborative experience");
  } else if (activityLevel === 'medium') {
    recommendations.push("Deepen expertise in core technologies through advanced projects");
    recommendations.push("Explore mentorship opportunities to share knowledge");
  } else {
    recommendations.push("Consider leadership roles in team projects");
    recommendations.push("Mentor other developers to strengthen communication skills");
  }
  
  return recommendations.slice(0, 3);
};

// Compatibility scoring algorithm (Frontend)
const calculateCompatibility = (main: any, candidate: any) => {
  let score = 0;
  
  // Tech stack overlap (40% weight)
  const mainTechs = main.tech_stack.map((tech: any) => tech.name.toLowerCase());
  const candidateTechs = candidate.tech_stack.map((tech: any) => tech.name.toLowerCase());
  const commonTechs = mainTechs.filter(tech => candidateTechs.includes(tech));
  score += (commonTechs.length / Math.max(mainTechs.length, 1)) * 40;

  // GitHub activity level similarity (25% weight)
  const mainActivity = main.github_stats.repos + main.github_stats.followers;
  const candidateActivity = candidate.github_stats.repos + candidate.github_stats.followers;
  const activityDiff = Math.abs(mainActivity - candidateActivity);
  const maxActivity = Math.max(mainActivity, candidateActivity, 1);
  score += (1 - activityDiff / maxActivity) * 25;

  // Language overlap (20% weight)
  const mainLanguages = Object.keys(main.github_stats.languages || {});
  const candidateLanguages = Object.keys(candidate.github_stats.languages || {});
  const commonLanguages = mainLanguages.filter(lang => candidateLanguages.includes(lang));
  score += (commonLanguages.length / Math.max(mainLanguages.length, 1)) * 20;

  // Project interests (15% weight)
  const mainProjects = main.projects.join(' ').toLowerCase();
  const candidateProjects = candidate.projects.join(' ').toLowerCase();
  const projectMatch = mainProjects.includes(candidateProjects) || candidateProjects.includes(mainProjects);
  score += projectMatch ? 15 : 5;

  return Math.min(Math.round(score), 100);
};

// Generate team reasoning (Frontend)
const generateTeamReasoning = (mainStudent: any, teammates: any[]) => {
  const reasons = [];
  
  if (teammates.length > 0) {
    const topMatch = teammates[0];
    reasons.push(`Found ${teammates.length} highly compatible teammates.`);
    
    // Tech stack analysis
    const mainTechs = mainStudent.tech_stack.slice(0, 3).map((t: any) => t.name);
    if (mainTechs.length > 0) {
      reasons.push(`Your expertise in ${mainTechs.join(', ')} matches well with the team.`);
    }
    
    // Compatibility scores
    const avgScore = Math.round(teammates.reduce((sum, t) => sum + (t.compatibility_score || 0), 0) / teammates.length);
    reasons.push(`Average team compatibility: ${avgScore}%.`);
    
    // Specific strengths
    const commonTechs = findCommonTechnologies([mainStudent, ...teammates]);
    if (commonTechs.length > 0) {
      reasons.push(`Strong team synergy in ${commonTechs.slice(0, 2).join(' and ')}.`);
    }
  }
  
  return reasons.join(' ') || 'Automatically selected compatible teammates based on profile analysis.';
};

// Find common technologies across team members
const findCommonTechnologies = (members: any[]) => {
  const techCount: { [key: string]: number } = {};
  
  members.forEach(member => {
    member.tech_stack.forEach((tech: any) => {
      techCount[tech.name] = (techCount[tech.name] || 0) + 1;
    });
  });
  
  return Object.entries(techCount)
    .filter(([_, count]) => count === members.length)
    .map(([tech]) => tech)
    .slice(0, 3);
};