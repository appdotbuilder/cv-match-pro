import { db } from '../db';
import { cvsTable, usersTable } from '../db/schema';
import { type CreateCVInput, type CV } from '../schema';
import { eq } from 'drizzle-orm';

export async function createCV(input: CreateCVInput): Promise<CV> {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();
    
    if (!user.length) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // If the new CV is being set as active, deactivate all other CVs for this user
    if (input.status === 'ACTIVE') {
      await db.update(cvsTable)
        .set({ 
          status: 'INACTIVE',
          updated_at: new Date()
        })
        .where(eq(cvsTable.user_id, input.user_id))
        .execute();
    }

    // Insert the new CV record
    const result = await db.insert(cvsTable)
      .values({
        user_id: input.user_id,
        filename: input.filename,
        original_filename: input.original_filename,
        file_path: input.file_path,
        status: input.status,
        parsed_data: null // Will be populated later by AI parsing
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('CV creation failed:', error);
    throw error;
  }
}