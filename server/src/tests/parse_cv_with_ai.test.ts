import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { parseCVWithAI } from '../handlers/parse_cv_with_ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Test file paths
const testFilesDir = path.join(os.tmpdir(), 'cv_parsing_tests');
const seniorCVPath = path.join(testFilesDir, 'senior_developer.pdf');
const juniorCVPath = path.join(testFilesDir, 'junior_developer.pdf');
const emptyCVPath = path.join(testFilesDir, 'empty_cv.pdf');
const largeCVPath = path.join(testFilesDir, 'large_cv.pdf');
const invalidFormatPath = path.join(testFilesDir, 'document.xyz');

describe('parseCVWithAI', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test files directory
    try {
      await fs.mkdir(testFilesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Create mock CV files for testing
    await fs.writeFile(seniorCVPath, 'Mock senior developer CV content');
    await fs.writeFile(juniorCVPath, 'Mock junior developer CV content');
    await fs.writeFile(emptyCVPath, 'Mock empty CV content');
    await fs.writeFile(largeCVPath, 'A'.repeat(100)); // Small file for testing
    await fs.writeFile(invalidFormatPath, 'Invalid format file');
  });

  afterEach(async () => {
    await resetDB();
    
    // Clean up test files
    try {
      await fs.rm(testFilesDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  it('should parse senior developer CV successfully', async () => {
    const result = await parseCVWithAI(seniorCVPath);

    // Verify basic structure
    expect(result).toBeDefined();
    expect(typeof result.total_years_experience).toBe('number');
    expect(result.total_years_experience).toBe(8);
    
    // Verify employment history
    expect(result.employment_history).toBeDefined();
    expect(Array.isArray(result.employment_history)).toBe(true);
    expect(result.employment_history).toHaveLength(3);
    
    // Check first job details
    const firstJob = result.employment_history![0];
    expect(firstJob.company).toBe('TechCorp Solutions');
    expect(firstJob.position).toBe('Senior Software Engineer');
    expect(firstJob.start_date).toBe('2020-01');
    expect(firstJob.end_date).toBe('2024-01');
    expect(firstJob.duration_months).toBe(48);
    expect(firstJob.description).toContain('microservices');

    // Verify job changes frequency calculation
    expect(typeof result.job_changes_frequency).toBe('number');
    expect(result.job_changes_frequency).toBeCloseTo(0.25, 2); // 2 job changes / 8 years

    // Verify roles and positions
    expect(Array.isArray(result.roles_positions)).toBe(true);
    expect(result.roles_positions).toContain('Senior Software Engineer');
    expect(result.roles_positions).toContain('Full Stack Developer');
    expect(result.roles_positions).toContain('Junior Developer');

    // Verify skills extraction
    expect(Array.isArray(result.skills)).toBe(true);
    expect(result.skills).toContain('JavaScript');
    expect(result.skills).toContain('Node.js');
    expect(result.skills).toContain('React');
    expect(result.skills).toContain('Python');

    // Verify dominant industries
    expect(Array.isArray(result.dominant_industries)).toBe(true);
    expect(result.dominant_industries).toContain('Technology');

    // Verify contact information
    expect(result.contact_info).toBeDefined();
    expect(result.contact_info!.email).toBe('john.senior@email.com');
    expect(result.contact_info!.phone).toBe('+1-555-0123');
    expect(result.contact_info!.location).toBe('San Francisco, CA');

    // Verify education
    expect(Array.isArray(result.education)).toBe(true);
    expect(result.education).toHaveLength(1);
    expect(result.education![0].institution).toBe('University of California');
    expect(result.education![0].degree).toBe('Bachelor of Science');
    expect(result.education![0].field).toBe('Computer Science');
    expect(result.education![0].graduation_year).toBe(2015);
  });

  it('should parse junior developer CV successfully', async () => {
    const result = await parseCVWithAI(juniorCVPath);

    expect(result).toBeDefined();
    expect(result.total_years_experience).toBe(1.5);
    
    // Should have minimal employment history
    expect(result.employment_history).toHaveLength(1);
    expect(result.employment_history![0].company).toBe('StartupABC');
    expect(result.employment_history![0].position).toBe('Junior Developer');

    // Job changes frequency should be 0 (no job changes yet)
    expect(result.job_changes_frequency).toBe(0);

    // Skills should be more limited
    expect(result.skills).toContain('React');
    expect(result.skills).toContain('TypeScript');
    expect(result.skills).not.toContain('Python'); // Senior skill not present

    // Contact info should be different
    expect(result.contact_info!.email).toBe('jane.junior@email.com');
    expect(result.contact_info!.location).toBe('Austin, TX');
  });

  it('should handle empty/minimal CV content', async () => {
    const result = await parseCVWithAI(emptyCVPath);

    expect(result).toBeDefined();
    expect(result.total_years_experience).toBeNull();
    expect(result.employment_history).toBeNull();
    expect(result.job_changes_frequency).toBeNull();
    expect(result.roles_positions).toBeNull();
    expect(result.skills).toBeNull();
    expect(result.dominant_industries).toBeNull();
    expect(result.contact_info).toBeNull();
    expect(result.education).toBeNull();
  });

  it('should reject invalid file formats', async () => {
    await expect(parseCVWithAI(invalidFormatPath)).rejects.toThrow(/unsupported file format/i);
  });

  it('should reject non-existent files', async () => {
    const nonExistentPath = path.join(testFilesDir, 'does_not_exist.pdf');
    await expect(parseCVWithAI(nonExistentPath)).rejects.toThrow(/ENOENT|no such file/i);
  });

  it('should reject invalid file path inputs', async () => {
    await expect(parseCVWithAI('')).rejects.toThrow(/invalid file path/i);
    await expect(parseCVWithAI(null as any)).rejects.toThrow(/invalid file path/i);
    await expect(parseCVWithAI(undefined as any)).rejects.toThrow(/invalid file path/i);
  });

  it('should handle file size limits', async () => {
    // Create a file larger than 10MB for testing
    const largeCVBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB buffer
    const largeCVTestPath = path.join(testFilesDir, 'very_large_cv.pdf');
    
    try {
      await fs.writeFile(largeCVTestPath, largeCVBuffer);
      await expect(parseCVWithAI(largeCVTestPath)).rejects.toThrow(/file size exceeds/i);
    } finally {
      // Clean up the large test file
      try {
        await fs.unlink(largeCVTestPath);
      } catch (error) {
        // File might not exist
      }
    }
  });

  it('should calculate job changes frequency correctly', async () => {
    const result = await parseCVWithAI(seniorCVPath);

    // Senior CV has 3 jobs (2 job changes) over 8 years
    // Expected frequency: 2 changes / 8 years = 0.25 changes per year
    expect(result.job_changes_frequency).toBeCloseTo(0.25, 2);
  });

  it('should extract industries correctly', async () => {
    const result = await parseCVWithAI(seniorCVPath);

    expect(result.dominant_industries).toBeDefined();
    expect(Array.isArray(result.dominant_industries)).toBe(true);
    expect(result.dominant_industries!.length).toBeGreaterThan(0);
    expect(result.dominant_industries![0]).toBe('Technology'); // Should be the top industry
  });

  it('should validate employment history structure', async () => {
    const result = await parseCVWithAI(seniorCVPath);

    expect(result.employment_history).toBeDefined();
    result.employment_history!.forEach(job => {
      expect(typeof job.company).toBe('string');
      expect(typeof job.position).toBe('string');
      expect(job.start_date).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM format
      if (job.end_date) {
        expect(job.end_date).toMatch(/^\d{4}-\d{2}$/);
      }
      expect(typeof job.duration_months).toBe('number');
      if (job.description) {
        expect(typeof job.description).toBe('string');
      }
    });
  });

  it('should validate education structure', async () => {
    const result = await parseCVWithAI(seniorCVPath);

    expect(result.education).toBeDefined();
    result.education!.forEach(edu => {
      expect(typeof edu.institution).toBe('string');
      if (edu.degree) {
        expect(typeof edu.degree).toBe('string');
      }
      if (edu.field) {
        expect(typeof edu.field).toBe('string');
      }
      if (edu.graduation_year) {
        expect(typeof edu.graduation_year).toBe('number');
        expect(edu.graduation_year).toBeGreaterThan(1900);
        expect(edu.graduation_year).toBeLessThan(2030);
      }
    });
  });

  it('should validate contact info structure', async () => {
    const result = await parseCVWithAI(seniorCVPath);

    expect(result.contact_info).toBeDefined();
    
    if (result.contact_info!.email) {
      expect(result.contact_info!.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Basic email format
    }
    
    if (result.contact_info!.phone) {
      expect(typeof result.contact_info!.phone).toBe('string');
      expect(result.contact_info!.phone.length).toBeGreaterThan(5);
    }
    
    if (result.contact_info!.location) {
      expect(typeof result.contact_info!.location).toBe('string');
    }
  });
});