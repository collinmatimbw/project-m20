import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  FieldNote,
  FlaggedProject,
  Project,
  ProjectRequest,
  SharedProject,
} from '../types';
import { CUSTOM_ID_BASE, type CatalogueEntry } from '../data/catalogue';
import {
  flushQueue,
  getSyncState,
  pushRequestStatus,
  pushShareStatus,
  pushSubmission,
  requestToSubmission,
  shareToSubmission,
  subscribeToSync,
} from '../services/sheetSync';
import type { SyncState } from '../services/sheetSync';

export interface NewProjectInput {
  title: string;
  branch: Project['branch'];
  category: string;
  level: Project['level'];
  summary: string;
  date: string;
}

interface DataContextType {
  notes: Record<string, FieldNote>;
  flags: Record<string, FlaggedProject>;
  requests: ProjectRequest[];
  sharedProjects: SharedProject[];
  customProjects: CatalogueEntry[];
  sync: SyncState;
  saveNote: (projectId: string, content: string) => void;
  deleteNote: (projectId: string) => void;
  toggleFlag: (projectId: string) => void;
  addRequest: (
    request: Omit<ProjectRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => ProjectRequest;
  updateRequestStatus: (id: string, status: ProjectRequest['status']) => void;
  addSharedProject: (
    project: Omit<SharedProject, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => SharedProject;
  updateSharedProjectStatus: (id: string, status: SharedProject['status']) => void;
  /** Post a project from the admin console so it appears in the index. */
  addCustomProject: (input: NewProjectInput) => CatalogueEntry;
  removeCustomProject: (sourceId: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  notes: 'm20_field_notes',
  flags: 'm20_flagged_projects',
  requests: 'm20_project_requests',
  sharedProjects: 'm20_shared_projects',
  customProjects: 'm20_custom_projects',
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Record<string, FieldNote>>({});
  const [flags, setFlags] = useState<Record<string, FlaggedProject>>({});
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [customProjects, setCustomProjects] = useState<CatalogueEntry[]>([]);
  const [sync, setSync] = useState<SyncState>(getSyncState);

  useEffect(() => {
    try {
      const storedNotes = localStorage.getItem(STORAGE_KEYS.notes);
      const storedFlags = localStorage.getItem(STORAGE_KEYS.flags);
      const storedRequests = localStorage.getItem(STORAGE_KEYS.requests);
      const storedShared = localStorage.getItem(STORAGE_KEYS.sharedProjects);
      const storedCustom = localStorage.getItem(STORAGE_KEYS.customProjects);

      if (storedNotes) setNotes(JSON.parse(storedNotes));
      if (storedFlags) setFlags(JSON.parse(storedFlags));
      if (storedRequests) setRequests(JSON.parse(storedRequests));
      if (storedShared) setSharedProjects(JSON.parse(storedShared));
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom);
        if (Array.isArray(parsed)) setCustomProjects(parsed);
      }
    } catch (e) {
      console.error('Failed to load data from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.flags, JSON.stringify(flags));
  }, [flags]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sharedProjects, JSON.stringify(sharedProjects));
  }, [sharedProjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.customProjects, JSON.stringify(customProjects));
  }, [customProjects]);

  /* sheet sync state + retry loop */
  useEffect(() => subscribeToSync(() => setSync(getSyncState())), []);

  useEffect(() => {
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener('online', onOnline);
    const timer = window.setInterval(() => void flushQueue(), 90_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  }, []);

  const saveNote = (projectId: string, content: string) => {
    setNotes(prev => ({
      ...prev,
      [projectId]: {
        projectId,
        content,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const deleteNote = (projectId: string) => {
    setNotes(prev => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
  };

  const toggleFlag = (projectId: string) => {
    setFlags(prev => {
      const next = { ...prev };
      if (next[projectId]) {
        delete next[projectId];
      } else {
        next[projectId] = { projectId, flaggedAt: new Date().toISOString() };
      }
      return next;
    });
  };

  const addRequest = (request: Omit<ProjectRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newRequest: ProjectRequest = {
      ...request,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRequests(prev => [newRequest, ...prev]);
    void pushSubmission(requestToSubmission(newRequest, 'new submission'));
    return newRequest;
  };

  const updateRequestStatus = (id: string, status: ProjectRequest['status']) => {
    const current = requests.find(r => r.id === id);
    if (!current || current.status === status) return;
    const updated: ProjectRequest = { ...current, status, updatedAt: new Date().toISOString() };
    setRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    void pushRequestStatus(updated);
  };

  const addSharedProject = (project: Omit<SharedProject, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newProject: SharedProject = {
      ...project,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSharedProjects(prev => [newProject, ...prev]);
    void pushSubmission(shareToSubmission(newProject, 'new submission'));
    return newProject;
  };

  const updateSharedProjectStatus = (id: string, status: SharedProject['status']) => {
    const current = sharedProjects.find(p => p.id === id);
    if (!current || current.status === status) return;
    const updated: SharedProject = { ...current, status, updatedAt: new Date().toISOString() };
    setSharedProjects(prev => prev.map(p => (p.id === id ? updated : p)));
    void pushShareStatus(updated);
  };

  const addCustomProject = (input: NewProjectInput): CatalogueEntry => {
    const sourceId =
      customProjects.reduce((max, p) => Math.max(max, p.sourceId), CUSTOM_ID_BASE) + 1;
    const entry: CatalogueEntry = {
      sourceId,
      title: input.title.trim(),
      url: '',
      date: input.date,
      categories: [input.category],
      image: null,
      custom: true,
      branch: input.branch,
      level: input.level,
      summary: input.summary.trim(),
    };
    setCustomProjects(prev => [entry, ...prev]);
    return entry;
  };

  const removeCustomProject = (sourceId: number) => {
    setCustomProjects(prev => prev.filter(p => p.sourceId !== sourceId));
  };

  return (
    <DataContext.Provider value={{
      notes, flags, requests, sharedProjects, customProjects,
      sync,
      saveNote, deleteNote, toggleFlag,
      addRequest, updateRequestStatus,
      addSharedProject, updateSharedProjectStatus,
      addCustomProject, removeCustomProject,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}