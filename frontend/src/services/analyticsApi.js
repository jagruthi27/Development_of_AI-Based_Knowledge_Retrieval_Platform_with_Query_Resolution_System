/*
 * QueryNest Analytics Service (Milestone 4)
 * ----------------------------------------
 * Frontend data layer for:
 *   1. Analytics Dashboard  ("How is the entire RAG system performing?")
 *   2. Knowledge Gap Visualization ("Where does the RAG system need more knowledge?")
 *
 * Backend contract (when available):
 *   GET /analytics?range=today|7d|30d|custom      -> AnalyticsPayload
 *   GET /knowledge-gaps?range=today|7d|30d|custom -> KnowledgeGapPayload
 *
 * If those endpoints are missing / unreachable, this service falls back to a
 * deterministic local mock derived from the same RAG concepts (confidence,
 * citations, retrieval results). The pages therefore work standalone and will
 * automatically prefer real backend data once the backend team ships the APIs.
 *
 * Data-flow reminder:
 *   Chat (M1) -> RAG pipeline (M2) -> Citations/Grounding (M3, per-query)
 *   -> Query Logging -> Analytics Processing / Gap Detection -> these pages (M4, all-queries)
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/$/, '');

const getToken = () =>
  localStorage.getItem('qn_auth_token') ||
  sessionStorage.getItem('qn_auth_token');

const authHeaders = () => {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function tryFetch(path, range) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `${API_BASE_URL}${path}?range=${encodeURIComponent(range)}`,
      { headers: authHeaders(), signal: controller.signal },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Deterministic mock builders                                         */
/* ------------------------------------------------------------------ */

export const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom' },
];

const RANGE_SCALE = { today: 0.09, '7d': 1, '30d': 4.3, custom: 1.8 };
const RANGE_LABEL = {
  today: 'Today',
  '7d': 'Apr 24 – Apr 30',
  '30d': 'Apr 1 – Apr 30',
  custom: 'Apr 24 – Apr 30, 2024',
};

const scale = (n, range) => Math.max(1, Math.round(n * (RANGE_SCALE[range] ?? 1)));

function buildAnalyticsMock(range) {
  const totalQueries = scale(1248, range);
  const conversations = scale(320, range);
  const knowledgeGaps = scale(42, range);
  const avgConfidence = 82;

  const volume = [
    { day: 'Mon', queries: scale(120, range), grounded: scale(104, range) },
    { day: 'Tue', queries: scale(152, range), grounded: scale(133, range) },
    { day: 'Wed', queries: scale(186, range), grounded: scale(165, range) },
    { day: 'Thu', queries: scale(228, range), grounded: scale(203, range) },
    { day: 'Fri', queries: scale(290, range), grounded: scale(258, range) },
    { day: 'Sat', queries: scale(214, range), grounded: scale(189, range) },
    { day: 'Sun', queries: scale(172, range), grounded: scale(151, range) },
  ];

  const queryTypes = [
    { label: 'Factual', pct: 52, color: '#22d3ee' },
    { label: 'Procedural', pct: 20, color: '#34d399' },
    { label: 'Comparative', pct: 18, color: '#fbbf24' },
    { label: 'Ambiguous', pct: 10, color: '#f87171' },
  ];

  const confidence = {
    high: { pct: 65, count: scale(811, range), range: '70–100%' },
    medium: { pct: 25, count: scale(312, range), range: '40–69%' },
    low: { pct: 10, count: scale(125, range), range: '0–39%' },
  };

  const topTopics = [
    { rank: 1, topic: 'Banking & Accounts', queries: scale(324, range), pct: 26 },
    { rank: 2, topic: 'Loans & Credit', queries: scale(275, range), pct: 22 },
    { rank: 3, topic: 'Insurance & Claims', queries: scale(187, range), pct: 15 },
    { rank: 4, topic: 'Investments & Wealth', queries: scale(150, range), pct: 12 },
    { rank: 5, topic: 'Government Schemes & Subsidies', queries: scale(112, range), pct: 9 },
  ];

  return {
    range,
    rangeLabel: RANGE_LABEL[range] || range,
    source: 'local',
    summary: {
      totalQueries: { value: totalQueries, delta: '+12% vs previous period' },
      conversations: { value: conversations, delta: '+8% vs previous period' },
      avgConfidence: { value: avgConfidence, delta: '+6%' },
      knowledgeGaps: { value: knowledgeGaps, delta: '+14% vs last week' },
    },
    volume,
    queryTypes,
    confidence,
    topTopics,
    performance: {
      responseTime: '1.2s',
      retrievalSuccess: 89,
      groundingRate: 87,
      groundedShare: 99.8,
    },
    recentActivity: [
      { query: 'Home loan eligibility criteria', confidence: 'High', confidencePct: 91, sources: 2, when: '2 minutes ago' },
      { query: 'Agriculture loan waiver schemes', confidence: 'Low', confidencePct: 22, sources: 0, when: '12 minutes ago' },
      { query: 'SIP investment options for beginners', confidence: 'Medium', confidencePct: 58, sources: 1, when: '18 minutes ago' },
      { query: 'NRI account opening requirements', confidence: 'Medium', confidencePct: 41, sources: 2, when: '26 minutes ago' },
    ],
  };
}

