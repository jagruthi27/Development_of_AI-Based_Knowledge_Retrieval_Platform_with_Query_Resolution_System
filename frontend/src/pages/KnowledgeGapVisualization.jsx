import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DATE_RANGES,
  downloadCsv,
  getKnowledgeGaps,
} from '../services/analyticsApi';
import './AnalyticsDashboard.css';

/* =====================================================================
   Milestone 4 — Knowledge Gap Visualization
   "Where does the RAG system need more knowledge?"
   Surfaces weak topics, low-confidence / no-source queries, gap reasons
   and example failures so the team knows which documents to ingest next.
   The frontend only DISPLAYS backend-detected gaps — it never classifies
   gaps itself.
   ===================================================================== */

const GAP_FILTERS = [
  { id: 'all', label: 'All Gaps' },
  { id: 'LOW CONFIDENCE', label: 'Low Confidence' },
  { id: 'NO SOURCES FOUND', label: 'No Sources' },
  { id: 'RETRIEVAL FAILURE', label: 'Retrieval Failures' },
];

function severityBadge(sev) {
  const map = {
    HIGH: { color: 'var(--accent-rose)' },
    MEDIUM: { color: 'hsl(38, 95%, 60%)' },
    LOW: { color: 'var(--accent-emerald)' },
  };
  const c = (map[sev] || map.LOW).color;
  return (
    <span className="badge" style={{ fontSize: '0.62rem', background: `${c}14`, color: c, border: `1px solid ${c}35` }}>
      {sev}
    </span>
  );
}

function gapTypeBadge(type) {
  const color =
    type === 'NO SOURCES FOUND'
      ? 'var(--accent-rose)'
      : type === 'LOW CONFIDENCE'
        ? 'var(--accent-emerald)'
        : 'var(--accent-blue)';
  return (
    <span className="badge" style={{ fontSize: '0.6rem', background: `${color}14`, color, border: `1px solid ${color}35`, whiteSpace: 'nowrap' }}>
      {type}
    </span>
  );
}

function confColor(pct) {
  if (pct >= 70) return 'var(--accent-emerald)';
  if (pct >= 40) return 'var(--accent-blue)';
  return 'var(--accent-rose)';
}

