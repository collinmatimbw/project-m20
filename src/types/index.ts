export interface Project {
  id: string;
  title: string;
  branch: 'Electronics' | 'Software' | 'Mechanical' | 'Instrumentation' | 'Biomedical';
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  description: ProjectDescription;
  /** Resolved template key, e.g. "iot-sensor". Drives the fallback artwork. */
  archetypeKey: string;
  /** Local project image path, or null when the record has none. */
  image?: string | null;
}

export interface ProjectDescription {
  overview: string;
  problemStatement: string;
  learningObjectives: string[];
  prerequisites: string[];
  systemArchitecture: string;
  buildPhases: BuildPhase[];
  billOfMaterials: BOMItem[];
  validationChecklist: string[];
  troubleshootingGuide: TroubleshootingItem[];
  extensionIdeas: string[];
  deliverables: string[];
  safetyNotes: string[];
}

export interface BuildPhase {
  phase: number;
  title: string;
  description: string;
  duration: string;
  tasks: string[];
  deliverables: string[];
}

export interface BOMItem {
  component: string;
  specification: string;
  quantity: number;
  estimatedCost: string;
  notes?: string;
}

export interface TroubleshootingItem {
  issue: string;
  cause: string;
  solution: string;
}

export interface ProjectRequest {
  id: string;
  title: string;
  branch: string;
  category: string;
  description: string;
  experience: string;
  timeline: string;
  budget: string;
  email: string;
  name: string;
  status: 'pending' | 'under-review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface SharedProject {
  id: string;
  title: string;
  branch: string;
  category: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string[];
  duration: string;
  estimatedCost: string;
  resourceLinks: ResourceLink[];
  authorName: string;
  authorEmail: string;
  authorBio: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

/**
 * Free text. The five presets are only suggestions in the Share form's datalist,
 * so anything a contributor types (a platform, a language, "course notes") works.
 */
export type ResourceLinkType =
  | 'github'
  | 'documentation'
  | 'video'
  | 'article'
  | 'other'
  | (string & {});

export interface ResourceLink {
  label: string;
  url: string;
  type: ResourceLinkType;
}

export interface FieldNote {
  projectId: string;
  content: string;
  updatedAt: string;
}

export interface FlaggedProject {
  projectId: string;
  flaggedAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type UserRole = 'user' | 'admin';

export type TabName = 'INDEX' | 'REQUEST' | 'SHARE' | 'COMMUNITY' | 'LOGIN' | 'ADMIN';