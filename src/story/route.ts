import { OBJECTS, type StoryObject } from './lines';

// Story mode keeps what's open in the URL hash: #laptop, #project/macyap.
// Each open pushes a history entry, so the browser's Back closes panels.

export interface Route {
  object: StoryObject;
  project?: string;
  /** The photo wall showing only paid and freelance work. */
  paid?: true;
}

export function parseHash(hash: string): Route | null {
  const value = hash.replace(/^#/, '');
  if (value === 'paid-work') return { object: 'polaroids', paid: true };
  const project = /^project\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (project) return { object: 'polaroids', project: project[1]! };
  return OBJECTS.find((object) => object === value) ? { object: value as StoryObject } : null;
}

export function toHash(route: Route): string {
  if (route.project) return `#project/${route.project}`;
  return route.paid ? '#paid-work' : `#${route.object}`;
}

/** Where a click on a hotspot leads: a Polaroid opens its own project. */
export function routeForHotspot(id: string): Route | null {
  return id.startsWith('polaroid:') ? parseHash(`#project/${id.slice('polaroid:'.length)}`) : parseHash(`#${id}`);
}
