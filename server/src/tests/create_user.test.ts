import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user roles
const jobSeekerInput: CreateUserInput = {
  email: 'jobseeker@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'JOB_SEEKER'
};

const jobProviderInput: CreateUserInput = {
  email: 'provider@company.com',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'JOB_PROVIDER'
};

const talentAcquisitionInput: CreateUserInput = {
  email: 'talent@hr.com',
  first_name: 'Mike',
  last_name: 'Johnson',
  role: 'TALENT_ACQUISITION'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a job seeker user', async () => {
    const result = await createUser(jobSeekerInput);

    // Basic field validation
    expect(result.email).toEqual('jobseeker@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('JOB_SEEKER');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a job provider user', async () => {
    const result = await createUser(jobProviderInput);

    expect(result.email).toEqual('provider@company.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('JOB_PROVIDER');
    expect(result.id).toBeDefined();
  });

  it('should create a talent acquisition user', async () => {
    const result = await createUser(talentAcquisitionInput);

    expect(result.email).toEqual('talent@hr.com');
    expect(result.first_name).toEqual('Mike');
    expect(result.last_name).toEqual('Johnson');
    expect(result.role).toEqual('TALENT_ACQUISITION');
    expect(result.id).toBeDefined();
  });

  it('should save user to database', async () => {
    const result = await createUser(jobSeekerInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('jobseeker@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('JOB_SEEKER');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce email uniqueness', async () => {
    // Create first user
    await createUser(jobSeekerInput);

    // Attempt to create second user with same email
    const duplicateEmailInput: CreateUserInput = {
      email: 'jobseeker@example.com', // Same email
      first_name: 'Different',
      last_name: 'Person',
      role: 'JOB_PROVIDER'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow();
  });

  it('should allow multiple users with different emails', async () => {
    const user1 = await createUser(jobSeekerInput);
    const user2 = await createUser(jobProviderInput);
    const user3 = await createUser(talentAcquisitionInput);

    // Verify all users were created with unique IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user2.id).not.toEqual(user3.id);
    expect(user1.id).not.toEqual(user3.id);

    // Verify all users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);
    const emails = allUsers.map(user => user.email).sort();
    expect(emails).toEqual([
      'jobseeker@example.com',
      'provider@company.com',
      'talent@hr.com'
    ]);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(jobSeekerInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});