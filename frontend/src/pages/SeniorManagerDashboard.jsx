import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../context/AuthContext';
import AiRecommendPanel from '../components/AiRecommendPanel';

export default function SeniorManagerDashboard() {
  const [tab, setTab] = useState('team');
  const [managers, setManagers] = useState([]);
  const [pool, setPool] = useState([]);
  const [selections, setSelections] = useState({}); // { catId: { nomineeName, fromManager } }
  const [currentSelection, setCurrentSelection] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState({ myStatus: 'pending', directorStatus: 'pending' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mgrRes, poolRes, selRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE}/senior/managers`),
        axios.get(`${API_BASE}/senior/pool`),
        axios.get(`${API_BASE}/senior/selections`),
        axios.get(`${API_BASE}/senior/status`),
      ]);
      setManagers(mgrRes.data);
      setPool(poolRes.data);
      setPipelineStatus(statusRes.data);

      if (selRes.data) {
        setCurrentSelection(selRes.data);
        const map = {};
        selRes.data.selections.forEach((s) => {
          map[s.category._id] = {
            nomineeName: s.nomineeName,
            fromManager: s.fromManager?.name || '',
          };
        });
        setSelections(map);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const submitted = managers.filter((m) => m.status === 'submitted').length;
  const total = managers.length;
  const isAlreadySubmitted = currentSelection?.status === 'submitted';

  const pickNominee = (catId, nomineeName, managerName) => {
    if (isAlreadySubmitted) return;
    setSelections((prev) => ({
      ...prev,
      [catId]: { nomineeName, fromManager: managerName },
    }));
  };

  const buildPayload = () =>
    pool.map((item) => ({
      category: item.category._id,
      nomineeName: selections[item.category._id]?.nomineeName || '',
      fromManager: pool
        .flatMap((p) => p.nominees)
        .find((n) => n.nomineeName === selections[item.category._id]?.nomineeName)?.manager?._id || null,
    })).filter((s) => s.nomineeName);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = pool.map((item) => ({
        category: item.category._id,
        nomineeName: selections[item.category._id]?.nomineeName || '',
        fromManager: item.nominees.find(
          (n) => n.nomineeName === selections[item.category._id]?.nomineeName
        )?.manager?._id || null,
      })).filter((s) => s.nomineeName);

      await axios.post(`${API_BASE}/senior/selections`, { selections: payload, action: 'save' });
      setSuccess('Selections saved as draft');
      setTimeout(() => setSuccess(''), 3000);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const missing = pool.filter((item) => !selections[item.category._id]?.nomineeName);
    if (missing.length > 0) {
      return setError(`Please select a nominee for: ${missing.map((m) => m.category.name).join(', ')}`);
    }
    if (!window.confirm('Submit your selections to the Director? This cannot be undone.')) return;

    setSubmitting(true);
    setError('');
    try {
      const payload = pool.map((item) => ({
        category: item.category._id,
        nomineeName: selections[item.category._id]?.nomineeName || '',
        fromManager: item.nominees.find(
          (n) => n.nomineeName === selections[item.category._id]?.nomineeName
        )?.manager?._id || null,
      }));

      await axios.post(`${API_BASE}/senior/selections`, { selections: payload, action: 'submit' });
      setSuccess('Selections submitted to Director!');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard…</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Senior Manager Dashboard</h1>
        <p className="page-subtitle">Review nominations and forward to Director</p>
      </div>

      {/* Pipeline status */}
      <div className="card">
        <p className="card-title">Pipeline Status</p>
        <div className="pipeline">
          <div className={`pipeline-step ${isAlreadySubmitted ? 'done' : ''}`}>
            <span className="pipeline-icon">{isAlreadySubmitted ? '✅' : '📋'}</span>
            <span className="pipeline-label">My Selections</span>
            <span className="pipeline-value">{isAlreadySubmitted ? 'Submitted to Director' : 'Pending'}</span>
          </div>
          <span className="pipeline-arrow">→</span>
          <div className={`pipeline-step ${pipelineStatus.directorStatus === 'completed' ? 'done' : ''}`}>
            <span className="pipeline-icon">{pipelineStatus.directorStatus === 'completed' ? '✅' : '⏳'}</span>
            <span className="pipeline-label">Director</span>
            <span className="pipeline-value">{pipelineStatus.directorStatus === 'completed' ? 'Action Taken' : 'Awaiting'}</span>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Team submissions:</span>
          <strong style={{ color: submitted === total && total > 0 ? '#16a34a' : '#374151' }}>
            {submitted}/{total} submitted
          </strong>
          {submitted < total && <span style={{ fontSize: 12, color: '#f97316' }}>— waiting for {total - submitted} manager(s)</span>}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        {[['team', '👥 My Team'], ['pool', '📋 Nominations Pool'], ['select', '⭐ My Selections']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TEAM STATUS ── */}
      {tab === 'team' && (
        <div className="card">
          <p className="card-title">Team Submission Status</p>
          <p className="card-subtitle">Green = submitted, Grey = pending</p>
          <div className="team-grid">
            {managers.map((m) => (
              <div key={m._id} className={`team-member-card ${m.status === 'submitted' ? 'complete' : 'pending'}`}>
                <div className="team-member-name">{m.name}</div>
                <div className="team-member-meta">
                  {[m.workgroup, m.shift ? `Shift ${m.shift}` : null, m.tower].filter(Boolean).join(' · ')}
                </div>
                <div className="team-member-status">
                  <span className={`dot ${m.status === 'submitted' ? 'dot-green' : m.status === 'draft' ? 'dot-orange' : 'dot-grey'}`} />
                  {m.status === 'submitted' ? 'Submitted ✓' : m.status === 'draft' ? 'Draft saved' : 'Not started'}
                </div>
                {m.submittedAt && (
                  <div className="team-member-meta" style={{ marginTop: 2 }}>
                    {new Date(m.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
            {managers.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No managers assigned to you yet. Ask admin to set reporting manager.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NOMINATION POOL ── */}
      {tab === 'pool' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <p className="card-title" style={{ margin: 0 }}>Nominations Pool</p>
            <AiRecommendPanel pool={pool} />
          </div>
          <p className="card-subtitle">All submitted nominations from your team, grouped by category</p>

          {pool.every((p) => p.nominees.length === 0) ? (
            <div className="alert alert-info">
              No submissions yet. Waiting for managers to submit their nominations.
            </div>
          ) : (
            pool.map((item) => (
              <div key={item.category._id} className="pool-category-block">
                <div className="pool-category-title">
                  🏷️ {item.category.name}
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{item.category.description}</span>
                </div>
                <div className="pool-nominees">
                  {item.nominees.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>No submissions for this category yet</p>
                  ) : (
                    item.nominees.map((nom, idx) => (
                      <div
                        key={idx}
                        className={`pool-nominee-row ${selections[item.category._id]?.nomineeName === nom.nomineeName ? 'selected' : ''}`}
                      >
                        <div>
                          <div className="nominee-name">{nom.nomineeName}</div>
                          {nom.nomineeDesignation && <div className="nominee-from">{nom.nomineeDesignation}</div>}
                          <div className="nominee-from">
                            From: {nom.manager?.name} ({nom.manager?.workgroup}{nom.manager?.shift ? ` Shift ${nom.manager.shift}` : ''})
                          </div>
                          {nom.remarks && <div className="nominee-from" style={{ fontStyle: 'italic' }}>"{nom.remarks}"</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── MY SELECTIONS ── */}
      {tab === 'select' && (
        <div className="card">
          <p className="card-title">My Selections</p>
          {isAlreadySubmitted ? (
            <>
              <div className="alert alert-success">
                Your selections have been submitted to the Director.
              </div>
              <div style={{ marginTop: 16 }}>
                {pool.map((item) => (
                  <div key={item.category._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 13 }}>{item.category.name}</span>
                    <span style={{ fontWeight: 600, color: '#374151' }}>
                      {selections[item.category._id]?.nomineeName || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="card-subtitle">
                Select one nominee per category from the pool, then submit to the Director.
              </p>
              {pool.map((item) => (
                <div key={item.category._id} className="pool-category-block">
                  <div className="pool-category-title">🏷️ {item.category.name}</div>
                  {item.nominees.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13 }}>No nominees submitted for this category</p>
                  ) : (
                    <div className="pool-nominees">
                      {item.nominees.map((nom, idx) => (
                        <div
                          key={idx}
                          className={`pool-nominee-row ${selections[item.category._id]?.nomineeName === nom.nomineeName ? 'selected' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => pickNominee(item.category._id, nom.nomineeName, nom.manager?.name)}
                        >
                          <div>
                            <div className="nominee-name">{nom.nomineeName}</div>
                            <div className="nominee-from">From: {nom.manager?.name}</div>
                          </div>
                          <button
                            className={`select-btn ${selections[item.category._id]?.nomineeName === nom.nomineeName ? 'selected' : ''}`}
                            onClick={(e) => { e.stopPropagation(); pickNominee(item.category._id, nom.nomineeName, nom.manager?.name); }}
                          >
                            {selections[item.category._id]?.nomineeName === nom.nomineeName ? '✓ Selected' : 'Select'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {pool.length === 0 && (
                <div className="alert alert-info">Pool is empty. Wait for managers to submit nominations.</div>
              )}

              {pool.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline-dark" onClick={handleSave} disabled={saving || submitting}>
                    {saving ? 'Saving…' : '💾 Save Draft'}
                  </button>
                  <button className="btn btn-success" onClick={handleSubmit} disabled={saving || submitting}>
                    {submitting ? 'Submitting…' : '✅ Submit to Director'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
