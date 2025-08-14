import { db } from '../db';
import { searchProjectsTable, projectCvsTable } from '../db/schema';
import { type RunMatchingInput, type ProjectMatchingResults, type ProjectCriteria, type ParsedCVData, type CVMatchResult } from '../schema';
import { eq, isNull, not } from 'drizzle-orm';

// Simple semantic similarity function - in production would use proper embeddings/ML models
function calculateSemanticSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const normalize = (str: string) => str.toLowerCase().trim();
  const words1 = normalize(text1).split(/\s+/);
  const words2 = normalize(text2).split(/\s+/);
  
  // Exact match
  if (normalize(text1) === normalize(text2)) return 1.0;
  
  // Partial word overlap
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / Math.max(totalWords, 1);
}

function calculateExperienceScore(actualYears: number | null, requiredYears: number | null): number {
  if (requiredYears === null || actualYears === null) return 50; // Neutral score
  
  if (actualYears >= requiredYears) {
    // Bonus for exceeding requirements, capped at 100
    const bonus = Math.min((actualYears - requiredYears) / requiredYears * 20, 20);
    return Math.min(100, 80 + bonus);
  } else {
    // Penalty for not meeting requirements
    const ratio = actualYears / requiredYears;
    return Math.max(0, ratio * 80);
  }
}

function calculateRoleScore(targetRole: string | null, cvRoles: string[]): { score: number; matches: string[] } {
  if (!targetRole || !cvRoles?.length) return { score: 0, matches: [] };
  
  const matches: string[] = [];
  let bestScore = 0;
  
  for (const role of cvRoles) {
    const similarity = calculateSemanticSimilarity(targetRole, role);
    if (similarity > 0.3) { // Threshold for considering a match
      matches.push(role);
      bestScore = Math.max(bestScore, similarity * 100);
    }
  }
  
  return { score: bestScore, matches };
}

function calculateSkillsScore(requiredSkills: string[], preferredSkills: string[], cvSkills: string[]) {
  if (!cvSkills?.length) return { score: 0, exact_matches: [], semantic_matches: [] };
  
  const exactMatches: string[] = [];
  const semanticMatches: string[] = [];
  const allTargetSkills = [...requiredSkills, ...preferredSkills];
  
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  // Score required skills (weight: 2)
  for (const requiredSkill of requiredSkills) {
    maxPossibleScore += 2;
    let bestMatch = 0;
    
    for (const cvSkill of cvSkills) {
      const similarity = calculateSemanticSimilarity(requiredSkill, cvSkill);
      if (similarity === 1.0) {
        exactMatches.push(requiredSkill);
        bestMatch = 2;
        break;
      } else if (similarity > 0.7) {
        semanticMatches.push(`${requiredSkill} → ${cvSkill}`);
        bestMatch = Math.max(bestMatch, similarity * 2);
      }
    }
    totalScore += bestMatch;
  }
  
  // Score preferred skills (weight: 1)
  for (const preferredSkill of preferredSkills) {
    maxPossibleScore += 1;
    let bestMatch = 0;
    
    for (const cvSkill of cvSkills) {
      const similarity = calculateSemanticSimilarity(preferredSkill, cvSkill);
      if (similarity === 1.0) {
        if (!exactMatches.includes(preferredSkill)) exactMatches.push(preferredSkill);
        bestMatch = 1;
        break;
      } else if (similarity > 0.7) {
        const matchKey = `${preferredSkill} → ${cvSkill}`;
        if (!semanticMatches.includes(matchKey)) semanticMatches.push(matchKey);
        bestMatch = Math.max(bestMatch, similarity);
      }
    }
    totalScore += bestMatch;
  }
  
  const score = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  return { score, exact_matches: exactMatches, semantic_matches: semanticMatches };
}

function calculateIndustryScore(targetIndustries: string[], cvIndustries: string[]): { score: number; matches: string[] } {
  if (!targetIndustries?.length || !cvIndustries?.length) {
    return { score: 0, matches: [] };
  }
  
  const matches: string[] = [];
  let totalSimilarity = 0;
  
  for (const targetIndustry of targetIndustries) {
    let bestMatch = 0;
    let bestMatchIndustry = '';
    
    for (const cvIndustry of cvIndustries) {
      const similarity = calculateSemanticSimilarity(targetIndustry, cvIndustry);
      if (similarity > bestMatch) {
        bestMatch = similarity;
        bestMatchIndustry = cvIndustry;
      }
    }
    
    if (bestMatch > 0.6) {
      matches.push(bestMatchIndustry);
      totalSimilarity += bestMatch;
    }
  }
  
  const score = targetIndustries.length > 0 ? (totalSimilarity / targetIndustries.length) * 100 : 0;
  return { score, matches };
}

