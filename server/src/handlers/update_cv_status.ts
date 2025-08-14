import { db } from '../db';
import { cvsTable } from '../db/schema';
import { type UpdateCVInput, type CV } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateCVStatus = async (input: UpdateCVInput): Promise<CV> => {
  try {
    // First, get the current CV to verify it exists and get the user_id
    const currentCv = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, input.id))
      .execute();

    if (currentCv.length === 0) {
      throw new Error(`CV with id ${input.id} not found`);
    }

    const cv = currentCv[0];

    // If setting status to ACTIVE, first deactivate all other CVs for this user
    if (input.status === 'ACTIVE') {
      await db.update(cvsTable)
        .set({ 
          status: 'INACTIVE',
          updated_at: new Date()
        })
        .where(and(
          eq(cvsTable.user_id, cv.user_id),
          ne(cvsTable.id, input.id)
        ))
        .execute();
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.parsed_data !== undefined) {
      updateData.parsed_data = input.parsed_data;
    }

    // Update the target CV
    const result = await db.update(cvsTable)
      .set(updateData)
      .where(eq(cvsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('CV status update failed:', error);
    throw error;
  }
};