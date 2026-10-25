import type { Experience, Profile, Project } from '@/domain/schemas';
import { publicProjects } from '@/application/content';
import { formatPeriod } from '@/i18n/ui';
import { tagLabel } from '@/domain/tags';

const SITE = 'https://resulcay.com';

export function llmsSummary(profile: Profile, projects: Project[]): string {
  const school = profile.education.find((e) => !e.completed);
  const lines = [
    `# ${profile.name}`,
    '',
    `> ${profile.title.en} in ${profile.location.en}. ${profile.availability.en}`,
    '',
    profile.summary.en,
    '',
    ...(school ? [`Education: ${school.note?.en ?? ''} (${school.school}, ${school.start}–${school.end}).`, ''] : []),
    '## Pages',
    '',
    `- [About](${SITE}/about): skills, education, certifications`,
    `- [Projects](${SITE}/projects): every public project`,
    `- [CV (PDF)](${SITE}${profile.cvPath})`,
    `- [Full text for language models](${SITE}/llms-full.txt)`,
    '',
    '## Projects',
    '',
    ...publicProjects(projects).map((p) => `- [${p.title}](${SITE}/projects/${p.slug}): ${p.hook.en}`),
    '',
    '## Contact',
    '',
    `- Email: ${profile.email}`,
    `- Phone: ${profile.phone}`,
    `- LinkedIn: ${profile.links.linkedin}`,
    `- GitHub: ${profile.links.github}`,
  ];
  return `${lines.join('\n')}\n`;
}

export function llmsFull(profile: Profile, projects: Project[], experience: Experience[]): string {
  const out = [llmsSummary(profile, projects), '## Experience', ''];
  for (const job of experience) {
    out.push(`### ${job.title.en}, ${job.organization} (${formatPeriod(job.start, job.end, 'en') ?? ''})`, '');
    for (const p of job.points) out.push(`- ${p.en}`);
    out.push('');
  }
  out.push('## Education', '');
  for (const e of profile.education) {
    out.push(`- ${e.program.en}, ${e.school}, ${e.start}–${e.end}${e.completed ? '' : '. Not completed.'}`);
  }
  out.push('', '## Skills', '');
  for (const s of profile.skills) out.push(`- ${s.group.en}: ${s.items.join(', ')}`);
  out.push('', '## Project details', '');
  for (const p of publicProjects(projects)) {
    const tags = [...p.appTypes, ...p.platforms, ...p.tech].map((tag) => tagLabel(tag, 'en'));
    out.push(`### ${p.title}`, '', p.story.en, '', `Tags: ${tags.join(', ') || 'none'}`, '');
  }
  return `${out.join('\n')}\n`;
}
