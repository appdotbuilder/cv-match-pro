import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, cvsTable } from '../db/schema';
import { type GetCVsByUserInput, type CreateUserInput, type CreateCVInput } from '../schema';
import { getCVsByUser } from '../handlers/get_cvs_by_user';

describe('getCVsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUserInput: CreateUserInput = {
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'JOB_SEEKER'
  };

  const testUserInput2: CreateUserInput = {
    email: 'test2@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    role: 'JOB_SEEKER'
  };

  it('should return empty array when user has no CVs', async () => {
    // Create a user with no CVs
    const userResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const user = userResult[0];

    const input: GetCVsByUserInput = {
      user_id: user.id
    };

    const result = await getCVsByUser(input);

    expect(result).toEqual([]);
  });

  it('should return CVs for the correct user only', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values(testUserInput2)
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Create CVs for both users
    const cv1Input: CreateCVInput = {
      user_id: user1.id,
      filename: 'cv1.pdf',
      original_filename: 'john_cv.pdf',
      file_path: '/uploads/cv1.pdf',
      status: 'ACTIVE'
    };

    const cv2Input: CreateCVInput = {
      user_id: user2.id,
      filename: 'cv2.pdf',
      original_filename: 'jane_cv.pdf',
      file_path: '/uploads/cv2.pdf',
      status: 'INACTIVE'
    };

    await db.insert(cvsTable).values(cv1Input).execute();
    await db.insert(cvsTable).values(cv2Input).execute();

    const input: GetCVsByUserInput = {
      user_id: user1.id
    };

    const result = await getCVsByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].filename).toEqual('cv1.pdf');
    expect(result[0].status).toEqual('ACTIVE');
  });

  it('should return CVs ordered with ACTIVE first, then by creation date', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const user = userResult[0];

    // Create multiple CVs with different statuses and creation times
    const cv1Input: CreateCVInput = {
      user_id: user.id,
      filename: 'cv1.pdf',
      original_filename: 'old_inactive_cv.pdf',
      file_path: '/uploads/cv1.pdf',
      status: 'INACTIVE'
    };

    const cv2Input: CreateCVInput = {
      user_id: user.id,
      filename: 'cv2.pdf',
      original_filename: 'newer_inactive_cv.pdf',
      file_path: '/uploads/cv2.pdf',
      status: 'INACTIVE'
    };

    const cv3Input: CreateCVInput = {
      user_id: user.id,
      filename: 'cv3.pdf',
      original_filename: 'active_cv.pdf',
      file_path: '/uploads/cv3.pdf',
      status: 'ACTIVE'
    };

    // Insert CVs in order (first CV will have earliest timestamp)
    await db.insert(cvsTable).values(cv1Input).execute();
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(cvsTable).values(cv2Input).execute();
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(cvsTable).values(cv3Input).execute();

    const input: GetCVsByUserInput = {
      user_id: user.id
    };

    const result = await getCVsByUser(input);

    expect(result).toHaveLength(3);
    
    // First CV should be the ACTIVE one (regardless of creation time)
    expect(result[0].status).toEqual('ACTIVE');
    expect(result[0].filename).toEqual('cv3.pdf');
    
    // Next should be INACTIVE CVs ordered by creation date (newest first)
    expect(result[1].status).toEqual('INACTIVE');
    expect(result[1].filename).toEqual('cv2.pdf'); // newer inactive CV
    
    expect(result[2].status).toEqual('INACTIVE');
    expect(result[2].filename).toEqual('cv1.pdf'); // older inactive CV
  });

  it('should handle multiple ACTIVE CVs ordered by creation date', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const user = userResult[0];

    // Create multiple ACTIVE CVs
    const cv1Input: CreateCVInput = {
      user_id: user.id,
      filename: 'cv1.pdf',
      original_filename: 'older_active_cv.pdf',
      file_path: '/uploads/cv1.pdf',
      status: 'ACTIVE'
    };

    const cv2Input: CreateCVInput = {
      user_id: user.id,
      filename: 'cv2.pdf',
      original_filename: 'newer_active_cv.pdf',
      file_path: '/uploads/cv2.pdf',
      status: 'ACTIVE'
    };

    // Insert with delay to ensure different timestamps
    await db.insert(cvsTable).values(cv1Input).execute();
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.insert(cvsTable).values(cv2Input).execute();

    const input: GetCVsByUserInput = {
      user_id: user.id
    };

    const result = await getCVsByUser(input);

    expect(result).toHaveLength(2);
    
    // Both are ACTIVE, so should be ordered by creation date (newest first)
    expect(result[0].status).toEqual('ACTIVE');
    expect(result[0].filename).toEqual('cv2.pdf'); // newer CV first
    
    expect(result[1].status).toEqual('ACTIVE');
    expect(result[1].filename).toEqual('cv1.pdf'); // older CV second
  });

  it('should return all CV fields correctly', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const user = userResult[0];

    // Create a CV with all fields
    const cvInput: CreateCVInput = {
      user_id: user.id,
      filename: 'test_cv.pdf',
      original_filename: 'my_resume.pdf',
      file_path: '/uploads/test_cv.pdf',
      status: 'ACTIVE'
    };

    const cvResult = await db.insert(cvsTable)
      .values(cvInput)
      .returning()
      .execute();

    const expectedCV = cvResult[0];

    const input: GetCVsByUserInput = {
      user_id: user.id
    };

    const result = await getCVsByUser(input);

    expect(result).toHaveLength(1);
    
    const cv = result[0];
    expect(cv.id).toEqual(expectedCV.id);
    expect(cv.user_id).toEqual(user.id);
    expect(cv.filename).toEqual('test_cv.pdf');
    expect(cv.original_filename).toEqual('my_resume.pdf');
    expect(cv.file_path).toEqual('/uploads/test_cv.pdf');
    expect(cv.status).toEqual('ACTIVE');
    expect(cv.parsed_data).toBeNull();
    expect(cv.created_at).toBeInstanceOf(Date);
    expect(cv.updated_at).toBeInstanceOf(Date);
  });

  it('should handle user with no CVs gracefully', async () => {
    // Create a user but don't create any CVs
    const userResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();

    const user = userResult[0];

    const input: GetCVsByUserInput = {
      user_id: user.id
    };

    const result = await getCVsByUser(input);

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle nonexistent user ID', async () => {
    const input: GetCVsByUserInput = {
      user_id: 99999 // Non-existent user ID
    };

    const result = await getCVsByUser(input);

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});