import { db } from '../db';
import { searchProjectsTable, projectCvsTable } from '../db/schema';
import { type UpdateSearchProjectInput, type SearchProject } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSearchProject = async (input: UpdateSearchProjectInput): Promise<SearchProject> => {
  try {
    // First, check if the project exists
    const existingProject = await db.select()
      .from(searchProjectsTable)
      .where(eq(searchProjectsTable.id, input.id))
      .execute();

    if (existingProject.length === 0) {
      throw new Error('Search project not found');
    }

    // Prepare update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.criteria !== undefined) {
      updateData.criteria = input.criteria;
    }

    // Update the project
    const result = await db.update(searchProjectsTable)
      .set(updateData)
      .where(eq(searchProjectsTable.id, input.id))
      .returning()
      .execute();

    const updatedProject = result[0];

    // If criteria were updated, reset scores and rankings for existing project CVs
    // This triggers re-evaluation of all CVs against new criteria
    if (input.criteria !== undefined) {
      await db.update(projectCvsTable)
        .set({
          score: null,
          ranking: null,
          updated_at: new Date()
        })
        .where(eq(projectCvsTable.project_id, input.id))
        .execute();
    }

    return updatedProject;
  } catch (error) {
    console.error('Search project update failed:', error);
    throw error;
  }
};