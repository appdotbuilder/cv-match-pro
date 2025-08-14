import { db } from '../db';
import { cvsTable } from '../db/schema';
import { type GetCVsByUserInput, type CV } from '../schema';
import { eq, desc, asc, sql } from 'drizzle-orm';

export const getCVsByUser = async (input: GetCVsByUserInput): Promise<CV[]> => {
  try {
    // Fetch CVs for the user, ordered with ACTIVE status first, then by creation date (newest first)
    const results = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.user_id, input.user_id))
      .orderBy(
        // ACTIVE status first (ACTIVE = 1, INACTIVE = 0 when ordered DESC)
        desc(sql`CASE WHEN ${cvsTable.status} = 'ACTIVE' THEN 1 ELSE 0 END`),
        // Then by creation date (newest first)
        desc(cvsTable.created_at)
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch CVs by user:', error);
    throw error;
  }
};