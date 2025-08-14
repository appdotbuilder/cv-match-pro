import { db } from '../db';
import { searchProjectsTable } from '../db/schema';
import { type SearchProject } from '../schema';
import { eq } from 'drizzle-orm';

export const getProjectDetails = async (projectId: number): Promise<SearchProject | null> => {
  try {
    // Query the search project by ID
    const results = await db.select()
      .from(searchProjectsTable)
      .where(eq(searchProjectsTable.id, projectId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const project = results[0];
    
    // Return the project with proper type structure
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      created_by_user_id: project.created_by_user_id,
      status: project.status,
      criteria: project.criteria,
      created_at: project.created_at,
      updated_at: project.updated_at
    };
  } catch (error) {
    console.error('Failed to get project details:', error);
    throw error;
  }
};