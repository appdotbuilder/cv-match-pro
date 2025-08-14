import { db } from '../db';
import { searchProjectsTable, usersTable } from '../db/schema';
import { type SearchProject } from '../schema';
import { desc } from 'drizzle-orm';

export const getAllProjects = async (): Promise<SearchProject[]> => {
  try {
    // Query all search projects ordered by creation date (newest first)
    const results = await db.select()
      .from(searchProjectsTable)
      .orderBy(desc(searchProjectsTable.created_at))
      .execute();

    // Return the results (no type conversion needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch all projects:', error);
    throw error;
  }
};