function calculateJobStabilityScore(jobChangesPerYear: number | null, maxJobChangesPerYear: number | null): number {
  if (maxJobChangesPerYear === null || jobChangesPerYear === null) return 50; // Neutral score
  
  if (jobChangesPerYear <= maxJobChangesPerYear) {
    return 100; // Meets stability requirements
  } else {
    // Penalize excessive job changes
    const excessRatio = (jobChangesPerYear - maxJobChangesPerYear) / maxJobChangesPerYear;
    return Math.max(0, 100 - (excessRatio * 50));
  }
}

export async function runMatchingAlgorithm(input: RunMatchingInput): Promise<ProjectMatchingResults> {
  try {
    // Get the search project with its criteria
    const projects = await db.select()
      .from(searchProjectsTable)
      .where(eq(searchProjectsTable.id, input.project_id))
      .execute();

    if (projects.length === 0) {
      throw new Error(`Search project with ID ${input.project_id} not found`);
    }

    const project = projects[0];
    const criteria = project.criteria as ProjectCriteria;

    // Get all project CVs with parsed data
    const projectCvs = await db.select()
      .from(projectCvsTable)
      .where(eq(projectCvsTable.project_id, input.project_id))
      .execute();

    const results: CVMatchResult[] = [];

    for (const cv of projectCvs) {
      if (!cv.parsed_data) {
        continue; // Skip CVs without parsed data
      }

      const parsedData = cv.parsed_data as ParsedCVData;
      
      // Calculate scores for each dimension
      const experienceScore = calculateExperienceScore(
        parsedData.total_years_experience,
        criteria.minimum_years_experience
      );

      const roleMatch = calculateRoleScore(
        criteria.target_role,
        parsedData.roles_positions || []
      );

      const skillsMatch = calculateSkillsScore(
        criteria.required_skills || [],
        criteria.preferred_skills || [],
        parsedData.skills || []
      );

      const industryMatch = calculateIndustryScore(
        criteria.target_industries || [],
        parsedData.dominant_industries || []
      );

      const jobStabilityScore = calculateJobStabilityScore(
        parsedData.job_changes_frequency,
        criteria.max_job_changes_per_year
      );

      // Calculate weighted final score
      const weights = criteria.weights;
      const finalScore = (
        (experienceScore * weights.years_experience) +
        (roleMatch.score * weights.role_match) +
        (skillsMatch.score * weights.skills_match) +
        (industryMatch.score * weights.industry_match) +
        (jobStabilityScore * weights.job_stability)
      ) / 100;

      results.push({
        cv: {
          ...cv,
          score: parseFloat(cv.score || '0'), // Convert string to number for response
          ranking: cv.ranking
        },
        score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
        ranking: 0, // Will be set after sorting
        highlights: {
          years_experience_match: {
            actual: parsedData.total_years_experience,
            required: criteria.minimum_years_experience,
            score: Math.round(experienceScore * 100) / 100
          },
          role_match: {
            matches: roleMatch.matches,
            score: Math.round(roleMatch.score * 100) / 100
          },
          skills_match: {
            exact_matches: skillsMatch.exact_matches,
            semantic_matches: skillsMatch.semantic_matches,
            score: Math.round(skillsMatch.score * 100) / 100
          },
          industry_match: {
            matches: industryMatch.matches,
            score: Math.round(industryMatch.score * 100) / 100
          },
          job_stability: {
            job_changes_per_year: parsedData.job_changes_frequency,
            score: Math.round(jobStabilityScore * 100) / 100
          }
        }
      });
    }

    // Sort by score (descending) and assign rankings
    results.sort((a, b) => b.score - a.score);
    results.forEach((result, index) => {
      result.ranking = index + 1;
    });

    // Update the database with new scores and rankings
    for (const result of results) {
      await db.update(projectCvsTable)
        .set({
          score: result.score.toString(), // Convert number to string for numeric column
          ranking: result.ranking,
          updated_at: new Date()
        })
        .where(eq(projectCvsTable.id, result.cv.id))
        .execute();
    }

    return {
      project: {
        ...project,
        criteria: project.criteria
      },
      results,
      total_candidates: results.length,
      processed_at: new Date()
    };

  } catch (error) {
    console.error('Matching algorithm failed:', error);
    throw error;
  }
}