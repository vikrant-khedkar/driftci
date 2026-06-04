import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getProjectFormValues, updateProject } from '../../../actions';
import { ProjectForm } from '../../../../components/ProjectForm';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const initial = await getProjectFormValues(id);
  if (!initial) notFound();

  const action = updateProject.bind(null, id);

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <a href={`/dashboard/projects/${id}`} className="text-sm" style={{ color: 'var(--ink-mute)' }}>
        ← Back to project
      </a>
      <h1 className="mt-3 mb-6 text-xl font-semibold tracking-tight">Edit project</h1>
      <ProjectForm mode="edit" initial={initial} submitLabel="Save changes" action={action} />
    </main>
  );
}
