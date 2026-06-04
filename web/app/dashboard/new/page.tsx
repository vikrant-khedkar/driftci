import { createProject } from '../actions';
import { ProjectForm } from '../../components/ProjectForm';

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <a href="/dashboard" className="text-sm" style={{ color: 'var(--ink-mute)' }}>
        ← Projects
      </a>
      <h1 className="mt-3 mb-6 text-xl font-semibold tracking-tight">New project</h1>
      <ProjectForm mode="new" submitLabel="Create project" action={createProject} />
    </main>
  );
}
