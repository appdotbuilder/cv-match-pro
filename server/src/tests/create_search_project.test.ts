import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { searchProjectsTable, usersTable } from '../db/schema';
import { type CreateSearchProjectInput, type CreateUserInput } from '../schema';
import { createSearchProject } from '../handlers/create_search_project';
import { eq } from 'drizzle-orm';

// Test user inputs for different roles
const jobProviderUser: CreateUserInput = {
  email: 'provider@test.com',
  first_name: 'Job',
  last_name: 'Provider',
  role: 'JOB_PROVIDER'
};

const talentAcquisitionUser: CreateUserInput = {
  email: 'talent@test.com',
  first_name: 'Talent',
  last_name: 'Acquisition',
  role: 'TALENT_ACQUISITION'
};

const jobSeekerUser: CreateUserInput = {
  email: 'seeker@test.com',
  first_name: 'Job',
  last_name: 'Seeker',
  role: 'JOB_SEEKER'
};

// Valid search project input
const validProjectInput: CreateSearchProjectInput = {
  name: 'Senior Developer Search',
  description: 'Looking for senior developers with React experience',
  created_by_user_id: 1, // Will be updated in tests
  status: 'DRAFT',
  criteria: {
    minimum_years_experience: 5,
    target_role: 'Senior Developer',
    required_skills: ['React', 'JavaScript', 'TypeScript'],
    preferred_skills: ['Node.js', 'GraphQL'],
    target_industries: ['Technology', 'Software'],
    max_job_changes_per_year: 0.5,
    weights: {
      years_experience: 25,
      role_match: 25,
      skills_match: 30,
      industry_match: 10,
      job_stability: 10
    }
  }
};

describe('createSearchProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a search project with JOB_PROVIDER role', async () => {
    // Create a job provider user first
    const [user] = await db.insert(usersTable)
      .values(jobProviderUser)
      .returning()
      .execute();

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id
    };

    const result = await createSearchProject(projectInput);

    // Validate basic project fields
    expect(result.name).toEqual('Senior Developer Search');
    expect(result.description).toEqual(projectInput.description);
    expect(result.created_by_user_id).toEqual(user.id);
    expect(result.status).toEqual('DRAFT');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Validate criteria structure
    expect(result.criteria).toBeDefined();
    expect(result.criteria.minimum_years_experience).toEqual(5);
    expect(result.criteria.target_role).toEqual('Senior Developer');
    expect(result.criteria.required_skills).toEqual(['React', 'JavaScript', 'TypeScript']);
    expect(result.criteria.weights.years_experience).toEqual(25);
    expect(result.criteria.weights.skills_match).toEqual(30);
  });

  it('should create a search project with TALENT_ACQUISITION role', async () => {
    // Create a talent acquisition user first
    const [user] = await db.insert(usersTable)
      .values(talentAcquisitionUser)
      .returning()
      .execute();

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id
    };

    const result = await createSearchProject(projectInput);

    expect(result.name).toEqual('Senior Developer Search');
    expect(result.created_by_user_id).toEqual(user.id);
    expect(result.id).toBeDefined();
  });

  it('should save project to database', async () => {
    // Create a job provider user first
    const [user] = await db.insert(usersTable)
      .values(jobProviderUser)
      .returning()
      .execute();

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id
    };

    const result = await createSearchProject(projectInput);

    // Query the database to verify the project was saved
    const projects = await db.select()
      .from(searchProjectsTable)
      .where(eq(searchProjectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Senior Developer Search');
    expect(projects[0].description).toEqual(projectInput.description);
    expect(projects[0].created_by_user_id).toEqual(user.id);
    expect(projects[0].status).toEqual('DRAFT');
    expect(projects[0].criteria).toEqual(projectInput.criteria);
    expect(projects[0].created_at).toBeInstanceOf(Date);
    expect(projects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject creation with JOB_SEEKER role', async () => {
    // Create a job seeker user first
    const [user] = await db.insert(usersTable)
      .values(jobSeekerUser)
      .returning()
      .execute();

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id
    };

    await expect(createSearchProject(projectInput))
      .rejects.toThrow(/Only JOB_PROVIDER and TALENT_ACQUISITION roles can create search projects/i);
  });

  it('should reject creation with non-existent user', async () => {
    const projectInput = {
      ...validProjectInput,
      created_by_user_id: 999 // Non-existent user ID
    };

    await expect(createSearchProject(projectInput))
      .rejects.toThrow(/User not found/i);
  });

  it('should reject criteria with weights not summing to 100', async () => {
    // Create a job provider user first
    const [user] = await db.insert(usersTable)
      .values(jobProviderUser)
      .returning()
      .execute();

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id,
      criteria: {
        ...validProjectInput.criteria,
        weights: {
          years_experience: 20, // Total will be 95 instead of 100
          role_match: 25,
          skills_match: 30,
          industry_match: 10,
          job_stability: 10
        }
      }
    };

    await expect(createSearchProject(projectInput))
      .rejects.toThrow(/Criteria weights must sum to 100, got 95/i);
  });

  it('should handle project with null description', async () => {
    // Create a job provider user first
    const [user] = await db.insert(usersTable)
      .values(jobProviderUser)
      .returning()
      .execute();

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id,
      description: null
    };

    const result = await createSearchProject(projectInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Senior Developer Search');
    expect(result.id).toBeDefined();
  });

  it('should handle project with ACTIVE status', async () => {
    // Create a job provider user first
    const [user] = await db.insert(usersTable)
      .values(jobProviderUser)
      .returning()
      .execute();

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id,
      status: 'ACTIVE' as const
    };

    const result = await createSearchProject(projectInput);

    expect(result.status).toEqual('ACTIVE');
    expect(result.name).toEqual('Senior Developer Search');
    expect(result.id).toBeDefined();
  });

  it('should handle complex criteria with all optional fields', async () => {
    // Create a talent acquisition user first
    const [user] = await db.insert(usersTable)
      .values(talentAcquisitionUser)
      .returning()
      .execute();

    const complexCriteria = {
      minimum_years_experience: 10,
      target_role: 'Technical Lead',
      required_skills: ['Java', 'Spring', 'Microservices', 'AWS'],
      preferred_skills: ['Kubernetes', 'Docker', 'Python'],
      target_industries: ['Finance', 'Healthcare', 'Technology'],
      max_job_changes_per_year: 0.3,
      weights: {
        years_experience: 30,
        role_match: 20,
        skills_match: 35,
        industry_match: 10,
        job_stability: 5
      }
    };

    const projectInput = {
      ...validProjectInput,
      created_by_user_id: user.id,
      name: 'Technical Lead Search',
      criteria: complexCriteria
    };

    const result = await createSearchProject(projectInput);

    expect(result.criteria.minimum_years_experience).toEqual(10);
    expect(result.criteria.target_role).toEqual('Technical Lead');
    expect(result.criteria.required_skills).toEqual(['Java', 'Spring', 'Microservices', 'AWS']);
    expect(result.criteria.preferred_skills).toEqual(['Kubernetes', 'Docker', 'Python']);
    expect(result.criteria.target_industries).toEqual(['Finance', 'Healthcare', 'Technology']);
    expect(result.criteria.max_job_changes_per_year).toEqual(0.3);
    expect(result.criteria.weights.years_experience).toEqual(30);
    expect(result.criteria.weights.skills_match).toEqual(35);
  });
});