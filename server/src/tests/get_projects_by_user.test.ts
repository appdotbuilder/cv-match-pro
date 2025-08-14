import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, searchProjectsTable } from '../db/schema';
import { type GetProjectsByUserInput, type CreateUserInput, type CreateSearchProjectInput } from '../schema';
import { getProjectsByUser } from '../handlers/get_projects_by_user';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'JOB_PROVIDER'
};

const anotherUser: CreateUserInput = {
  email: 'another@example.com',
  first_name: 'Another',
  last_name: 'User',
  role: 'TALENT_ACQUISITION'
};

const testProjectCriteria = {
  minimum_years_experience: 3,
  target_role: 'Software Engineer',
  required_skills: ['JavaScript', 'React'],
  preferred_skills: ['TypeScript', 'Node.js'],
  target_industries: ['Technology', 'Startups'],
  max_job_changes_per_year: 2,
  weights: {
    years_experience: 25,
    role_match: 25,
    skills_match: 30,
    industry_match: 10,
    job_stability: 10
  }
};

describe('getProjectsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no projects', async () => {
    // Create user but no projects
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input: GetProjectsByUserInput = { user_id: userId };

    const result = await getProjectsByUser(input);

    expect(result).toEqual([]);
  });

  it('should return projects for user ordered by creation date (most recent first)', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create multiple projects with slight delays to ensure different timestamps
    const project1Input: CreateSearchProjectInput = {
      name: 'First Project',
      description: 'First project description',
      created_by_user_id: userId,
      criteria: testProjectCriteria,
      status: 'DRAFT'
    };

    const project2Input: CreateSearchProjectInput = {
      name: 'Second Project',
      description: 'Second project description',
      created_by_user_id: userId,
      criteria: testProjectCriteria,
      status: 'ACTIVE'
    };

    const project3Input: CreateSearchProjectInput = {
      name: 'Third Project',
      description: 'Third project description',
      created_by_user_id: userId,
      criteria: testProjectCriteria,
      status: 'COMPLETED'
    };

    // Insert projects in order
    await db.insert(searchProjectsTable).values(project1Input).execute();
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(searchProjectsTable).values(project2Input).execute();
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(searchProjectsTable).values(project3Input).execute();

    const input: GetProjectsByUserInput = { user_id: userId };
    const result = await getProjectsByUser(input);

    // Should return 3 projects
    expect(result).toHaveLength(3);

    // Should be ordered by creation date (most recent first)
    expect(result[0].name).toBe('Third Project');
    expect(result[1].name).toBe('Second Project');
    expect(result[2].name).toBe('First Project');

    // Verify all fields are present and correct
    result.forEach(project => {
      expect(project.id).toBeDefined();
      expect(project.created_by_user_id).toBe(userId);
      expect(project.name).toBeDefined();
      expect(project.criteria).toEqual(testProjectCriteria);
      expect(project.created_at).toBeInstanceOf(Date);
      expect(project.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should only return projects for the specified user', async () => {
    // Create two users
    const user1DbResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2DbResult = await db.insert(usersTable)
      .values(anotherUser)
      .returning()
      .execute();
    
    const user1Id = user1DbResult[0].id;
    const user2Id = user2DbResult[0].id;

    // Create projects for both users
    const user1Project: CreateSearchProjectInput = {
      name: 'User 1 Project',
      description: 'Project by user 1',
      created_by_user_id: user1Id,
      criteria: testProjectCriteria,
      status: 'DRAFT'
    };

    const user2Project: CreateSearchProjectInput = {
      name: 'User 2 Project',
      description: 'Project by user 2',
      created_by_user_id: user2Id,
      criteria: testProjectCriteria,
      status: 'ACTIVE'
    };

    await db.insert(searchProjectsTable).values(user1Project).execute();
    await db.insert(searchProjectsTable).values(user2Project).execute();

    // Query for user 1's projects
    const user1Input: GetProjectsByUserInput = { user_id: user1Id };
    const user1Projects = await getProjectsByUser(user1Input);

    // Should only return user 1's project
    expect(user1Projects).toHaveLength(1);
    expect(user1Projects[0].name).toBe('User 1 Project');
    expect(user1Projects[0].created_by_user_id).toBe(user1Id);

    // Query for user 2's projects
    const user2Input: GetProjectsByUserInput = { user_id: user2Id };
    const user2Projects = await getProjectsByUser(user2Input);

    // Should only return user 2's project
    expect(user2Projects).toHaveLength(1);
    expect(user2Projects[0].name).toBe('User 2 Project');
    expect(user2Projects[0].created_by_user_id).toBe(user2Id);
  });

  it('should return projects with all status types', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create projects with different statuses
    const draftProject: CreateSearchProjectInput = {
      name: 'Draft Project',
      description: 'Draft status project',
      created_by_user_id: userId,
      criteria: testProjectCriteria,
      status: 'DRAFT'
    };

    const activeProject: CreateSearchProjectInput = {
      name: 'Active Project',
      description: 'Active status project',
      created_by_user_id: userId,
      criteria: testProjectCriteria,
      status: 'ACTIVE'
    };

    const completedProject: CreateSearchProjectInput = {
      name: 'Completed Project',
      description: 'Completed status project',
      created_by_user_id: userId,
      criteria: testProjectCriteria,
      status: 'COMPLETED'
    };

    const archivedProject: CreateSearchProjectInput = {
      name: 'Archived Project',
      description: 'Archived status project',
      created_by_user_id: userId,
      criteria: testProjectCriteria,
      status: 'ARCHIVED'
    };

    await db.insert(searchProjectsTable).values([
      draftProject,
      activeProject,
      completedProject,
      archivedProject
    ]).execute();

    const input: GetProjectsByUserInput = { user_id: userId };
    const result = await getProjectsByUser(input);

    // Should return all 4 projects regardless of status
    expect(result).toHaveLength(4);

    const statuses = result.map(project => project.status);
    expect(statuses).toContain('DRAFT');
    expect(statuses).toContain('ACTIVE');
    expect(statuses).toContain('COMPLETED');
    expect(statuses).toContain('ARCHIVED');
  });

  it('should handle non-existent user gracefully', async () => {
    const nonExistentUserId = 99999;
    const input: GetProjectsByUserInput = { user_id: nonExistentUserId };

    const result = await getProjectsByUser(input);

    // Should return empty array for non-existent user
    expect(result).toEqual([]);
  });

  it('should verify chronological ordering with precise timestamps', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create projects with more significant delays to ensure clear ordering
    const projects = [
      { name: 'Oldest Project', order: 1 },
      { name: 'Middle Project', order: 2 },
      { name: 'Newest Project', order: 3 }
    ];

    for (const project of projects) {
      const projectInput: CreateSearchProjectInput = {
        name: project.name,
        description: `Project ${project.order}`,
        created_by_user_id: userId,
        criteria: testProjectCriteria,
        status: 'DRAFT'
      };

      await db.insert(searchProjectsTable).values(projectInput).execute();
      
      // Ensure different timestamps
      if (project.order < projects.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const input: GetProjectsByUserInput = { user_id: userId };
    const result = await getProjectsByUser(input);

    expect(result).toHaveLength(3);

    // Verify reverse chronological order (newest first)
    expect(result[0].name).toBe('Newest Project');
    expect(result[1].name).toBe('Middle Project');
    expect(result[2].name).toBe('Oldest Project');

    // Verify timestamps are indeed in descending order
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].created_at.getTime()
      );
    }
  });
});