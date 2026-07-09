/** Generic templates from getLocalFallback() — shared by multiple patents, not patent-specific */
export const GENERIC_FALLBACK_DESCRIPTIONS = new Set([
  'This technology provides an optimized method and architecture to resolve bottlenecks in data processing and physical workflows.',
  'An intelligent neural-network framework that dynamically adapts its weights using online learning, avoiding expensive retraining cycles.',
  'A targeted molecular delivery vector that reacts precisely to local bio-markers, unlocking site-specific compound release.',
  'An advanced solid-state energy storage grid that manages thermal dissipation through nanostructured composite materials.',
  'A compliant soft-robotics gripper that dynamically measures tactile pressure, allowing it to hold delicate items of any geometry.',
  'A decentralized cryptographic settlement system that confirms transaction validity in under 2 seconds with zero-knowledge verification.',
]);

export function buildDuplicateDescriptionSet(analyses: any[]): Set<string> {
  const counts = new Map<string, number>();
  for (const analysis of analyses) {
    const desc = (analysis?.summary?.description || '').trim();
    if (!desc) continue;
    counts.set(desc, (counts.get(desc) || 0) + 1);
  }
  const duplicates = new Set<string>();
  for (const [desc, count] of counts.entries()) {
    if (count > 1) duplicates.add(desc);
  }
  return duplicates;
}

/** True when analysis looks unique and LLM-evaluated (not generic/duplicate fallback). */
export function isQualityPatentAnalysis(
  analysis: any | null | undefined,
  duplicateDescriptions: Set<string>
): boolean {
  if (!analysis) return false;

  const desc = (analysis.summary?.description || '').trim();
  if (!desc) return false;
  if (GENERIC_FALLBACK_DESCRIPTIONS.has(desc)) return false;
  if (duplicateDescriptions.has(desc)) return false;

  return true;
}

export function comparePatentsByQualityThenScore(
  a: any,
  b: any,
  analysisMap: Map<string, any>,
  duplicateDescriptions: Set<string>
): number {
  const analysisA = analysisMap.get(String(a._id));
  const analysisB = analysisMap.get(String(b._id));
  const qualityA = isQualityPatentAnalysis(analysisA, duplicateDescriptions);
  const qualityB = isQualityPatentAnalysis(analysisB, duplicateDescriptions);

  if (qualityA !== qualityB) {
    return qualityA ? -1 : 1;
  }

  const scoreA = analysisA?.commercialPotentialScore ?? 0;
  const scoreB = analysisB?.commercialPotentialScore ?? 0;
  if (scoreB !== scoreA) return scoreB - scoreA;

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
