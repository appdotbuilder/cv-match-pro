import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUsersByRoleInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getUsersByRole = async (input: GetUsersByRoleInput): Promise<User[]> => {
  try {
    // Query users by role
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, input.role))
      .execute();

    return result;
  } catch (error) {
    console.error('Get users by role failed:', error);
    throw error;
  }
};