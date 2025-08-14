import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, searchProjectsTable } from '../db/schema';
import { type CreateUserInput, type CreateSearchProjectInput } from '../schema';
import { getProjectDetails } from '../handlers/get_project_details';

describe('getProjectDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return project details for existing project', async () => {
    // Create a user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'TALENT_ACQUISITION'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test project
    const testCriteria = {
      minimum_years_experience: 5,
      target_role: 'Software Engineer',
      required_skills: ['JavaScript', 'React'],
      preferred_skills: ['TypeScript', 'Node.js'],
      target_industries: ['Technology', 'Fintech'],
      max_job_changes_per_year: 1.5,
      weights: {
        years_experience: 25,
        role_match: 25,
        skills_match: 30,
        industry_match: 10,
        job_stability: 10
      }
    };

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        name: 'Senior Developer Search',
        description: 'Looking for experienced developers',
        created_by_user_id: userId,
        status: 'ACTIVE',
        criteria: testCriteria
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    // Test the handler
    const result = await getProjectDetails(projectId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(projectId);
    expect(result!.name).toBe('Senior Developer Search');
    expect(result!.description).toBe('Looking for experienced developers');
    expect(result!.created_by_user_id).toBe(userId);
    expect(result!.status).toBe('ACTIVE');
    expect(result!.criteria).toEqual(testCriteria);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent project', async () => {
    const result = await getProjectDetails(999999);
    expect(result).toBeNull();
  });

  it('should handle project with null description', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'JOB_PROVIDER'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create project with null description
    const testCriteria = {
      minimum_years_experience: null,
      target_role: null,
      required_skills: ['Python'],
      preferred_skills: [],
      target_industries: [],
      max_job_changes_per_year: null,
      weights: {
        years_experience: 20,
        role_match: 30,
        skills_match: 40,
        industry_match: 5,
        job_stability: 5
      }
    };

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        name: 'Python Developer Hunt',
        description: null,
        created_by_user_id: userId,
        status: 'DRAFT',
        criteria: testCriteria
      })
      .returning()
      .execute();

    const projectId = projectResult[0].id;

    const result = await getProjectDetails(projectId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(projectId);
    expect(result!.name).toBe('Python Developer Hunt');
    expect(result!.description).toBeNull();
    expect(result!.status).toBe('DRAFT');
    expect(result!.criteria).toEqual(testCriteria);
  });

  it('should return project with different status values', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Bob',
        last_name: 'Wilson',
        role: 'TALENT_ACQUISITION'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Test different project statuses
    const statuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
    
    for (const status of statuses) {
      const testCriteria = {
        minimum_years_experience: 3,
        target_role: 'Data Analyst',
        required_skills: ['SQL', 'Python'],
        preferred_skills: ['R', 'Tableau'],
        target_industries: ['Healthcare'],
        max_job_changes_per_year: 2,
        weights: {
          years_experience: 25,
          role_match: 25,
          skills_match: 30,
          industry_match: 10,
          job_stability: 10
        }
      };

      const projectResult = await db.insert(searchProjectsTable)
        .values({
          name: `Project ${status}`,
          description: `Project with ${status} status`,
          created_by_user_id: userId,
          status: status,
          criteria: testCriteria
        })
        .returning()
        .execute();

      const result = await getProjectDetails(projectResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(status);
      expect(result!.name).toBe(`Project ${status}`);
    }
  });

  it('should handle complex criteria structure', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'JOB_PROVIDER'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Complex criteria with all possible fields
    const complexCriteria = {
      minimum_years_experience: 10,
      target_role: 'Senior Full Stack Engineer',
      required_skills: [
        'JavaScript',
        'TypeScript', 
        'React',
        'Node.js',
        'PostgreSQL',
        'Docker',
        'AWS'
      ],
      preferred_skills: [
        'GraphQL',
        'Microservices',
        'Kubernetes',
        'Redis',
        'MongoDB',
        'Next.js',
        'Jest'
      ],
      target_industries: [
        'Technology',
        'Fintech',
        'E-commerce',
        'SaaS'
      ],
      max_job_changes_per_year: 0.8,
      weights: {
        years_experience: 30,
        role_match: 20,
        skills_match: 35,
        industry_match: 10,
        job_stability: 5
      }
    };

    const projectResult = await db.insert(searchProjectsTable)
      .values({
        name: 'Complex Search Project',
        description: 'Multi-criteria search for senior engineer',
        created_by_user_id: userId,
        status: 'ACTIVE',
        criteria: complexCriteria
      })
      .returning()
      .execute();

    const result = await getProjectDetails(projectResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.criteria).toEqual(complexCriteria);
    expect(result!.criteria.required_skills).toHaveLength(7);
    expect(result!.criteria.preferred_skills).toHaveLength(7);
    expect(result!.criteria.target_industries).toHaveLength(4);
    expect(result!.criteria.weights.years_experience).toBe(30);
  });
});