function buildKnowledgeGapMock(range) {
  const totalGaps = scale(42, range);
  const topicsWithGaps = 8;
  const lowConfidence = scale(124, range);
  const noSources = scale(37, range);

  const topics = [
    { topic: 'Agricultural Loans', gaps: scale(18, range), avgConfidence: 31, sources: 0, severity: 'HIGH' },
    { topic: 'Startup Funding & Grants', gaps: scale(14, range), avgConfidence: 45, sources: 1, severity: 'MEDIUM' },
    { topic: 'International Banking (NRI)', gaps: scale(9, range), avgConfidence: 52, sources: 1, severity: 'MEDIUM' },
    { topic: 'Crop Insurance Policies', gaps: scale(6, range), avgConfidence: 38, sources: 0, severity: 'HIGH' },
    { topic: 'Micro-finance Regulations', gaps: scale(5, range), avgConfidence: 58, sources: 2, severity: 'LOW' },
    { topic: 'Education Loan Subsidy', gaps: scale(4, range), avgConfidence: 49, sources: 1, severity: 'MEDIUM' },
    { topic: 'Digital KYC Onboarding', gaps: scale(3, range), avgConfidence: 63, sources: 2, severity: 'LOW' },
    { topic: 'Forex Remittance Limits', gaps: scale(2, range), avgConfidence: 55, sources: 1, severity: 'LOW' },
  ];

  const reasons = [
    { label: 'Missing Sources', pct: 48, detail: '31 queries with 0 chunks', color: '#f87171' },
    { label: 'Low Semantic Sim', pct: 31, detail: 'Score < 0.35 similarity', color: '#22d3ee' },
    { label: 'Ambiguous Intent', pct: 14, detail: 'Classifier uncertain', color: '#34d399' },
    { label: 'Conflicting Data', pct: 7, detail: 'Contradiction flagged', color: '#a78bfa' },
  ];

  const queries = [
    { topic: 'Agricultural Loans', query: 'Eligibility criteria for 2024 farm loan waiver under state scheme', retrieval: '0 chunks found', confidence: 22, gapType: 'NO SOURCES FOUND', when: 'Today, 14:22' },
    { topic: 'Startup Funding', query: 'Seed fund grant disbursement timeline for clean-tech DPIIT', retrieval: '1 chunk (similarity: 0.28)', confidence: 35, gapType: 'LOW CONFIDENCE', when: 'Today, 13:05' },
    { topic: 'International Banking', query: 'Can an NRI open NRE fixed deposit without physical KYC in Mumbai?', retrieval: '2 chunks (irrelevant)', confidence: 41, gapType: 'RETRIEVAL FAILURE', when: 'Today, 11:48' },
    { topic: 'Insurance Policies', query: 'Claim rejection dispute escalation ombudsman email', retrieval: '0 chunks found', confidence: 19, gapType: 'NO SOURCES FOUND', when: 'Yesterday, 18:12' },
    { topic: 'Agricultural Loans', query: 'PM-Kisan credit card interest subvention rate 2024', retrieval: '1 chunk (similarity: 0.31)', confidence: 29, gapType: 'LOW CONFIDENCE', when: 'Yesterday, 15:40' },
    { topic: 'Startup Funding', query: 'CGTMSE collateral-free loan limit for women founders', retrieval: '0 chunks found', confidence: 24, gapType: 'NO SOURCES FOUND', when: 'Yesterday, 10:02' },
  ];

  const insights = [
    'Agricultural Loans represents 42.8% of all recorded gaps. Ingestion of the 2024 PM-Kisan & State Farm Credit manuals is highly recommended.',
    'Low-confidence queries spiked by 24% after the Q1 policy revision due to outdated token embeddings in cluster #3.',
    '37 queries failed with 0 retrieved chunks. Expanding query reformulation synonyms in Query Understanding Agent would recover ~65% of these instantly.',
  ];

  return {
    range,
    rangeLabel: RANGE_LABEL[range] || range,
    source: 'local',
    summary: { totalGaps, topicsWithGaps, lowConfidence, noSources },
    topics,
    reasons,
    queries,
    insights,
  };
}

/* ------------------------------------------------------------------ */
/* Public API: prefer backend, fall back to local mock                 */
/* ------------------------------------------------------------------ */

export async function getAnalytics(range = '7d') {
  try {
    const data = await tryFetch('/analytics', range);
    if (data && typeof data === 'object' && data.summary) {
      return { ...data, source: 'backend' };
    }
  } catch {
    /* Backend analytics API not available yet — use local mock. */
  }
  // Simulate network latency so loading skeletons are visible.
  await new Promise((r) => setTimeout(r, 450));
  return buildAnalyticsMock(range);
}

export async function getKnowledgeGaps(range = '7d') {
  try {
    const data = await tryFetch('/knowledge-gaps', range);
    if (data && typeof data === 'object' && data.summary) {
      return { ...data, source: 'backend' };
    }
  } catch {
    /* Backend gap-detection API not available yet — use local mock. */
  }
  await new Promise((r) => setTimeout(r, 450));
  return buildKnowledgeGapMock(range);
}

export function downloadCsv(filename, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
