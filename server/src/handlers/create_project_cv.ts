import { db } from '../db';
import { projectCvsTable, searchProjectsTable } from '../db/schema';
import { type CreateProjectCVInput, type ProjectCV } from '../schema';
import { eq, count } from 'drizzle-orm';

export const createProjectCV = async (input: CreateProjectCVInput): Promise<ProjectCV> => {
  try {
    // Validate that the project exists
    const project = await db.select()
      .from(searchProjectsTable)
      .where(eq(searchProjectsTable.id, input.project_id))
      .limit(1)
      .execute();

    if (project.length === 0) {
      throw new Error(`Project with id ${input.project_id} not found`);
    }

    // Check if project has reached maximum CV limit (10 CVs per project)
    const existingCvsCount = await db.select({ count: count() })
      .from(projectCvsTable)
      .where(eq(projectCvsTable.project_id, input.project_id))
      .execute();

    if (existingCvsCount[0].count >= 10) {
      throw new Error(`Project has reached maximum limit of 10 CVs`);
    }

    // Insert the new project CV
    const result = await db.insert(projectCvsTable)
      .values({
        project_id: input.project_id,
        filename: input.filename,
        original_filename: input.original_filename,
        file_path: input.file_path,
        parsed_data: null, // Will be populated later by AI parsing
        score: null, // Will be calculated after parsing
        ranking: null // Will be assigned after scoring
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const projectCV = result[0];
    return {
      ...projectCV,
      score: projectCV.score ? parseFloat(projectCV.score) : null
    };
  } catch (error) {
    console.error('Project CV creation failed:', error);
    throw error;
  }
};