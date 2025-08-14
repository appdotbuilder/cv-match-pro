import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, searchProjectsTable } from '../db/schema';
import { type CreateUserInput, type CreateSearchProjectInput } from '../schema';
import { getAllProjects } from '../handlers/get_all_projects';

// Test data
const testUser: CreateUserInput = {
  email: 'talent.acquisition@test.com',
  first_name: 'Talent',
  last_name: 'Acquisition',
  role: 'TALENT_ACQUISITION'
};

const testProject1: CreateSearchProjectInput = {
  name: 'Senior Developer Search',
  description: 'Looking for senior software developers',
  created_by_user_id: 1,
  criteria: {
    minimum_years_experience: 5,
    target_role: 'Senior Developer',
    required_skills: ['JavaScript', 'Node.js'],
    preferred_skills: ['React', 'TypeScript'],
    target_industries: ['Technology', 'Fintech'],
    max_job_changes_per_year: 1,
    weights: {
      years_experience: 25,
      role_match: 25,
      skills_match: 30,
      industry_match: 10,
      job_stability: 10
    }
  },
  status: 'ACTIVE'
};

const testProject2: CreateSearchProjectInput = {
  name: 'Marketing Manager Hunt',
  description: 'Seeking experienced marketing professionals',
  created_by_user_id: 1,
  criteria: {
    minimum_years_experience: 3,
    target_role: 'Marketing Manager',
    required_skills: ['Digital Marketing', 'Analytics'],
    preferred_skills: ['SEO', 'Content Strategy'],
    target_industries: ['Marketing', 'E-commerce'],
    max_job_changes_per_year: 1.5,
    weights: {
      years_experience: 30,
      role_match: 30,
      skills_match: 25,
      industry_match: 10,
      job_stability: 5
    }
  },
  status: 'DRAFT'
};

describe('getAllProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no projects exist', async () => {
    const result = await getAllProjects();

    expect(result).toEqual([]);
  });

  it('should fetch all search projects', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    // Create test projects
    await db.insert(searchProjectsTable).values([
      {
        name: testProject1.name,
        description: testProject1.description,
        created_by_user_id: testProject1.created_by_user_id,
        criteria: testProject1.criteria,
        status: testProject1.status
      },
      {
        name: testProject2.name,
        description: testProject2.description,
        created_by_user_id: testProject2.created_by_user_id,
        criteria: testProject2.criteria,
        status: testProject2.status
      }
    ]).execute();

    const result = await getAllProjects();

    expect(result).toHaveLength(2);
    
    // Verify project data structure
    const project1 = result.find(p => p.name === 'Senior Developer Search');
    const project2 = result.find(p => p.name === 'Marketing Manager Hunt');

    expect(project1).toBeDefined();
    expect(project1!.name).toEqual('Senior Developer Search');
    expect(project1!.description).toEqual('Looking for senior software developers');
    expect(project1!.status).toEqual('ACTIVE');
    expect(project1!.created_by_user_id).toEqual(1);
    expect(project1!.criteria).toEqual(testProject1.criteria);
    expect(project1!.id).toBeDefined();
    expect(project1!.created_at).toBeInstanceOf(Date);
    expect(project1!.updated_at).toBeInstanceOf(Date);

    expect(project2).toBeDefined();
    expect(project2!.name).toEqual('Marketing Manager Hunt');
    expect(project2!.status).toEqual('DRAFT');
  });

  it('should order projects by creation date (newest first)', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    // Create first project
    const firstProject = await db.insert(searchProjectsTable).values({
      name: 'First Project',
      description: 'Created first',
      created_by_user_id: 1,
      criteria: testProject1.criteria,
      status: 'DRAFT'
    }).returning().execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second project
    const secondProject = await db.insert(searchProjectsTable).values({
      name: 'Second Project',
      description: 'Created second',
      created_by_user_id: 1,
      criteria: testProject2.criteria,
      status: 'ACTIVE'
    }).returning().execute();

    const result = await getAllProjects();

    expect(result).toHaveLength(2);
    // Newest should be first
    expect(result[0].name).toEqual('Second Project');
    expect(result[1].name).toEqual('First Project');
    expect(result[0].created_at > result[1].created_at).toBe(true);
  });

  it('should handle projects with different statuses', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    // Create projects with all possible statuses
    await db.insert(searchProjectsTable).values([
      {
        name: 'Draft Project',
        description: null,
        created_by_user_id: 1,
        criteria: testProject1.criteria,
        status: 'DRAFT'
      },
      {
        name: 'Active Project',
        description: 'Currently active',
        created_by_user_id: 1,
        criteria: testProject1.criteria,
        status: 'ACTIVE'
      },
      {
        name: 'Completed Project',
        description: 'Already finished',
        created_by_user_id: 1,
        criteria: testProject1.criteria,
        status: 'COMPLETED'
      },
      {
        name: 'Archived Project',
        description: 'Old project',
        created_by_user_id: 1,
        criteria: testProject1.criteria,
        status: 'ARCHIVED'
      }
    ]).execute();

    const result = await getAllProjects();

    expect(result).toHaveLength(4);
    
    const statuses = result.map(p => p.status);
    expect(statuses).toContain('DRAFT');
    expect(statuses).toContain('ACTIVE');
    expect(statuses).toContain('COMPLETED');
    expect(statuses).toContain('ARCHIVED');
  });

  it('should handle projects with null descriptions', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    // Create project with null description
    await db.insert(searchProjectsTable).values({
      name: 'Project Without Description',
      description: null,
      created_by_user_id: 1,
      criteria: testProject1.criteria,
      status: 'ACTIVE'
    }).execute();

    const result = await getAllProjects();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Project Without Description');
    expect(result[0].description).toBeNull();
  });

  it('should handle complex criteria objects correctly', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    const complexCriteria = {
      minimum_years_experience: 10,
      target_role: 'Principal Engineer',
      required_skills: ['Python', 'Machine Learning', 'AWS', 'Docker'],
      preferred_skills: ['Kubernetes', 'Terraform', 'PostgreSQL'],
      target_industries: ['AI/ML', 'Cloud Services', 'Data Analytics'],
      max_job_changes_per_year: 0.5,
      weights: {
        years_experience: 35,
        role_match: 30,
        skills_match: 25,
        industry_match: 5,
        job_stability: 5
      }
    };

    await db.insert(searchProjectsTable).values({
      name: 'Principal Engineer Search',
      description: 'Looking for senior technical leader',
      created_by_user_id: 1,
      criteria: complexCriteria,
      status: 'ACTIVE'
    }).execute();

    const result = await getAllProjects();

    expect(result).toHaveLength(1);
    expect(result[0].criteria).toEqual(complexCriteria);
    expect(result[0].criteria.required_skills).toContain('Machine Learning');
    expect(result[0].criteria.weights.years_experience).toEqual(35);
  });
});