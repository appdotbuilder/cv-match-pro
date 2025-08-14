import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user data
const testUser: CreateUserInput = {
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'JOB_SEEKER'
};

const testTalentAcquisition: CreateUserInput = {
  email: 'talent.recruiter@company.com',
  first_name: 'Sarah',
  last_name: 'Smith',
  role: 'TALENT_ACQUISITION'
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];
    
    // Get user by ID
    const result = await getUserById(createdUser.id);

    // Validate result
    expect(result).toBeDefined();
    expect(result?.id).toEqual(createdUser.id);
    expect(result?.email).toEqual('john.doe@example.com');
    expect(result?.first_name).toEqual('John');
    expect(result?.last_name).toEqual('Doe');
    expect(result?.role).toEqual('JOB_SEEKER');
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values(testTalentAcquisition)
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Get specific user by ID
    const result = await getUserById(user2.id);

    // Should return the correct user (user2)
    expect(result).toBeDefined();
    expect(result?.id).toEqual(user2.id);
    expect(result?.email).toEqual('talent.recruiter@company.com');
    expect(result?.first_name).toEqual('Sarah');
    expect(result?.last_name).toEqual('Smith');
    expect(result?.role).toEqual('TALENT_ACQUISITION');

    // Should not return user1 data
    expect(result?.id).not.toEqual(user1.id);
    expect(result?.email).not.toEqual(user1.email);
  });

  it('should handle different user roles correctly', async () => {
    const jobProviderUser: CreateUserInput = {
      email: 'provider@company.com',
      first_name: 'Jane',
      last_name: 'Provider',
      role: 'JOB_PROVIDER'
    };

    // Create user with JOB_PROVIDER role
    const insertResult = await db.insert(usersTable)
      .values(jobProviderUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user by ID
    const result = await getUserById(createdUser.id);

    // Validate role is preserved correctly
    expect(result).toBeDefined();
    expect(result?.role).toEqual('JOB_PROVIDER');
    expect(result?.email).toEqual('provider@company.com');
    expect(result?.first_name).toEqual('Jane');
    expect(result?.last_name).toEqual('Provider');
  });

  it('should return user with proper timestamp types', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user by ID
    const result = await getUserById(createdUser.id);

    // Validate timestamp types
    expect(result).toBeDefined();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
    
    // Ensure timestamps are reasonable (created recently)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    expect(result?.created_at?.getTime()).toBeGreaterThan(fiveMinutesAgo.getTime());
    expect(result?.updated_at?.getTime()).toBeGreaterThan(fiveMinutesAgo.getTime());
  });
});