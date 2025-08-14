import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cvsTable, usersTable } from '../db/schema';
import { type CreateCVInput } from '../schema';
import { createCV } from '../handlers/create_cv';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'JOB_SEEKER' as const
};

// Test CV input
const testCVInput: CreateCVInput = {
  user_id: 1, // Will be set after user creation
  filename: 'cv_123456.pdf',
  original_filename: 'john_doe_resume.pdf',
  file_path: '/uploads/cvs/cv_123456.pdf',
  status: 'ACTIVE'
};

describe('createCV', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a CV with all required fields', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const cvInput = { ...testCVInput, user_id: userId };

    const result = await createCV(cvInput);

    // Verify basic fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.filename).toEqual('cv_123456.pdf');
    expect(result.original_filename).toEqual('john_doe_resume.pdf');
    expect(result.file_path).toEqual('/uploads/cvs/cv_123456.pdf');
    expect(result.status).toEqual('ACTIVE');
    expect(result.parsed_data).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save CV to database', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const cvInput = { ...testCVInput, user_id: userId };

    const result = await createCV(cvInput);

    // Query database to verify CV was saved
    const cvs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, result.id))
      .execute();

    expect(cvs).toHaveLength(1);
    expect(cvs[0].user_id).toEqual(userId);
    expect(cvs[0].filename).toEqual('cv_123456.pdf');
    expect(cvs[0].original_filename).toEqual('john_doe_resume.pdf');
    expect(cvs[0].status).toEqual('ACTIVE');
  });

  it('should create CV with INACTIVE status by default', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const cvInput = { 
      ...testCVInput, 
      user_id: userId,
      status: 'INACTIVE' as const
    };

    const result = await createCV(cvInput);

    expect(result.status).toEqual('INACTIVE');
  });

  it('should deactivate other CVs when setting one as active', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create first CV as active
    const firstCVInput = { ...testCVInput, user_id: userId, status: 'ACTIVE' as const };
    const firstCV = await createCV(firstCVInput);

    // Create second CV as active (should deactivate the first one)
    const secondCVInput = {
      ...testCVInput,
      user_id: userId,
      filename: 'cv_789012.pdf',
      original_filename: 'john_doe_updated_resume.pdf',
      file_path: '/uploads/cvs/cv_789012.pdf',
      status: 'ACTIVE' as const
    };
    const secondCV = await createCV(secondCVInput);

    // Check that first CV is now inactive
    const allCVs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.user_id, userId))
      .execute();

    expect(allCVs).toHaveLength(2);
    
    // Find the first CV and verify it's inactive
    const updatedFirstCV = allCVs.find(cv => cv.id === firstCV.id);
    expect(updatedFirstCV?.status).toEqual('INACTIVE');
    
    // Verify second CV is active
    const updatedSecondCV = allCVs.find(cv => cv.id === secondCV.id);
    expect(updatedSecondCV?.status).toEqual('ACTIVE');
  });

  it('should not affect CVs of other users when setting as active', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'jane.smith@example.com',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create active CV for user 1
    const user1CVInput = { ...testCVInput, user_id: user1Id, status: 'ACTIVE' as const };
    await createCV(user1CVInput);

    // Create active CV for user 2
    const user2CVInput = { 
      ...testCVInput, 
      user_id: user2Id, 
      filename: 'cv_user2.pdf',
      file_path: '/uploads/cvs/cv_user2.pdf',
      status: 'ACTIVE' as const 
    };
    await createCV(user2CVInput);

    // Verify both users still have their active CVs
    const user1CVs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.user_id, user1Id))
      .execute();
    
    const user2CVs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.user_id, user2Id))
      .execute();

    expect(user1CVs[0].status).toEqual('ACTIVE');
    expect(user2CVs[0].status).toEqual('ACTIVE');
  });

  it('should throw error when user does not exist', async () => {
    const cvInput = { ...testCVInput, user_id: 99999 };

    await expect(createCV(cvInput)).rejects.toThrow(/user with id 99999 does not exist/i);
  });

  it('should allow multiple inactive CVs for the same user', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create first inactive CV
    const firstCVInput = { ...testCVInput, user_id: userId, status: 'INACTIVE' as const };
    await createCV(firstCVInput);

    // Create second inactive CV
    const secondCVInput = {
      ...testCVInput,
      user_id: userId,
      filename: 'cv_second.pdf',
      file_path: '/uploads/cvs/cv_second.pdf',
      status: 'INACTIVE' as const
    };
    await createCV(secondCVInput);

    // Verify both CVs exist and are inactive
    const allCVs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.user_id, userId))
      .execute();

    expect(allCVs).toHaveLength(2);
    expect(allCVs.every(cv => cv.status === 'INACTIVE')).toBe(true);
  });
});