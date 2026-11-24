import { dbStore } from './dbStore';
import type { MatchFeedbackEvent } from './semanticMatch';

export async function recordMatchEvent(input: {
  userId: string;
  patentId: string;
  event: MatchFeedbackEvent;
  query?: string;
}): Promise<void> {
  if (!input.userId || !input.patentId) return;
  await dbStore.matchEvents.create({
    userId: String(input.userId),
    patentId: String(input.patentId),
    event: input.event,
    query: input.query ? String(input.query).slice(0, 500) : undefined,
  });
}

export async function loadBuyerFeedback(userId: string): Promise<{
  ignoredPatentIds: string[];
  openedWithoutEngageIds: string[];
  positivePatentIds: string[];
}> {
  if (!userId) {
    return { ignoredPatentIds: [], openedWithoutEngageIds: [], positivePatentIds: [] };
  }

  const events = await dbStore.matchEvents.find({ userId: String(userId) }, { limit: 400 });
  const ignored = new Set<string>();
  const opens = new Map<string, number>();
  const engaged = new Set<string>();

  for (const row of events) {
    const patentId = String(row.patentId);
    if (row.event === 'ignore') ignored.add(patentId);
    if (row.event === 'save' || row.event === 'enquire') engaged.add(patentId);
    if (row.event === 'open') opens.set(patentId, (opens.get(patentId) || 0) + 1);
  }

  const openedWithoutEngageIds = [...opens.entries()]
    .filter(([patentId, count]) => count >= 2 && !engaged.has(patentId) && !ignored.has(patentId))
    .map(([patentId]) => patentId);

  return {
    ignoredPatentIds: [...ignored],
    openedWithoutEngageIds,
    positivePatentIds: [...engaged],
  };
}
