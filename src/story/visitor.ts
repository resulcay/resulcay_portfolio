import type { StoryObject } from './lines';

export const VISITORS = ['recruiter', 'client', 'explorer'] as const;
export type Visitor = (typeof VISITORS)[number];

const VISITOR_KEY = 'story-visitor';
const VISITED_KEY = 'story-visited';

// Storage can be missing or throw (private windows, blocked site data), so
// every read and write falls back quietly.

/** Even reading window.localStorage can throw when site data is blocked. */
export function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | undefined {
  try {
    return window[kind];
  } catch {
    return undefined;
  }
}

export function readVisitor(storage: Storage | undefined): Visitor | null {
  try {
    const value = storage?.getItem(VISITOR_KEY);
    return VISITORS.find((v) => v === value) ?? null;
  } catch {
    return null;
  }
}

export function saveVisitor(storage: Storage | undefined, visitor: Visitor | null): void {
  try {
    if (visitor) storage?.setItem(VISITOR_KEY, visitor);
    else storage?.removeItem(VISITOR_KEY);
  } catch {
    // Not remembered this time; the story still works.
  }
}

export function readVisited(storage: Storage | undefined): StoryObject[] {
  try {
    const value: unknown = JSON.parse(storage?.getItem(VISITED_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is StoryObject => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function saveVisited(storage: Storage | undefined, visited: StoryObject[]): void {
  try {
    storage?.setItem(VISITED_KEY, JSON.stringify(visited));
  } catch {
    // Forgotten after this page; fine.
  }
}

/** The order the butterfly suggests things in, per kind of visitor. */
const TOURS: Record<Visitor, StoryObject[]> = {
  recruiter: ['laptop', 'phone', 'polaroids', 'journal', 'corkboard', 'window', 'recordPlayer'],
  client: ['polaroids', 'phone', 'laptop', 'journal', 'corkboard', 'window', 'recordPlayer'],
  explorer: ['polaroids', 'laptop', 'journal', 'corkboard', 'phone', 'window', 'recordPlayer'],
};

/** The first object this visitor hasn't opened yet, or null when they've seen everything. */
export function nextTarget(visitor: Visitor, visited: readonly StoryObject[]): StoryObject | null {
  return TOURS[visitor].find((object) => !visited.includes(object)) ?? null;
}
