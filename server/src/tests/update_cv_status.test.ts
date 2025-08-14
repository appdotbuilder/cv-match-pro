import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, cvsTable } from '../db/schema';
import { type UpdateCVInput } from '../schema';
import { updateCVStatus } from '../handlers/update_cv_status';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'JOB_SEEKER' as const
};

const testCV1 = {
  filename: 'cv1.pdf',
  original_filename: 'John_Doe_CV.pdf',
  file_path: '/uploads/cv1.pdf',
  status: 'INACTIVE' as const
};

const testCV2 = {
  filename: 'cv2.pdf',
  original_filename: 'John_Doe_CV_Updated.pdf',
  file_path: '/uploads/cv2.pdf',
  status: 'ACTIVE' as const
};

const testParsedData = {
  total_years_experience: 5,
  skills: ['JavaScript', 'TypeScript', 'React'],
  contact_info: {
    email: 'john@example.com',
    phone: '+1234567890',
    location: 'New York, NY'
  }
};

describe('updateCVStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let cvId1: number;
  let cvId2: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test CVs
    const cv1Result = await db.insert(cvsTable)
      .values({ ...testCV1, user_id: userId })
      .returning()
      .execute();
    cvId1 = cv1Result[0].id;

    const cv2Result = await db.insert(cvsTable)
      .values({ ...testCV2, user_id: userId })
      .returning()
      .execute();
    cvId2 = cv2Result[0].id;
  });

  it('should update CV status to ACTIVE', async () => {
    const input: UpdateCVInput = {
      id: cvId1,
      status: 'ACTIVE'
    };

    const result = await updateCVStatus(input);

    expect(result.id).toEqual(cvId1);
    expect(result.status).toEqual('ACTIVE');
    expect(result.user_id).toEqual(userId);
    expect(result.filename).toEqual('cv1.pdf');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const cvs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, cvId1))
      .execute();

    expect(cvs[0].status).toEqual('ACTIVE');
  });

  it('should update CV status to INACTIVE', async () => {
    const input: UpdateCVInput = {
      id: cvId2,
      status: 'INACTIVE'
    };

    const result = await updateCVStatus(input);

    expect(result.id).toEqual(cvId2);
    expect(result.status).toEqual('INACTIVE');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update parsed_data only', async () => {
    const input: UpdateCVInput = {
      id: cvId1,
      parsed_data: testParsedData
    };

    const result = await updateCVStatus(input);

    expect(result.id).toEqual(cvId1);
    expect(result.status).toEqual('INACTIVE'); // Should remain unchanged
    expect(result.parsed_data).toEqual(testParsedData);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const cvs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, cvId1))
      .execute();

    expect(cvs[0].parsed_data).toEqual(testParsedData);
  });

  it('should update both status and parsed_data', async () => {
    const input: UpdateCVInput = {
      id: cvId1,
      status: 'ACTIVE',
      parsed_data: testParsedData
    };

    const result = await updateCVStatus(input);

    expect(result.id).toEqual(cvId1);
    expect(result.status).toEqual('ACTIVE');
    expect(result.parsed_data).toEqual(testParsedData);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should deactivate other user CVs when setting one to ACTIVE', async () => {
    // Initially CV2 is ACTIVE, CV1 is INACTIVE
    const input: UpdateCVInput = {
      id: cvId1,
      status: 'ACTIVE'
    };

    await updateCVStatus(input);

    // Check that CV1 is now ACTIVE
    const cv1 = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, cvId1))
      .execute();
    expect(cv1[0].status).toEqual('ACTIVE');

    // Check that CV2 is now INACTIVE
    const cv2 = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, cvId2))
      .execute();
    expect(cv2[0].status).toEqual('INACTIVE');
  });

  it('should not affect CVs of other users when setting to ACTIVE', async () => {
    // Create another user and CV
    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'JOB_SEEKER'
      })
      .returning()
      .execute();
    const anotherUserId = anotherUserResult[0].id;

    const anotherCvResult = await db.insert(cvsTable)
      .values({
        user_id: anotherUserId,
        filename: 'jane_cv.pdf',
        original_filename: 'Jane_Smith_CV.pdf',
        file_path: '/uploads/jane_cv.pdf',
        status: 'ACTIVE'
      })
      .returning()
      .execute();
    const anotherCvId = anotherCvResult[0].id;

    // Update first user's CV to ACTIVE
    const input: UpdateCVInput = {
      id: cvId1,
      status: 'ACTIVE'
    };

    await updateCVStatus(input);

    // Check that the other user's CV is still ACTIVE
    const anotherCv = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, anotherCvId))
      .execute();
    expect(anotherCv[0].status).toEqual('ACTIVE');
  });

  it('should throw error for non-existent CV', async () => {
    const input: UpdateCVInput = {
      id: 99999,
      status: 'ACTIVE'
    };

    await expect(updateCVStatus(input)).rejects.toThrow(/CV with id 99999 not found/i);
  });

  it('should handle null parsed_data', async () => {
    const input: UpdateCVInput = {
      id: cvId1,
      parsed_data: null
    };

    const result = await updateCVStatus(input);

    expect(result.id).toEqual(cvId1);
    expect(result.parsed_data).toBeNull();

    // Verify in database
    const cvs = await db.select()
      .from(cvsTable)
      .where(eq(cvsTable.id, cvId1))
      .execute();

    expect(cvs[0].parsed_data).toBeNull();
  });

  it('should preserve other fields when updating', async () => {
    const input: UpdateCVInput = {
      id: cvId1,
      status: 'ACTIVE'
    };

    const result = await updateCVStatus(input);

    // All original fields should be preserved
    expect(result.filename).toEqual(testCV1.filename);
    expect(result.original_filename).toEqual(testCV1.original_filename);
    expect(result.file_path).toEqual(testCV1.file_path);
    expect(result.user_id).toEqual(userId);
    expect(result.created_at).toBeInstanceOf(Date);
  });
});