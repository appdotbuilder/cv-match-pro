import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUsersByRoleInput, type CreateUserInput } from '../schema';
import { getUsersByRole } from '../handlers/get_users_by_role';
import { eq } from 'drizzle-orm';

// Test data setup
const testUsers: CreateUserInput[] = [
  {
    email: 'jobseeker1@example.com',
    first_name: 'John',
    last_name: 'Seeker',
    role: 'JOB_SEEKER'
  },
  {
    email: 'jobseeker2@example.com',
    first_name: 'Jane',
    last_name: 'Applicant',
    role: 'JOB_SEEKER'
  },
  {
    email: 'provider1@example.com',
    first_name: 'Alice',
    last_name: 'Provider',
    role: 'JOB_PROVIDER'
  },
  {
    email: 'talent1@example.com',
    first_name: 'Bob',
    last_name: 'Talent',
    role: 'TALENT_ACQUISITION'
  }
];

describe('getUsersByRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return users with specified role', async () => {
    // Create test users
    await db.insert(usersTable).values(testUsers).execute();

    const input: GetUsersByRoleInput = {
      role: 'JOB_SEEKER'
    };

    const result = await getUsersByRole(input);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('JOB_SEEKER');
    expect(result[1].role).toBe('JOB_SEEKER');
    
    // Verify specific user data
    const emails = result.map(user => user.email);
    expect(emails).toContain('jobseeker1@example.com');
    expect(emails).toContain('jobseeker2@example.com');
    
    // Verify user structure
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.first_name).toBeDefined();
      expect(user.last_name).toBeDefined();
      expect(user.role).toBe('JOB_SEEKER');
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return users with JOB_PROVIDER role', async () => {
    // Create test users
    await db.insert(usersTable).values(testUsers).execute();

    const input: GetUsersByRoleInput = {
      role: 'JOB_PROVIDER'
    };

    const result = await getUsersByRole(input);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('JOB_PROVIDER');
    expect(result[0].email).toBe('provider1@example.com');
    expect(result[0].first_name).toBe('Alice');
    expect(result[0].last_name).toBe('Provider');
  });

  it('should return users with TALENT_ACQUISITION role', async () => {
    // Create test users
    await db.insert(usersTable).values(testUsers).execute();

    const input: GetUsersByRoleInput = {
      role: 'TALENT_ACQUISITION'
    };

    const result = await getUsersByRole(input);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('TALENT_ACQUISITION');
    expect(result[0].email).toBe('talent1@example.com');
    expect(result[0].first_name).toBe('Bob');
    expect(result[0].last_name).toBe('Talent');
  });

  it('should return empty array when no users have specified role', async () => {
    // Create only JOB_SEEKER users
    const jobSeekerUsers = testUsers.filter(user => user.role === 'JOB_SEEKER');
    await db.insert(usersTable).values(jobSeekerUsers).execute();

    const input: GetUsersByRoleInput = {
      role: 'TALENT_ACQUISITION'
    };

    const result = await getUsersByRole(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array when no users exist in database', async () => {
    const input: GetUsersByRoleInput = {
      role: 'JOB_SEEKER'
    };

    const result = await getUsersByRole(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle multiple users with same role correctly', async () => {
    // Create multiple users with same role
    const multipleJobSeekers: CreateUserInput[] = [
      ...testUsers.filter(user => user.role === 'JOB_SEEKER'),
      {
        email: 'jobseeker3@example.com',
        first_name: 'Mike',
        last_name: 'Hunter',
        role: 'JOB_SEEKER'
      },
      {
        email: 'jobseeker4@example.com',
        first_name: 'Sarah',
        last_name: 'Worker',
        role: 'JOB_SEEKER'
      }
    ];

    await db.insert(usersTable).values(multipleJobSeekers).execute();

    const input: GetUsersByRoleInput = {
      role: 'JOB_SEEKER'
    };

    const result = await getUsersByRole(input);

    expect(result).toHaveLength(4);
    
    // Verify all returned users have correct role
    result.forEach(user => {
      expect(user.role).toBe('JOB_SEEKER');
    });
    
    // Verify all expected emails are present
    const emails = result.map(user => user.email);
    expect(emails).toContain('jobseeker1@example.com');
    expect(emails).toContain('jobseeker2@example.com');
    expect(emails).toContain('jobseeker3@example.com');
    expect(emails).toContain('jobseeker4@example.com');
  });

  it('should verify data consistency with database', async () => {
    // Create test users
    await db.insert(usersTable).values(testUsers).execute();

    const input: GetUsersByRoleInput = {
      role: 'JOB_PROVIDER'
    };

    const result = await getUsersByRole(input);

    // Verify by querying database directly
    const directQuery = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'JOB_PROVIDER'))
      .execute();

    expect(result).toHaveLength(directQuery.length);
    expect(result[0].id).toBe(directQuery[0].id);
    expect(result[0].email).toBe(directQuery[0].email);
    expect(result[0].role).toBe(directQuery[0].role);
  });
});