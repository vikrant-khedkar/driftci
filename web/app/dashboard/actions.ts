'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { project, scan } from '@/db/schema';
import { requireUser } from '@/lib/session';
import { encryptSecret } from '@/lib/crypto';

import { user } from '@/db/schema';
import type { ScanResult } from '@cli/types.ts';
import { runAndPersistScan } from '@/lib/scan';
import { newApiKey } from '@/lib/api-key';
import { generateMigrationGuidance, llmAvailable } from '@/lib/llm';

export async function getApiKey(): Promise<string | null> {
  const u = await requireUser();
  const rows = await db.select({ apiKey: user.apiKey }).from(user).where(eq(user.id, u.id)).limit(1);
  return rows[0]?.apiKey ?? null;
}

export async function regenerateApiKey(): Promise<{ apiKey: string }> {
  const u = await requireUser();
  const apiKey = newApiKey();
  await db.update(user).set({ apiKey }).where(eq(user.id, u.id));
  revalidatePath('/dashboard/settings');
  return { apiKey };
}

export interface CreateProjectInput {
  name: string;
  platform: 'make' | 'n8n';
  openapiSource: string;
  makeApp?: string;
  makeVersion?: string;
  makeRegion?: string;
  makeToken?: string;
  n8nMode?: 'local' | 'repo';
  n8nPath?: string;
  n8nRepo?: string;
  n8nSubdir?: string;
}

export async function createProject(input: CreateProjectInput) {
  const u = await requireUser();
  const id = randomUUID();
  await db.insert(project).values({
    id,
    userId: u.id,
    name: input.name,
    platform: input.platform,
    openapiSource: input.openapiSource,
    makeApp: input.makeApp ?? null,
    makeVersion: input.makeVersion ?? null,
    makeRegion: input.makeRegion ?? null,
    makeTokenEnc: input.makeToken ? encryptSecret(input.makeToken) : null,
    n8nMode: input.n8nMode ?? null,
    n8nPath: input.n8nPath ?? null,
    n8nRepo: input.n8nRepo ?? null,
    n8nSubdir: input.n8nSubdir ?? null,
  });
  revalidatePath('/dashboard');
  return { id };
}

export async function deleteProject(projectId: string) {
  const u = await requireUser();
  await db.delete(project).where(and(eq(project.id, projectId), eq(project.userId, u.id)));
  revalidatePath('/dashboard');
}

export async function updateProject(projectId: string, input: CreateProjectInput) {
  const u = await requireUser();
  const rows = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, u.id)))
    .limit(1);
  if (!rows[0]) throw new Error('Project not found');

  // Leaving the token blank on edit keeps the existing one.
  const tokenUpdate = input.makeToken ? { makeTokenEnc: encryptSecret(input.makeToken) } : {};

  await db
    .update(project)
    .set({
      name: input.name,
      platform: input.platform,
      openapiSource: input.openapiSource,
      makeApp: input.makeApp ?? null,
      makeVersion: input.makeVersion ?? null,
      makeRegion: input.makeRegion ?? null,
      n8nMode: input.n8nMode ?? null,
      n8nPath: input.n8nPath ?? null,
      n8nRepo: input.n8nRepo ?? null,
      n8nSubdir: input.n8nSubdir ?? null,
      updatedAt: new Date(),
      ...tokenUpdate,
    })
    .where(and(eq(project.id, projectId), eq(project.userId, u.id)));

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath('/dashboard');
  return { id: projectId };
}

export async function explainScan(
  scanId: string,
): Promise<{ ok: boolean; guidance?: string; error?: string }> {
  const u = await requireUser();
  // join scan→project to enforce ownership
  const rows = await db
    .select({ scan, ownerId: project.userId })
    .from(scan)
    .innerJoin(project, eq(scan.projectId, project.id))
    .where(eq(scan.id, scanId))
    .limit(1);
  const row = rows[0];
  if (!row || row.ownerId !== u.id) return { ok: false, error: 'Scan not found' };
  if (row.scan.guidance) return { ok: true, guidance: row.scan.guidance };
  if (row.scan.status !== 'ok' || !row.scan.result) {
    return { ok: false, error: 'No successful scan result to explain' };
  }
  if (!llmAvailable()) {
    return { ok: false, error: 'AI guidance is not configured (ANTHROPIC_API_KEY missing).' };
  }

  try {
    const guidance = await generateMigrationGuidance(row.scan.result as ScanResult);
    await db.update(scan).set({ guidance }).where(eq(scan.id, scanId));
    return { ok: true, guidance };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getProject(projectId: string) {
  const u = await requireUser();
  const rows = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, u.id)))
    .limit(1);
  return rows[0] ?? null;
}

export interface ProjectFormValues {
  name: string;
  platform: 'make' | 'n8n';
  openapiSource: string;
  makeApp: string;
  makeVersion: string;
  makeRegion: string;
  hasToken: boolean;
  n8nMode: 'local' | 'repo';
  n8nRepo: string;
  n8nSubdir: string;
  n8nPath: string;
}

export async function getProjectFormValues(projectId: string): Promise<ProjectFormValues | null> {
  const p = await getProject(projectId);
  if (!p) return null;
  return {
    name: p.name,
    platform: p.platform,
    openapiSource: p.openapiSource,
    makeApp: p.makeApp ?? '',
    makeVersion: p.makeVersion ?? '1',
    makeRegion: p.makeRegion ?? 'eu1',
    hasToken: !!p.makeTokenEnc,
    n8nMode: (p.n8nMode as 'local' | 'repo') ?? 'repo',
    n8nRepo: p.n8nRepo ?? '',
    n8nSubdir: p.n8nSubdir ?? '',
    n8nPath: p.n8nPath ?? '',
  };
}

export async function runProjectScan(projectId: string): Promise<{ scanId: string }> {
  const u = await requireUser();
  const rows = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, u.id)))
    .limit(1);
  const p = rows[0];
  if (!p) throw new Error('Project not found');

  const { scanId } = await runAndPersistScan(p);

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath('/dashboard');
  return { scanId };
}

export async function listProjects() {
  const u = await requireUser();
  return db
    .select()
    .from(project)
    .where(eq(project.userId, u.id))
    .orderBy(desc(project.createdAt));
}

export async function getProjectWithScans(projectId: string) {
  const u = await requireUser();
  const rows = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, u.id)))
    .limit(1);
  const p = rows[0];
  if (!p) return null;
  const scans = await db
    .select()
    .from(scan)
    .where(eq(scan.projectId, projectId))
    .orderBy(desc(scan.createdAt))
    .limit(50);
  return { project: p, scans };
}
