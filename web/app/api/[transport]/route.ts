import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { project, scan } from '@/db/schema';
import { getUserByApiKey } from '@/lib/api-key';
import { runAndPersistScan } from '@/lib/scan';
import { groupDrifts, paramNames } from '@cli/report/group.ts';
import type { ScanResult, Drift } from '@cli/types.ts';

// Compact a ScanResult into an agent-friendly payload: deduped, with the
// before/after fix context the agent needs to edit code.
function toAgentPayload(result: ScanResult) {
  const groups = groupDrifts(result.drifts);
  return {
    platform: result.platform,
    target: result.target,
    version: result.version,
    summary: {
      breaking: result.drifts.filter((d) => d.severity === 'BREAKING').length,
      warning: result.drifts.filter((d) => d.severity === 'WARNING').length,
      info: result.drifts.filter((d) => d.severity === 'INFO').length,
      scanned: result.scanned.length,
      specOperations: result.spec.length,
    },
    drifts: groups.map((g) => {
      const first: Drift | undefined = g.drifts[0];
      const params = paramNames(g.drifts);
      return {
        module: g.module,
        kind: g.kind,
        severity: g.severity,
        sends: `${g.call.method} ${g.call.pathTemplate}`,
        specHas: g.spec ? `${g.spec.method} ${g.spec.pathTemplate}` : null,
        params: params.length ? params : undefined,
        suggestion: first?.suggestion,
      };
    }),
    warnings: result.warnings,
  };
}

function ok(data: unknown, summary: string) {
  return {
    content: [{ type: 'text' as const, text: summary }],
    structuredContent: data as Record<string, unknown>,
  };
}

function fail(message: string) {
  return { isError: true as const, content: [{ type: 'text' as const, text: message }] };
}

const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'list_projects',
      {
        title: 'List drift projects',
        description:
          'List the integration projects this account monitors for API drift. Returns id, name, platform (make|n8n), and the target (Make app slug or n8n repo).',
        inputSchema: {},
      },
      async (_args, extra) => {
        const userId = (extra?.authInfo?.extra?.userId as string) ?? '';
        const rows = await db.select().from(project).where(eq(project.userId, userId));
        const projects = rows.map((p) => ({
          id: p.id,
          name: p.name,
          platform: p.platform,
          target: p.platform === 'make' ? `${p.makeApp} v${p.makeVersion}` : p.n8nRepo ?? p.n8nPath,
          openapi: p.openapiSource,
        }));
        return ok({ projects }, `${projects.length} project(s).`);
      },
    );

    server.registerTool(
      'scan_project',
      {
        title: 'Scan a project for drift',
        description:
          'Run a fresh drift scan for a project and return every drift with a suggested fix (before/after, confidence, autofixable). Use this to learn exactly what to change in the integration code, then edit the files and open a PR.',
        inputSchema: { project_id: z.string().describe('Project id from list_projects') },
      },
      async ({ project_id }, extra) => {
        const userId = (extra?.authInfo?.extra?.userId as string) ?? '';
        const rows = await db
          .select()
          .from(project)
          .where(and(eq(project.id, project_id), eq(project.userId, userId)))
          .limit(1);
        const p = rows[0];
        if (!p) return fail('Project not found.');
        const { result, error } = await runAndPersistScan(p);
        if (error || !result) return fail(`Scan failed: ${error ?? 'unknown error'}`);
        const payload = toAgentPayload(result);
        return ok(
          payload,
          `Scanned ${payload.target}: ${payload.summary.breaking} breaking, ${payload.summary.warning} warning.`,
        );
      },
    );

    server.registerTool(
      'get_latest_drift',
      {
        title: 'Get the latest drift result',
        description:
          'Return the most recent scan result for a project without re-running it. Same shape as scan_project.',
        inputSchema: { project_id: z.string().describe('Project id from list_projects') },
      },
      async ({ project_id }, extra) => {
        const userId = (extra?.authInfo?.extra?.userId as string) ?? '';
        const rows = await db
          .select({ ownerId: project.userId, scan })
          .from(scan)
          .innerJoin(project, eq(scan.projectId, project.id))
          .where(eq(scan.projectId, project_id))
          .orderBy(desc(scan.createdAt))
          .limit(1);
        const row = rows[0];
        if (!row || row.ownerId !== userId) return fail('No scan found for this project.');
        if (row.scan.status !== 'ok' || !row.scan.result) {
          return fail(`Last scan errored: ${row.scan.error ?? 'unknown'}`);
        }
        const payload = toAgentPayload(row.scan.result as ScanResult);
        return ok(
          payload,
          `Latest scan of ${payload.target}: ${payload.summary.breaking} breaking, ${payload.summary.warning} warning.`,
        );
      },
    );
  },
  {
    serverInfo: { name: 'driftci', version: '0.1.0' },
    instructions:
      'driftci detects drift between Make/n8n integrations and the live OpenAPI spec. Use list_projects to discover projects, scan_project (or get_latest_drift) to get drifts with before/after fix suggestions, then edit the integration code and open a PR. Never invent endpoints — only use what the drift data provides.',
  },
  { basePath: '/api', maxDuration: 120, verboseLogs: false },
);

const handler = withMcpAuth(
  baseHandler,
  async (_req, bearerToken) => {
    if (!bearerToken) return undefined;
    const u = await getUserByApiKey(bearerToken);
    if (!u) return undefined;
    return {
      token: bearerToken,
      clientId: 'driftci-cli',
      scopes: [],
      extra: { userId: u.id, email: u.email },
    };
  },
  { required: true },
);

export { handler as GET, handler as POST, handler as DELETE };
