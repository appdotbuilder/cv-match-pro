import { db } from '../db';
import { searchProjectsTable, usersTable } from '../db/schema';
import { type CreateSearchProjectInput, type SearchProject } from '../schema';
import { eq } from 'drizzle-orm';

export const createSearchProject = async (input: CreateSearchProjectInput): Promise<SearchProject> => {
  try {
    // Validate that the user exists and has the correct role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by_user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'JOB_PROVIDER' && user[0].role !== 'TALENT_ACQUISITION') {
      throw new Error('Only JOB_PROVIDER and TALENT_ACQUISITION roles can create search projects');
    }

    // Validate that criteria weights sum to 100
    const weights = input.criteria.weights;
    const totalWeight = weights.years_experience + weights.role_match + weights.skills_match + 
                       weights.industry_match + weights.job_stability;

    if (totalWeight !== 100) {
      throw new Error(`Criteria weights must sum to 100, got ${totalWeight}`);
    }

    // Insert search project record
    const result = await db.insert(searchProjectsTable)
      .values({
        name: input.name,
        description: input.description,
        created_by_user_id: input.created_by_user_id,
        status: input.status,
        criteria: input.criteria
      })
      .returning()
      .execute();

    const project = result[0];
    return {
      ...project,
      criteria: project.criteria as any // Type assertion for JSON field
    };
  } catch (error) {
    console.error('Search project creation failed:', error);
    throw error;
  }
};