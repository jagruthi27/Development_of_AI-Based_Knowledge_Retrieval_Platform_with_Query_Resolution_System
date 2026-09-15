import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DATE_RANGES,
  downloadCsv,
  getAnalytics,
} from '../services/analyticsApi';
import './AnalyticsDashboard.css';

/* =====================================================================
   Milestone 4 — Analytics Dashboard
   "How is the entire RAG system performing?"
   Aggregates MANY queries: usage, retrieval success, response quality,
   topic performance. (Milestone 3 showed per-query evidence; this page
   shows the whole-system picture built on top of it.)
   ===================================================================== */

/* ---------------- DateRangeFilter ---------------- */
function DateRangeFilter({ value, onChange, rangeLabel }) {
  return (
    <div className="m4-controls">
      <div className="m4-pills" role="tablist" aria-label="Date range">
        {DATE_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={value === r.id}
            className={`m4-pill ${value === r.id ? 'active' : ''}`}
            onClick={() => onChange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <span className="m4-range-label">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {rangeLabel}
      </span>
    </div>
  );
}

/* ---------------- Metric cards ---------------- */
function MetricCard({ label, value, delta, deltaTone = 'up', footer, accent = 'var(--accent-purple)', onClick }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      className="glass-card m4-card"
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      style={clickable ? { cursor: 'pointer' } : undefined}
      title={clickable ? 'Open Knowledge Gap Visualization' : undefined}
    >
      <div className="m4-card-label">
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, display: 'inline-block', boxShadow: `0 0 8px ${accent}` }} />
        {label}
      </div>
      <div className="m4-card-value">{value}</div>
      <div className="m4-card-sub">
        <span className={`m4-delta ${deltaTone}`}>{delta}</span>
        {footer && <span>{footer}</span>}
        {clickable && <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>View gaps →</span>}
      </div>
    </div>
  );
}

/* ---------------- QueryVolumeChart (pure SVG, no new deps) ---------------- */
function QueryVolumeChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 640; const H = 240; const PAD = 30;
  const max = Math.max(...data.map((d) => d.queries)) * 1.15;

  const x = (i) => PAD + (i * (W - PAD * 2)) / (data.length - 1);
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);

  const line = (key) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const area = `${line('grounded')} L${x(data.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`;

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#22d3ee', display: 'inline-block' }} /> Total Queries
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#34d399', display: 'inline-block' }} /> Grounded Answers
        </span>
        {hover != null && (
          <span style={{ marginLeft: 'auto', color: 'var(--text-primary)', fontWeight: 700 }}>
            {data[hover].day}: {data[hover].queries} queries · {data[hover].grounded} grounded
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Query volume trend">
        <defs>
          <linearGradient id="m4-vol-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - f * (H - PAD * 2)} y2={H - PAD - f * (H - PAD * 2)} stroke="hsla(174,30%,80%,0.08)" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#m4-vol-fill)" />
        <path d={line('grounded')} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="5 4" />
        <path d={line('queries')} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.day}>
            <circle cx={x(i)} cy={y(d.queries)} r={hover === i ? 5 : 3.5} fill="#0b1518" stroke="#22d3ee" strokeWidth="2" style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            <circle cx={x(i)} cy={y(d.grounded)} r="2.5" fill="#34d399" />
            <rect x={x(i) - 24} y={0} width={48} height={H} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            <text x={x(i)} y={H - 8} textAnchor="middle" fill={d.day === 'Fri' ? '#22d3ee' : 'var(--text-muted)'} fontSize="11" fontWeight={d.day === 'Fri' ? 700 : 400}>{d.day}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------------- QueryTypeDistributionChart (donut) ---------------- */
function QueryTypeDonut({ items, total }) {
  const R = 70; const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = items.map((it) => {
    const start = acc; acc += it.pct;
    return { ...it, dash: `${((it.pct / 100) * C).toFixed(1)} ${(C - (it.pct / 100) * C).toFixed(1)}`, offset: -((start / 100) * C).toFixed(1) };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="Query type distribution">
        <circle cx="90" cy="90" r={R} fill="none" stroke="hsla(174,30%,80%,0.1)" strokeWidth="20" />
        {segs.map((s) => (
          <circle key={s.label} cx="90" cy="90" r={R} fill="none" stroke={s.color} strokeWidth="20"
            strokeDasharray={s.dash} strokeDashoffset={s.offset} transform="rotate(-90 90 90)"
            strokeLinecap="butt">
            <title>{`${s.label}: ${s.pct}%`}</title>
          </circle>
        ))}
        <text x="90" y="86" textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="800">{total.toLocaleString()}</text>
        <text x="90" y="104" textAnchor="middle" fill="var(--text-muted)" fontSize="10" letterSpacing="1.5">QUERIES</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1, minWidth: '150px' }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: it.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{it.label}</span>
            <strong style={{ color: 'var(--text-primary)' }}>{it.pct}%</strong>
          </div>
        ))}
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
          From the Query Understanding Agent classifier — mostly factual lookup usage.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Main page ---------------- */
