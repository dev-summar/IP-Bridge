const fs = require('fs');
const path = 'D:/MIET_Projects/IP-Bridge/backend/src/services/aiParser.ts';
const source = fs.readFileSync(path, 'utf8');
const start = source.indexOf('// Local Fallback Heuristics');
const end = source.indexOf('function buildAnalysisPrompt');
if (start < 0 || end < 0) {
  console.error('markers missing', start, end);
  process.exit(1);
}
const replacement = `// Local score when the model is unreachable. Uses the filing text, not a shared industry template.
function getLocalFallback(title: string, abstract: string): IPatentAIAnalysis {
  const assessment = assessCommercialPotential({ title, abstract });
  const domains = coarseDomains([], title, abstract);
  const themes = technicalThemes(title, abstract, 5);
  const clean = abstract.replace(/\\s*\\(\\d+[-a-zA-Z0-9]*\\)/g, ' ').replace(/\\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\\s+/).filter(Boolean);
  const description = (sentences.slice(0, 2).join(' ') || title).slice(0, 480);
  const problemSentence = sentences.find((sentence) => /problem|challenge|limitation|existing|traditional|conventional/i.test(sentence));
  return {
    summary: {
      description,
      problemSolved: problemSentence || \`The listing addresses a practical gap in \${domains[0].toLowerCase()}.\`,
      keyInnovation: themes.length ? \`The disclosure centers on \${themes.slice(0, 3).join(', ')}.\` : title,
      commercialValue: assessment.scoreRationale,
    },
    industryClassification: domains,
    keywords: themes.length ? themes : [domains[0].toLowerCase()],
    commercialApplications: {
      potentialIndustries: domains,
      useCases: sentences.slice(0, 2).length
        ? sentences.slice(0, 2).map((sentence) => sentence.slice(0, 180))
        : [\`Evaluation for \${domains[0].toLowerCase()} adoption\`],
      adoptionOpportunities: assessment.commercialPotentialScore >= 75
        ? ['Licensing', 'Strategic partnership']
        : ['Pilot licensing', 'Collaborative development'],
    },
    commercialPotentialScore: assessment.commercialPotentialScore,
    commercialBreakdown: assessment.commercialBreakdown,
    scoreRationale: assessment.scoreRationale,
    potentialBuyers: [\`\${domains[0]} operators\`, \`Specialist \${domains[0].toLowerCase()} companies\`],
    marketOpportunity: assessment.scoreRationale,
  };
}

`;
fs.writeFileSync(path, source.slice(0, start) + replacement + source.slice(end));
console.log('spliced', start, end);
