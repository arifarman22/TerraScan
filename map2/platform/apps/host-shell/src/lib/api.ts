/**
 * Server-side API client for the Core Management Service.
 * Calls go directly to the backend with the user's access token; client-side
 * code uses the `/api/proxy/*` route handler (which forwards from the
 * HttpOnly cookie).
 */
import type {
  ApiError,
  Job,
  Mission,
  MissionImage,
  Organisation,
  ProcessingOutput,
  Project,
  User,
  Workspace,
} from '@platform/shared-types';

const BASE_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiException extends Error {
  constructor(public readonly status: number, public readonly body: ApiError) {
    super(body.message);
  }
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({
      code: 'ERROR',
      message: response.statusText,
      correlationId: '',
    }))) as ApiError;
    throw new ApiException(response.status, body);
  }
  return (await response.json()) as T;
}

// --- Identity & organisation ------------------------------------------------

export function fetchMe(token: string): Promise<User> {
  return apiFetch<User>('/auth/me', { token });
}

export function fetchOrganisation(token: string): Promise<Organisation> {
  return apiFetch<Organisation>('/organisations/current', { token });
}

// --- Workspaces -------------------------------------------------------------

export function fetchWorkspaces(token: string): Promise<Workspace[]> {
  return apiFetch<Workspace[]>('/workspaces', { token });
}

// --- Projects ---------------------------------------------------------------

export function fetchProjects(
  token: string,
  query: Record<string, string> = {},
): Promise<Project[]> {
  const search = new URLSearchParams(query).toString();
  return apiFetch<Project[]>(`/projects${search ? '?' + search : ''}`, {
    token,
  });
}

export function fetchProject(token: string, projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`, { token });
}

// --- Missions ---------------------------------------------------------------

export function fetchMissions(
  token: string,
  projectId: string,
): Promise<Mission[]> {
  return apiFetch<Mission[]>(`/missions?projectId=${projectId}`, { token });
}

export function fetchMission(token: string, missionId: string): Promise<Mission> {
  return apiFetch<Mission>(`/missions/${missionId}`, { token });
}

// --- Image library ----------------------------------------------------------

export interface ImageLibrary {
  images: MissionImage[];
  summary: {
    count: number;
    totalBytes: number;
    missingGpsCount: number;
  };
}

export function fetchMissionImages(
  token: string,
  missionId: string,
): Promise<ImageLibrary> {
  return apiFetch<ImageLibrary>(`/uploads/missions/${missionId}/images`, {
    token,
  });
}

// --- Storage metering -------------------------------------------------------

export interface StorageSummary {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
  projectCount: number;
}

export function fetchStorageSummary(token: string): Promise<StorageSummary> {
  return apiFetch<StorageSummary>('/metering/storage', { token });
}

// --- Jobs -------------------------------------------------------------------

export function fetchJobs(
  token: string,
  query: Record<string, string> = {},
): Promise<Job[]> {
  const search = new URLSearchParams(query).toString();
  return apiFetch<Job[]>(`/jobs${search ? '?' + search : ''}`, { token });
}

export function fetchJob(token: string, jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}`, { token });
}

export function cancelJob(token: string, jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}/cancel`, { method: 'POST', token });
}

export function deleteJob(token: string, jobId: string): Promise<void> {
  return apiFetch<void>(`/jobs/${jobId}`, { method: 'DELETE', token });
}

// --- Processing outputs -----------------------------------------------------

export function fetchProjectOutputs(
  token: string,
  projectId: string,
): Promise<ProcessingOutput[]> {
  return apiFetch<ProcessingOutput[]>(`/projects/${projectId}/outputs`, {
    token,
  });
}

export function fetchMissionOutputs(
  token: string,
  missionId: string,
): Promise<ProcessingOutput[]> {
  return apiFetch<ProcessingOutput[]>(`/missions/${missionId}/outputs`, {
    token,
  });
}

export function fetchJobOutputs(
  token: string,
  jobId: string,
): Promise<ProcessingOutput[]> {
  return apiFetch<ProcessingOutput[]>(`/jobs/${jobId}/outputs`, { token });
}

// --- API keys ---------------------------------------------------------------

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export function fetchApiKeys(token: string): Promise<ApiKeySummary[]> {
  return apiFetch<ApiKeySummary[]>('/api-keys', { token });
}

// --- Audit log --------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  organisationId: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export function fetchAuditLog(
  token: string,
  query: Record<string, string> = {},
): Promise<AuditLogEntry[]> {
  const search = new URLSearchParams(query).toString();
  return apiFetch<AuditLogEntry[]>(
    `/audit-logs${search ? '?' + search : ''}`,
    { token },
  );
}
