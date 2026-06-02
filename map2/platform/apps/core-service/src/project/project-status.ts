/**
 * Project and mission status state machines (SRS FR-PROJ-002 / §3.3).
 * Most transitions are driven by later phases (upload, processing); this
 * module is the single source of truth for which transitions are legal.
 */
import { BadRequestException } from '@nestjs/common';
import { MissionStatus, ProjectStatus } from '@platform/shared-types';

const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [ProjectStatus.UPLOADING, ProjectStatus.ARCHIVED],
  [ProjectStatus.UPLOADING]: [
    ProjectStatus.PROCESSING,
    ProjectStatus.DRAFT,
    ProjectStatus.FAILED,
    ProjectStatus.ARCHIVED,
  ],
  [ProjectStatus.PROCESSING]: [
    ProjectStatus.COMPLETED,
    ProjectStatus.FAILED,
    ProjectStatus.ARCHIVED,
  ],
  [ProjectStatus.COMPLETED]: [ProjectStatus.PROCESSING, ProjectStatus.ARCHIVED],
  [ProjectStatus.FAILED]: [
    ProjectStatus.UPLOADING,
    ProjectStatus.PROCESSING,
    ProjectStatus.ARCHIVED,
  ],
  [ProjectStatus.ARCHIVED]: [],
};

const MISSION_TRANSITIONS: Record<MissionStatus, readonly MissionStatus[]> = {
  [MissionStatus.CREATED]: [
    MissionStatus.UPLOADING,
    MissionStatus.READY,
    MissionStatus.FAILED,
  ],
  [MissionStatus.UPLOADING]: [
    MissionStatus.READY,
    MissionStatus.CREATED,
    MissionStatus.FAILED,
  ],
  [MissionStatus.READY]: [
    MissionStatus.PROCESSING,
    MissionStatus.UPLOADING,
    MissionStatus.FAILED,
  ],
  [MissionStatus.PROCESSING]: [MissionStatus.COMPLETED, MissionStatus.FAILED],
  [MissionStatus.COMPLETED]: [MissionStatus.PROCESSING],
  // A FAILED mission can recover: the user may upload more imagery
  // (UPLOADING/READY) or relaunch processing once the upload is whole.
  [MissionStatus.FAILED]: [
    MissionStatus.UPLOADING,
    MissionStatus.READY,
    MissionStatus.PROCESSING,
  ],
};

export function assertProjectTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): void {
  if (from !== to && !PROJECT_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Illegal project status transition: ${from} → ${to}`,
    );
  }
}

export function assertMissionTransition(
  from: MissionStatus,
  to: MissionStatus,
): void {
  if (from !== to && !MISSION_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Illegal mission status transition: ${from} → ${to}`,
    );
  }
}
