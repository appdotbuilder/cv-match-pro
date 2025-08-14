import { type ParsedCVData } from '../schema';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock AI parsing service - in production this would connect to an actual AI service
interface AIParsingResponse {
  success: boolean;
  data?: ParsedCVData;
  error?: string;
}

// Helper function to calculate job changes frequency
function calculateJobChangesFrequency(employmentHistory: ParsedCVData['employment_history'], totalYears: number | null): number | null {
  if (!employmentHistory || !totalYears || totalYears <= 0) return null;
  
  // Count distinct employers
  const uniqueEmployers = new Set(employmentHistory.map(job => job.company.toLowerCase().trim()));
  const jobChanges = Math.max(0, uniqueEmployers.size - 1); // Subtract 1 because first job isn't a "change"
  
  return jobChanges / totalYears;
}

// Helper function to extract dominant industries from employment history
function extractDominantIndustries(employmentHistory: ParsedCVData['employment_history']): string[] | null {
  if (!employmentHistory || employmentHistory.length === 0) return null;

  // Mock industry classification based on company names and positions
  // In production, this would use AI/ML models for proper industry classification
  const industryKeywords = {
    'Technology': ['software', 'tech', 'developer', 'engineer', 'IT', 'microsoft', 'google', 'amazon', 'apple'],
    'Finance': ['bank', 'finance', 'investment', 'trading', 'analyst', 'financial', 'credit'],
    'Healthcare': ['hospital', 'medical', 'health', 'doctor', 'nurse', 'pharmaceutical', 'clinical'],
    'Education': ['school', 'university', 'education', 'teacher', 'professor', 'academic'],
    'Retail': ['retail', 'store', 'sales', 'customer', 'merchandise', 'shopping'],
    'Manufacturing': ['manufacturing', 'factory', 'production', 'assembly', 'industrial']
  };

  const industryScores: Record<string, number> = {};

  employmentHistory.forEach(job => {
    const jobText = `${job.company} ${job.position} ${job.description || ''}`.toLowerCase();
    
    Object.entries(industryKeywords).forEach(([industry, keywords]) => {
      const matches = keywords.filter(keyword => jobText.includes(keyword)).length;
      industryScores[industry] = (industryScores[industry] || 0) + matches;
    });
  });

  // Return industries with scores > 0, sorted by score
  return Object.entries(industryScores)
    .filter(([_, score]) => score > 0)
    .sort(([_, a], [__, b]) => b - a)
    .map(([industry]) => industry);
}

// Mock AI parsing function - simulates calling an AI service
async function callAIParsingService(filePath: string): Promise<AIParsingResponse> {
  try {
    // Check if file exists
    await fs.access(filePath);
    
    // Get file extension to determine parsing strategy
    const fileExt = path.extname(filePath).toLowerCase();
    
    if (!['.pdf', '.doc', '.docx', '.txt'].includes(fileExt)) {
      return {
        success: false,
        error: `Unsupported file format: ${fileExt}. Supported formats: PDF, DOC, DOCX, TXT`
      };
    }

    // Mock file size check (simulate file reading)
    const stats = await fs.stat(filePath);
    if (stats.size > 10 * 1024 * 1024) { // 10MB limit
      return {
        success: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock parsed data based on filename patterns (for testing purposes)
    const filename = path.basename(filePath).toLowerCase();
    
    let mockData: ParsedCVData;

    if (filename.includes('senior') || filename.includes('experienced')) {
      // Senior developer profile
      const employmentHistory = [
        {
          company: 'TechCorp Solutions',
          position: 'Senior Software Engineer',
          start_date: '2020-01',
          end_date: '2024-01',
          duration_months: 48,
          description: 'Led development of microservices architecture using Node.js and React'
        },
        {
          company: 'StartupXYZ',
          position: 'Full Stack Developer',
          start_date: '2018-06',
          end_date: '2019-12',
          duration_months: 18,
          description: 'Developed web applications using JavaScript, Python, and PostgreSQL'
        },
        {
          company: 'WebDev Inc',
          position: 'Junior Developer',
          start_date: '2016-03',
          end_date: '2018-05',
          duration_months: 26,
          description: 'Frontend development with HTML, CSS, and JavaScript'
        }
      ];

      const totalYears = 8;
      
      mockData = {
        total_years_experience: totalYears,
        employment_history: employmentHistory,
        job_changes_frequency: calculateJobChangesFrequency(employmentHistory, totalYears),
        roles_positions: ['Senior Software Engineer', 'Full Stack Developer', 'Junior Developer'],
        skills: ['JavaScript', 'Node.js', 'React', 'Python', 'PostgreSQL', 'HTML', 'CSS', 'Microservices'],
        dominant_industries: extractDominantIndustries(employmentHistory),
        contact_info: {
          email: 'john.senior@email.com',
          phone: '+1-555-0123',
          location: 'San Francisco, CA'
        },
        education: [
          {
            institution: 'University of California',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            graduation_year: 2015
          }
        ]
      };
    } else if (filename.includes('junior') || filename.includes('entry')) {
      // Junior developer profile
      const employmentHistory = [
        {
          company: 'StartupABC',
          position: 'Junior Developer',
          start_date: '2022-06',
          end_date: '2024-01',
          duration_months: 19,
          description: 'Frontend development with React and TypeScript'
        }
      ];

      const totalYears = 1.5;

      mockData = {
        total_years_experience: totalYears,
        employment_history: employmentHistory,
        job_changes_frequency: calculateJobChangesFrequency(employmentHistory, totalYears),
        roles_positions: ['Junior Developer'],
        skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
        dominant_industries: extractDominantIndustries(employmentHistory),
        contact_info: {
          email: 'jane.junior@email.com',
          phone: '+1-555-0456',
          location: 'Austin, TX'
        },
        education: [
          {
            institution: 'State University',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            graduation_year: 2022
          }
        ]
      };
    } else {
      // Default/minimal profile
      mockData = {
        total_years_experience: null,
        employment_history: null,
        job_changes_frequency: null,
        roles_positions: null,
        skills: null,
        dominant_industries: null,
        contact_info: null,
        education: null
      };
    }

    return {
      success: true,
      data: mockData
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

export async function parseCVWithAI(filePath: string): Promise<ParsedCVData> {
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }

    // Normalize the file path
    const normalizedPath = path.resolve(filePath);

    // Call AI parsing service
    const result = await callAIParsingService(normalizedPath);

    if (!result.success) {
      throw new Error(`CV parsing failed: ${result.error}`);
    }

    if (!result.data) {
      throw new Error('AI parsing service returned no data');
    }

    // Return the parsed data
    return result.data;

  } catch (error) {
    console.error('CV parsing failed:', error);
    throw error;
  }
}