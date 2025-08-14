import { db } from '../db';
import { projectCvsTable } from '../db/schema';
import { type GetProjectCVsInput, type ProjectCV } from '../schema';
import { eq, asc, desc } from 'drizzle-orm';

export const getProjectCVs = async (input: GetProjectCVsInput): Promise<ProjectCV[]> => {
  try {
    // Build the complete query in one chain
    const results = await db.select()
      .from(projectCvsTable)
      .where(eq(projectCvsTable.project_id, input.project_id))
      .orderBy(
        asc(projectCvsTable.ranking),
        desc(projectCvsTable.score),
        desc(projectCvsTable.created_at)
      )
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(cv => ({
      ...cv,
      score: cv.score ? parseFloat(cv.score) : null
    }));
  } catch (error) {
    console.error('Get project CVs failed:', error);
    throw error;
  }
};