import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../context/AuthContext';
import AiRecommendPanel from '../components/AiRecommendPanel';

export default function DirectorDashboard() {
  const [tab, setTab] = useState('overview');
  const [seniorManagers, setSeniorManagers] = useState([]);
  const [allManagers, setAllManagers] = useState([]);
  const [pool, setPool] = useState([]);
  const [directorAction, setDirectorAction] = useState(null);
  const [selections, setSelections] = useState({}); // { catId: { nomineeName, fromSeniorManagerId } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [smRes, mgrRes, poolRes, actionRes] = await Promise.all([
        axios.get(`${API_BASE}/director/senior-managers`),
        axios.get(`${API_BASE}/director/managers-status`),
        axios.get(`${API_BASE}/director/pool`),
        axios.get(`${API_BASE}/director/action`),
      ]);
      setSeniorManagers(smRes.data);
      setAllManagers(mgrRes.data);
      setPool(poolRes.data);

      if (actionRes.data) {
        setDirectorAction(actionRes.data);
        const map = {};
        actionRes.data.selections.forEach((s) => {
          map[s.category._id || s.category] = {
            nomineeName: s.nomineeName,
            fromSeniorManager: s.fromSeniorManager,
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

  const isCompleted = directorAction?.status === 'completed';
  const smSubmitted = seniorManagers.filter((sm) => sm.status === 'submitted').length;
  const mgrSubmitted = allManagers.filter((m) => m.status === 'submitted').length;

  const pickNominee = (catId, nomineeName, smId) => {
    if (isCompleted) return;
    setSelections((prev) => ({
      ...prev,
      [catId]: { nomineeName, fromSeniorManager: smId },
    }));
  };

  const buildPayload = () =>
    pool.map((item) => ({
      category: item.category._id,
      nomineeName: selections[item.category._id]?.nomineeName || '',
      fromSeniorManager: selections[item.category._id]?.fromSeniorManager || null,
    })).filter((s) => s.nomineeName);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/director/action`, { selections: buildPayload(), action: 'save' });
      setSuccess('Saved successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark your action as complete? This will notify all levels that the Director has taken action.')) return;
    setCompleting(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/director/action`, { selections: buildPayload(), action: 'complete' });
      setSuccess('Action marked as complete! All levels will now see your status as "Action Taken".');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <div className="loading">Loading Director Dashboard…</div>;

  // Group managers by tower for overview
  const managersByTower = allManagers.reduce((acc, m) => {
    const key = m.tower || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Director Dashboard</h1>
        <p className="page-subtitle">Final review and action on nominations from all towers</p>
      </div>

      {/* Summary banner */}
      <div className="card" style={{ background: isCompleted ? '#f0fdf4' : '#eff6ff', borderLeft: `4px solid ${isCompleted ? '#16a34a' : '#3b82f6'}` }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>My Status</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: isCompleted ? '#16a34a' : '#1e3a5f', marginTop: 2 }}>
              {isCompleted ? '✅ Action Taken' : '⏳ Pending'}
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Senior Managers</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: smSubmitted === seniorManagers.length && seniorManagers.length > 0 ? '#16a34a' : '#374151', marginTop: 2 }}>
              {smSubmitted}/{seniorManagers.length} submitted
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Managers</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#374151', marginTop: 2 }}>
              {mgrSubmitted}/{allManagers.length} submitted
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        {[['overview','📊 Overview'], ['pool','📋 Nominations Pool'], ['finalize','🏆 Finalize']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          {/* Senior Managers */}
          <div className="card">
            <p className="card-title">Senior Managers — Submission Status</p>
            <p className="card-subtitle">Have they forwarded their selections to you?</p>
            <div className="team-grid">
              {seniorManagers.map((sm) => (
                <div key={sm._id} className={`team-member-card ${sm.status === 'submitted' ? 'complete' : 'pending'}`}>
                  <div className="team-member-name">{sm.name}</div>
                  <div className="team-member-meta">{sm.tower}</div>
                  <div className="team-member-status">
                    <span className={`dot ${sm.status === 'submitted' ? 'dot-green' : 'dot-grey'}`} />
                    {sm.status === 'submitted' ? 'Submitted ✓' : 'Pending'}
                  </div>
                </div>
              ))}
              {seniorManagers.length === 0 && (
                <p style={{ color: '#94a3b8' }}>No senior managers in the system yet</p>
              )}
            </div>
          </div>

          {/* All Managers by Tower */}
          {Object.entries(managersByTower).map(([tower, mgrs]) => (
            <div key={tower} className="card">
              <p className="card-title">🏢 {tower} — Manager Submission Status</p>
              <div className="team-grid">
                {mgrs.map((m) => (
                  <div key={m._id} className={`team-member-card ${m.status === 'submitted' ? 'complete' : 'pending'}`}>
                    <div className="team-member-name">{m.name}</div>
                    <div className="team-member-meta">
                      {[m.workgroup, m.shift ? `Shift ${m.shift}` : null].filter(Boolean).join(' · ')}
                    </div>
                    {m.reportingManager && (
                      <div className="team-member-meta">Reports to: {m.reportingManager.name}</div>
                    )}
                    <div className="team-member-status">
                      <span className={`dot ${m.status === 'submitted' ? 'dot-green' : m.status === 'draft' ? 'dot-orange' : 'dot-grey'}`} />
                      {m.status === 'submitted' ? 'Submitted ✓' : m.status === 'draft' ? 'Draft saved' : 'Not started'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {allManagers.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No managers found in the system</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── POOL ── */}
      {tab === 'pool' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <p className="card-title" style={{ margin: 0 }}>Nominations Pool</p>
            <AiRecommendPanel pool={pool} />
          </div>
          <p className="card-subtitle">
            Selections forwarded by Senior Managers, grouped by category.
          </p>
          {pool.every((p) => p.nominees.length === 0) ? (
            <div className="alert alert-info">
              No selections forwarded yet. Waiting for Senior Managers to submit.
            </div>
          ) : (
            pool.map((item) => (
              <div key={item.category._id} className="pool-category-block">
                <div className="pool-category-title">
                  🏷️ {item.category.name}
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                    {item.nominees.length} nominee(s)
                  </span>
                </div>
                <div className="pool-nominees">
                  {item.nominees.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13 }}>No nominees for this category</p>
                  ) : (
                    item.nominees.map((nom, idx) => (
                      <div
                        key={idx}
                        className={`pool-nominee-row ${selections[item.category._id]?.nomineeName === nom.nomineeName ? 'selected' : ''}`}
                      >
                        <div>
                          <div className="nominee-name">{nom.nomineeName}</div>
                          <div className="nominee-from">
                            From: {nom.fromSeniorManager?.name} ({nom.fromSeniorManager?.tower})
                          </div>
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

      {/* ── FINALIZE ── */}
      {tab === 'finalize' && (
        <div className="card">
          <p className="card-title">Final Action</p>

          {isCompleted ? (
            <>
              <div className="alert alert-success">
                <div>
                  <strong>✅ Action Completed</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                    Your action has been recorded. All Senior Managers and Managers will see
                    "Director Action Taken" in their dashboards. No selection details are
                    shared with lower levels.
                  </p>
                  {directorAction?.completedAt && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                      Completed on: {new Date(directorAction.completedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="card-subtitle">
                Select your final nominees from the pool across all towers, then mark action as complete.
                Your specific selections will NOT be visible to lower levels — they will only see that you've taken action.
              </p>

              {pool.map((item) => (
                <div key={item.category._id} className="pool-category-block">
                  <div className="pool-category-title">🏷️ {item.category.name}</div>
                  {item.nominees.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13 }}>No nominees for this category yet</p>
                  ) : (
                    <div className="pool-nominees">
                      {item.nominees.map((nom, idx) => (
                        <div
                          key={idx}
                          className={`pool-nominee-row ${selections[item.category._id]?.nomineeName === nom.nomineeName ? 'selected' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => pickNominee(item.category._id, nom.nomineeName, nom.fromSeniorManager?._id)}
                        >
                          <div>
                            <div className="nominee-name">{nom.nomineeName}</div>
                            <div className="nominee-from">
                              {nom.fromSeniorManager?.name} · {nom.fromSeniorManager?.tower}
                            </div>
                          </div>
                          <button
                            className={`select-btn ${selections[item.category._id]?.nomineeName === nom.nomineeName ? 'selected' : ''}`}
                            onClick={(e) => { e.stopPropagation(); pickNominee(item.category._id, nom.nomineeName, nom.fromSeniorManager?._id); }}
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
                <div className="alert alert-info">
                  No nominations in pool yet. Senior Managers need to submit their selections first.
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn btn-outline-dark" onClick={handleSave} disabled={saving || completing}>
                  {saving ? 'Saving…' : '💾 Save Progress'}
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleComplete}
                  disabled={saving || completing}
                  style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  {completing ? 'Completing…' : '🏆 Mark Action as Complete'}
                </button>
              </div>

              <div className="alert alert-info" style={{ marginTop: 16 }}>
                <strong>Note:</strong> Clicking "Mark Action as Complete" will notify all levels.
                Your selected names are stored internally and are not visible to Senior Managers or Managers.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
