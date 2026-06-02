import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the RBAC reference data (SRS §6 / Appendix C):
 *  - the permission catalogue (30 permission-gated actions);
 *  - the ten built-in system roles, each with its normative permission set.
 *
 * System roles have `organisation_id = NULL` and are shared by every tenant.
 */
export class SeedRbacData1747900100000 implements MigrationInterface {
  name = 'SeedRbacData1747900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description, category) VALUES
        ('manage:organisation','Manage organisation settings','organisation'),
        ('delete:organisation','Delete or transfer the organisation','organisation'),
        ('view:organisation','View organisation details','organisation'),
        ('manage:billing','Manage subscription and billing','billing'),
        ('view:billing','View billing and usage','billing'),
        ('configure:sso','Configure SSO and SCIM provisioning','identity'),
        ('invite:member','Invite organisation members','members'),
        ('remove:member','Remove organisation members','members'),
        ('assign:role','Assign roles to users','members'),
        ('manage:role','Create and manage custom roles','members'),
        ('create:workspace','Create workspaces','workspace'),
        ('manage:workspace','Manage workspaces','workspace'),
        ('create:project','Create projects','project'),
        ('manage:project','Manage projects','project'),
        ('view:project','View projects','project'),
        ('delete:project','Delete projects','project'),
        ('manage:mission','Manage missions','project'),
        ('upload:imagery','Upload imagery','imagery'),
        ('delete:imagery','Delete raw imagery','imagery'),
        ('launch:job','Launch processing jobs','job'),
        ('view:job','View processing jobs','job'),
        ('cancel:job','Cancel processing jobs','job'),
        ('run:analytics','Run analytics and spectral indices','analytics'),
        ('run:ml','Run machine-learning analysis','analytics'),
        ('view:map','View the geospatial map and outputs','viewer'),
        ('manage:annotation','Create and manage annotations','viewer'),
        ('create:export','Create exports and downloads','export'),
        ('generate:report','Generate PDF reports','export'),
        ('read:audit','Read the audit log','audit'),
        ('manage:apikey','Manage API keys','api')
      ON CONFLICT (code) DO NOTHING
    `);

    const allPermissions = `ARRAY(SELECT code FROM permissions)`;

    const orgAdmin = `ARRAY[
      'manage:organisation','view:organisation','configure:sso',
      'invite:member','remove:member','assign:role','manage:role',
      'create:workspace','manage:workspace','create:project','manage:project',
      'view:project','delete:project','manage:mission','upload:imagery',
      'delete:imagery','launch:job','view:job','cancel:job','run:analytics',
      'run:ml','view:map','manage:annotation','create:export','generate:report',
      'read:audit','manage:apikey']::text[]`;

    const workspaceManager = `ARRAY[
      'manage:workspace','create:project','manage:project','view:project',
      'delete:project','manage:mission','upload:imagery','delete:imagery',
      'launch:job','view:job','cancel:job','run:analytics','run:ml','view:map',
      'manage:annotation','create:export','generate:report','invite:member',
      'read:audit']::text[]`;

    const operator = `ARRAY[
      'create:project','view:project','manage:mission','upload:imagery',
      'delete:imagery','launch:job','view:job','cancel:job','run:analytics',
      'run:ml','view:map','manage:annotation','create:export',
      'generate:report']::text[]`;

    const analyst = `ARRAY[
      'view:project','launch:job','view:job','run:analytics','run:ml',
      'view:map','manage:annotation','create:export','generate:report']::text[]`;

    const viewer = `ARRAY['view:project','view:job','view:map','generate:report']::text[]`;
    const reviewer = `ARRAY['view:project','view:map']::text[]`;
    const support = `ARRAY[
      'view:organisation','view:project','view:job','view:map','read:audit']::text[]`;
    const billing = `ARRAY['manage:billing','view:billing','view:organisation']::text[]`;

    await queryRunner.query(`
      INSERT INTO roles (organisation_id, name, system_role, scope, description, permissions, is_system) VALUES
        (NULL,'Platform Super Admin','PLATFORM_SUPER_ADMIN','PLATFORM','Operates the SaaS platform and manages tenants',${allPermissions},true),
        (NULL,'Platform Support','PLATFORM_SUPPORT','PLATFORM','Vendor support — read-only diagnostics',${support},true),
        (NULL,'Organisation Owner','ORG_OWNER','ORGANISATION','Full control of the organisation including billing',${allPermissions},true),
        (NULL,'Organisation Admin','ORG_ADMIN','ORGANISATION','Manages members, roles, workspaces and projects',${orgAdmin},true),
        (NULL,'Billing Administrator','BILLING_ADMIN','ORGANISATION','Manages subscription and billing only',${billing},true),
        (NULL,'Workspace Manager','WORKSPACE_MANAGER','WORKSPACE','Creates and configures projects within a workspace',${workspaceManager},true),
        (NULL,'Operator','OPERATOR','WORKSPACE','Uploads imagery and runs processing jobs',${operator},true),
        (NULL,'Analyst','ANALYST','WORKSPACE','Runs analytics, ML and exports deliverables',${analyst},true),
        (NULL,'Viewer','VIEWER','WORKSPACE','Read-only access to the map and outputs',${viewer},true),
        (NULL,'External Reviewer','EXTERNAL_REVIEWER','PROJECT','Time-limited read-only access to shared projects',${reviewer},true)
      ON CONFLICT (system_role) WHERE system_role IS NOT NULL DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM roles WHERE is_system = true`);
    await queryRunner.query(`DELETE FROM permissions`);
  }
}
