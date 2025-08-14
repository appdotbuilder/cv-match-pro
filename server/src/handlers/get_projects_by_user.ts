import { db } from '../db';
import { searchProjectsTable } from '../db/schema';
import { type GetProjectsByUserInput, type SearchProject } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getProjectsByUser(input: GetProjectsByUserInput): Promise<SearchProject[]> {
  try {
    // Fetch all search projects created by the specified user
    // Ordered by creation date with most recent first
    const results = await db.select()
      .from(searchProjectsTable)
      .where(eq(searchProjectsTable.created_by_user_id, input.user_id))
      .orderBy(desc(searchProjectsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get projects by user:', error);
    throw error;
  }
}