export default function AnalyticsDashboard({ onNavigateToGaps }) {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (r) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAnalytics(r);
      setData(payload);
    } catch (e) {
      setError(e?.message || 'Unable to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  const summary = data?.summary;
  const totalQueries = summary?.totalQueries?.value ?? 0;

  const handleExport = useMemo(() => () => {
    if (!data) return;
    downloadCsv(`querynest-analytics-${range}.csv`, [
      ['metric', 'value'],
      ['range', data.rangeLabel],
      ['total_queries', summary.totalQueries.value],
      ['conversations', summary.conversations.value],
      ['avg_confidence_pct', summary.avgConfidence.value],
      ['knowledge_gaps', summary.knowledgeGaps.value],
      ...data.topTopics.map((t) => [`topic:${t.topic}`, t.queries]),
    ]);
  }, [data, range, summary]);

  return (
    <div className="m4-page">
      {/* Header */}
      <div className="m4-header-row">
        <div>
          <h1 className="m4-title">
            Analytics Dashboard
            <span className="m4-live-badge">● TELEMETRY LIVE</span>
          </h1>
          <p className="m4-subtitle">Monitor RAG system usage, retrieval performance, and response quality.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <DateRangeFilter value={range} onChange={setRange} rangeLabel={data?.rangeLabel || '…'} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--accent-emerald)' }}>●</span> Auto-refresh: 30s
              {data && <span style={{ marginLeft: '8px' }}>· source: {data.source}</span>}
            </span>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '7px 13px' }} onClick={handleExport} disabled={!data}>
              ⬇ Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div>
          <div className="m4-cards">
            {[0, 1, 2, 3].map((i) => <div key={i} className="m4-skeleton" />)}
          </div>
          <div className="m4-skeleton" style={{ minHeight: '260px', marginBottom: '16px' }} />
          <div className="m4-skeleton" style={{ minHeight: '180px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '12px' }}>Loading analytics…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass-panel m4-state">
          <h3>Unable to load analytics data.</h3>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => load(range)}>Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && data && totalQueries === 0 && (
        <div className="glass-panel m4-state">
          <h3>No analytics data available yet.</h3>
          <p>Start using the RAG system to generate insights.</p>
          <button type="button" className="btn btn-primary" onClick={() => load(range)}>Refresh</button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && totalQueries > 0 && (
        <>
          {/* MetricsOverview */}
          <div className="m4-cards">
            <MetricCard label="💬 Total Queries" value={summary.totalQueries.value.toLocaleString()}
              delta="↑ 12%" footer="vs previous period" accent="var(--accent-purple)" />
            <MetricCard label="💬 Conversations" value={summary.conversations.value.toLocaleString()}
              delta="↑ 8%" footer="vs previous period" accent="var(--accent-blue)" />
            <MetricCard label="🛡 Average Confidence" value={`${summary.avgConfidence.value}%`}
              delta="↑ 6%" footer="mean of response scores" accent="var(--accent-emerald)" />
            <MetricCard label="⚠ Knowledge Gaps" value={summary.knowledgeGaps.value}
              delta="↑ 14%" deltaTone="warn" footer="problematic topics" accent="var(--accent-rose)"
              onClick={onNavigateToGaps} />
          </div>

          {/* Volume + Query types */}
          <div className="m4-grid-2">
            <div className="glass-panel m4-panel">
              <div className="m4-panel-head">
                <div>
                  <h3 className="m4-panel-title">Query Volume &amp; Grounding Trend</h3>
                  <p className="m4-panel-sub">Daily query distribution and validated factual grounding</p>
                </div>
              </div>
              <QueryVolumeChart data={data.volume} />
            </div>
            <div className="glass-panel m4-panel">
              <div className="m4-panel-head">
                <div>
                  <h3 className="m4-panel-title">Query Type Distribution</h3>
                  <p className="m4-panel-sub">Intent categorization across inputs</p>
                </div>
              </div>
              <QueryTypeDonut items={data.queryTypes} total={totalQueries} />
            </div>
          </div>

          {/* Confidence + Performance */}
          <div className="m4-grid-2">
            <div className="glass-panel m4-panel">
              <div className="m4-panel-head">
                <div>
                  <h3 className="m4-panel-title">Confidence Distribution</h3>
                  <p className="m4-panel-sub">Model verification tiered thresholds (extends per-answer confidence from Milestone 3)</p>
                </div>
              </div>
              <div style={{ display: 'flex', height: '12px', borderRadius: '99px', overflow: 'hidden', background: 'var(--border-color)', marginBottom: '14px' }}>
                <div style={{ width: `${data.confidence.high.pct}%`, background: 'var(--accent-emerald)' }} title={`High ${data.confidence.high.pct}%`} />
                <div style={{ width: `${data.confidence.medium.pct}%`, background: 'var(--accent-blue)' }} title={`Medium ${data.confidence.medium.pct}%`} />
                <div style={{ width: `${data.confidence.low.pct}%`, background: 'var(--accent-rose)' }} title={`Low ${data.confidence.low.pct}%`} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { k: 'high', label: `HIGH (${data.confidence.high.range})`, color: 'var(--accent-emerald)' },
                  { k: 'medium', label: `MED (${data.confidence.medium.range})`, color: 'var(--accent-blue)' },
                  { k: 'low', label: `LOW (<40%)`, color: 'var(--accent-rose)' },
                ].map((t) => (
                  <div key={t.k} style={{ background: 'hsla(185,18%,14%,0.4)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: t.color, letterSpacing: '0.05em' }}>{t.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0' }}>{data.confidence[t.k].pct}%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.confidence[t.k].count.toLocaleString()} queries</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel m4-panel">
              <div className="m4-panel-head">
                <div>
                  <h3 className="m4-panel-title">System Performance</h3>
                  <p className="m4-panel-sub">RAG pipeline health indicators</p>
                </div>
              </div>
              {[
                { label: 'Average Response Time', value: data.performance.responseTime, pct: 82, note: 'target < 2.0s' },
                { label: 'Retrieval Success Rate', value: `${data.performance.retrievalSuccess}%`, pct: data.performance.retrievalSuccess, note: 'queries with relevant chunks' },
                { label: 'Grounding Rate', value: `${data.performance.groundingRate}%`, pct: data.performance.groundingRate, note: 'answers backed by citations' },
              ].map((m) => (
                <div key={m.label} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{m.label}</span>
                    <span><strong style={{ color: 'var(--text-primary)' }}>{m.value}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>· {m.note}</span></span>
                  </div>
                  <div className="m4-bar-track"><div className="m4-bar-fill" style={{ width: `${m.pct}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Topics + Recent activity */}
          <div className="m4-grid-2">
            <div className="glass-panel m4-panel">
              <div className="m4-panel-head">
                <div>
                  <h3 className="m4-panel-title">Top Topics by Query Volume</h3>
                  <p className="m4-panel-sub">Semantic cluster frequency breakdown (Common Query Theme Analysis)</p>
                </div>
                <span className="badge badge-purple">Top 5 Clusters</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.topTopics.map((t) => (
                  <div key={t.topic}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                      <strong>{t.rank}. {t.topic}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{t.queries.toLocaleString()} queries <strong style={{ color: 'var(--accent-purple)', marginLeft: '6px' }}>{t.pct}%</strong></span>
                    </div>
                    <div className="m4-bar-track"><div className="m4-bar-fill" style={{ width: `${t.pct * 3.4}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel m4-panel">
              <div className="m4-panel-head">
                <div>
                  <h3 className="m4-panel-title">Recent System Activity</h3>
                  <p className="m4-panel-sub">Live telemetry stream across pipelines</p>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>Live Stream</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.recentActivity.map((a) => (
                  <div key={a.query} className="glass-card" style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                      <span style={{ color: a.confidence === 'High' ? 'var(--accent-emerald)' : a.confidence === 'Low' ? 'var(--accent-rose)' : 'var(--accent-blue)', marginRight: '8px' }}>●</span>
                      {a.query}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span>{a.confidence} confidence · {a.confidencePct}%</span>
                      <span>·</span>
                      <span>{a.sources} source{a.sources === 1 ? '' : 's'}</span>
                      <span style={{ marginLeft: 'auto' }}>{a.when}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Displaying latest {data.recentActivity.length} execution events</span>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Open Query Log →</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
