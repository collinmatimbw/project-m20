/**
 * Shared taxonomy.
 *
 * Branches, levels and category suggestions used by the request and share
 * forms. Categories combine the source site's category names with the
 * archetype category labels used by the specification generator, so a
 * submission can be filed against either.
 */

export const BRANCHES = [
  'Electronics',
  'Software',
  'Mechanical',
  'Instrumentation',
  'Biomedical',
] as const;

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const CATEGORIES: string[] = [
  'AI & Data',
  'Android & Mobile',
  'Artificial Intelligence & ML',
  'Biomedical Sensing',
  'Blockchain & Distributed Systems',
  'Cloud Computing',
  'Computer Vision',
  'Digital Electronics & HDL',
  'Electronics Projects',
  'Engineering/Diploma/Bsc-IT/Msc-IT Projects',
  'Games',
  'Hardware Projects',
  'IT Projects',
  'IoT & Sensor Networks',
  'iOS Projects',
  'J2me Projects',
  'Maths / Calculations',
  'Mechanical Design',
  'Mechanical Design & CAD',
  'Mechanical Projects',
  'Mini Projects',
  'Mobile & App Development',
  'NS2/NS3 Projects',
  'PLC & Automation',
  'Power & Energy',
  'Python & Data Systems',
  'Robotics & Mechatronics',
  'Software installation',
  'Web & Information Systems',
  'General Engineering',
].sort();