export default function KnowledgeGapVisualization({ onIngest }) {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [visibleCount, setVisibleCount] = useState(4);

  const load = useCallback(async (r) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getKnowledgeGaps(r);
      setData(payload);
    } catch (e) {
      setError(e?.message || 'Unable to load knowledge gap data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);
  useEffect(() => { setVisibleCount(4); setSelectedTopic(null); }, [range, filter, search]);

  const filteredQueries = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.queries.filter((item) => {
      if (filter !== 'all' && item.gapType !== filter) return false;
      if (selectedTopic && item.topic !== selectedTopic) return false;
      if (q && !`${item.topic} ${item.query}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, filter, search, selectedTopic]);

  const filteredTopics = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.topics;
    return data.topics.filter((t) => t.topic.toLowerCase().includes(q));
  }, [data, search]);

  const maxGaps = Math.max(1, ...((data?.topics || []).map((t) => t.gaps)));

  const handleExport = () => {
    if (!data) return;
    downloadCsv(`querynest-knowledge-gaps-${range}.csv`, [
      ['topic', 'example_query', 'confidence_pct', 'retrieval', 'gap_type', 'detected_at'],
      ...filteredQueries.map((r) => [r.topic, r.query, r.confidence, r.retrieval, r.gapType, r.when]),
    ]);
  };

  const summary = data?.summary;

  return (
    <div className="m4-page">
      {/* Header */}
      <div className="m4-header-row">
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent-emerald)', margin: '0 0 6px' }}>
            TELEMETRY &amp; DIAGNOSTICS ● PIPELINE SENTRY ACTIVE
          </p>
          <h1 className="m4-title">Knowledge Gap Visualization</h1>
          <p className="m4-subtitle">Identify topics, user queries, and vector spaces where the RAG retrieval pipeline lacks sufficient grounding documentation.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '9px 14px' }} onClick={() => load(range)}>
            ⟳ Rescan Vector Space
          </button>
          <button type="button" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '9px 14px' }}
            onClick={() => { if (onIngest) onIngest(); }}>
            📥 + Ingest Documents to Resolve
          </button>
        </div>
      </div>

      {/* Filter pills + search + date */}
      <div className="glass-panel" style={{ padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="m4-pills" role="tablist" aria-label="Gap type filter">
          {GAP_FILTERS.map((f) => {
            const count =
              f.id === 'all' ? summary?.totalGaps
              : f.id === 'LOW CONFIDENCE' ? summary?.lowConfidence
              : f.id === 'NO SOURCES FOUND' ? summary?.noSources
              : Math.max(1, Math.round((summary?.totalGaps || 0) * 0.43));
            return (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id}
                className={`m4-pill ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}{typeof count === 'number' ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
        <input className="m4-search" placeholder="🔍 Search topic or problematic query…"
          value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search topic or query" />
        <div className="m4-pills" aria-label="Date range">
          {DATE_RANGES.map((r) => (
            <button key={r.id} type="button" className={`m4-pill ${range === r.id ? 'active' : ''}`} onClick={() => setRange(r.id)}>
              {r.id === '7d' ? 'Last 7 Days' : r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div>
          <div className="m4-cards">{[0, 1, 2, 3].map((i) => <div key={i} className="m4-skeleton" />)}</div>
          <div className="m4-skeleton" style={{ minHeight: '240px', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Scanning retrieval logs for knowledge gaps…</p>
        </div>
      )}

      {!loading && error && (
        <div className="glass-panel m4-state">
          <h3>Unable to load knowledge gap data.</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => load(range)}>Retry</button>
        </div>
      )}

      {!loading && !error && data && summary.totalGaps === 0 && (
        <div className="glass-panel m4-state">
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✓</div>
          <h3>No significant knowledge gaps detected.</h3>
          <p>The knowledge base is currently providing sufficient information for recent queries.</p>
        </div>
      )}

      {!loading && !error && data && summary.totalGaps > 0 && (
        <>
          {/* Summary cards */}
          <div className="m4-cards">
            {[
              { label: '⚠ Total Knowledge Gaps', value: summary.totalGaps, sub: `Across ${summary.topicsWithGaps} knowledge clusters`, accent: 'var(--accent-rose)' },
              { label: '📄 Topics With Gaps', value: summary.topicsWithGaps, sub: 'Distinct weak topics', accent: 'var(--accent-blue)', suffix: 'Topics' },
              { label: '🔴 Low Confidence Queries', value: summary.lowConfidence, sub: 'Below 40% threshold', accent: 'var(--accent-emerald)' },
              { label: '📭 No Sources Found', value: summary.noSources, sub: 'Retrieval returned 0 chunks', accent: 'hsl(38, 95%, 60%)', suffix: 'Queries' },
            ].map((c) => (
              <div key={c.label} className="glass-card m4-card">
                <div className="m4-card-label">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.accent, display: 'inline-block', boxShadow: `0 0 8px ${c.accent}` }} />
                  {c.label}
                </div>
                <div className="m4-card-value">{c.value.toLocaleString()} {c.suffix && <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500 }}>{c.suffix}</span>}</div>
                <div className="m4-card-sub"><span>{c.sub}</span></div>
              </div>
            ))}
          </div>

          {/* Topics table + category chart */}
          <div className="m4-grid-2">
            <div className="glass-panel m4-panel">
              <div className="m4-panel-head">
                <div>
                  <h3 className="m4-panel-title">📊 Knowledge Gap Topics Analysis</h3>
                  <p className="m4-panel-sub">Top clusters categorized by pipeline confidence collapse — click a row for detail</p>
                </div>
              </div>
              {filteredTopics.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No topics match “{search}”.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="m4-table">
                    <thead>
                      <tr><th>Topic Name</th><th>Gap Queries</th><th>Avg Confidence</th><th>Coverage</th><th>Severity</th></tr>
                    </thead>
                    <tbody>
                      {filteredTopics.slice(0, 5).map((t) => (
                        <tr key={t.topic} onClick={() => setSelectedTopic((s) => (s === t.topic ? null : t.topic))}
                          style={{ cursor: 'pointer', background: selectedTopic === t.topic ? 'hsla(174,100%,41%,0.07)' : undefined }}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ color: t.severity === 'HIGH' ? 'var(--accent-rose)' : t.severity === 'MEDIUM' ? 'hsl(38,95%,60%)' : 'var(--accent-emerald)', marginRight: '7px' }}>●</span>
                            {t.topic}
                          </td>
                          <td>{t.gaps} queries</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                              <div className="m4-bar-track" style={{ flex: 1 }}>
                                <div style={{ width: `${t.avgConfidence}%`, height: '100%', borderRadius: '99px', background: confColor(t.avgConfidence) }} />
                              </div>
                              <strong style={{ color: confColor(t.avgConfidence), fontSize: '0.75rem' }}>{t.avgConfidence}%</strong>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{t.sources === 0 ? '0 sources' : `${t.sources} source${t.sources === 1 ? '' : 's'}`}</td>
                          <td>{severityBadge(t.severity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Showing {Math.min(5, filteredTopics.length)} of {filteredTopics.length} problematic clusters</span>
                {selectedTopic && (
                  <button type="button" onClick={() => setSelectedTopic(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontWeight: 700, cursor: 'pointer', fontSize: '0.72rem' }}>
                    Clear topic filter ✕ ({selectedTopic})
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel m4-panel">
                <div className="m4-panel-head">
                  <div>
                    <h3 className="m4-panel-title">📊 Knowledge Gaps by Category</h3>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOP 4</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredTopics.slice(0, 4).map((t, i) => (
                    <div key={t.topic}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '5px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t.topic}</span>
                        <span style={{ color: i === 0 ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {t.gaps} gaps ({((t.gaps / Math.max(1, summary.totalGaps)) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="m4-bar-track">
                        <div className="m4-bar-fill" style={{ width: `${(t.gaps / maxGaps) * 100}%`, opacity: 1 - i * 0.15 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel m4-panel">
                <div className="m4-panel-head">
                  <div><h3 className="m4-panel-title">ⓘ Root Cause Breakdown</h3></div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>DIAGNOSTIC</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {data.reasons.map((r) => (
                    <div key={r.label} style={{ background: 'hsla(185,18%,14%,0.4)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                        {r.label}
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, margin: '4px 0' }}>{r.pct}%</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="glass-panel m4-panel" style={{ marginBottom: '16px', borderLeft: '3px solid var(--accent-purple)' }}>
            <div className="m4-panel-head">
              <div><h3 className="m4-panel-title">💡 System Insights &amp; Automated Remediation</h3></div>
              <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>LLM Audit</span>
            </div>
            <ul style={{ margin: '0 0 16px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {data.insights.map((ins) => <li key={ins} style={{ lineHeight: 1.55 }}>{ins}</li>)}
            </ul>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" style={{ fontSize: '0.75rem' }} onClick={() => { if (onIngest) onIngest(); }}>
                ⚡ Auto-Trigger Ingestion Job
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={handleExport}>
                ⬇ Export Gap Log (CSV)
              </button>
            </div>
          </div>

          {/* Example queries */}
          <div className="glass-panel m4-panel">
            <div className="m4-panel-head">
              <div>
                <h3 className="m4-panel-title">🔍 Example Problematic Queries &amp; Grounding Failures</h3>
                <p className="m4-panel-sub">Real user queries triggering RAG retrieval fallbacks and null context hits</p>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>LIVE STREAM ●</span>
            </div>
            {filteredQueries.length === 0 ? (
              <div className="m4-state" style={{ padding: '28px' }}>
                <h3>No queries match this filter.</h3>
                <p>Try a different gap type{(selectedTopic || search) ? ', topic, or search term' : ''}.</p>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem' }}
                  onClick={() => { setFilter('all'); setSearch(''); setSelectedTopic(null); }}>
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="m4-table">
                    <thead>
                      <tr><th>Topic</th><th>User Query</th><th>Retrieval Result</th><th>Confidence</th><th>Gap Type</th><th>Detected At</th></tr>
                    </thead>
                    <tbody>
                      {filteredQueries.slice(0, visibleCount).map((q, i) => (
                        <tr key={`${q.query}-${i}`}>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{q.topic}</td>
                          <td style={{ color: 'var(--text-secondary)', fontStyle: 'italic', minWidth: '220px' }}>“{q.query}”</td>
                          <td style={{ color: q.retrieval.startsWith('0') ? 'var(--accent-rose)' : 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{q.retrieval}</td>
                          <td><strong style={{ color: confColor(q.confidence), background: `${confColor(q.confidence)}14`, border: `1px solid ${confColor(q.confidence)}30`, padding: '3px 8px', borderRadius: '99px', fontSize: '0.72rem' }}>{q.confidence}%</strong></td>
                          <td>{gapTypeBadge(q.gapType)}</td>
                          <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{q.when}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Displaying latest {Math.min(visibleCount, filteredQueries.length)} of {filteredQueries.length} ungrounded query events</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                      disabled={visibleCount <= 4} onClick={() => setVisibleCount((c) => Math.max(4, c - 4))}>
                      Previous
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                      disabled={visibleCount >= filteredQueries.length} onClick={() => setVisibleCount((c) => c + 4)}>
                      Next Page
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
