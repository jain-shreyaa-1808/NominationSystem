import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE, useAuth } from '../context/AuthContext';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [nominations, setNominations] = useState({}); // { categoryId: { nomineeName, nomineeDesignation, remarks } }
  const [currentNomination, setCurrentNomination] = useState(null); // saved record
  const [status, setStatus] = useState({ myStatus: 'not_started', reportingManagerStatus: 'pending', directorStatus: 'pending' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, nomRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE}/manager/categories`),
        axios.get(`${API_BASE}/manager/nominations`),
        axios.get(`${API_BASE}/manager/status`),
      ]);
      setCategories(catRes.data);
      setStatus(statusRes.data);

      if (nomRes.data) {
        setCurrentNomination(nomRes.data);
        const map = {};
        nomRes.data.nominations.forEach((n) => {
          map[n.category._id] = {
            nomineeName: n.nomineeName,
            nomineeDesignation: n.nomineeDesignation || '',
            remarks: n.remarks || '',
          };
        });
        setNominations(map);
      } else {
        // Init empty map
        const map = {};
        catRes.data.forEach((c) => {
          map[c._id] = { nomineeName: '', nomineeDesignation: '', remarks: '' };
        });
        setNominations(map);
      }
    } catch {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const buildPayload = () =>
    categories.map((c) => ({
      category: c._id,
      nomineeName: nominations[c._id]?.nomineeName || '',
      nomineeDesignation: nominations[c._id]?.nomineeDesignation || '',
      remarks: nominations[c._id]?.remarks || '',
    }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/manager/nominations`, {
        nominations: buildPayload(),
        action: 'save',
      });
      setSuccess('Draft saved successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all names filled
    const empty = categories.find((c) => !nominations[c._id]?.nomineeName?.trim());
    if (empty) {
      return setError(`Please enter a nominee name for: ${empty.name}`);
    }
    if (!window.confirm('Submit your nominations? This cannot be undone.')) return;

    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/manager/nominations`, {
        nominations: buildPayload(),
        action: 'submit',
      });
      setSuccess('Nominations submitted successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (catId, field, value) => {
    setNominations((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: value },
    }));
  };

  const isSubmitted = currentNomination?.status === 'submitted';

  const pipelineSteps = [
    {
      label: 'My Nominations',
      value: isSubmitted ? 'Submitted' : currentNomination?.status === 'draft' ? 'Draft Saved' : 'Not Started',
      icon: isSubmitted ? '✅' : currentNomination?.status === 'draft' ? '📝' : '⏳',
      done: isSubmitted,
    },
    {
      label: 'Reporting Manager',
      value: status.reportingManagerStatus === 'submitted' ? 'Reviewed & Forwarded' : 'Pending Review',
      icon: status.reportingManagerStatus === 'submitted' ? '✅' : '⏳',
      done: status.reportingManagerStatus === 'submitted',
    },
    {
      label: 'Director',
      value: status.directorStatus === 'completed' ? 'Action Taken' : 'Pending',
      icon: status.directorStatus === 'completed' ? '✅' : '⏳',
      done: status.directorStatus === 'completed',
    },
  ];

  if (loading) return <div className="loading">Loading nominations…</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Nominations</h1>
        <p className="page-subtitle">
          {user?.workgroup && `${user.workgroup}`}
          {user?.shift && ` · Shift ${user.shift}`}
          {user?.tower && ` · ${user.tower}`}
        </p>
      </div>

      {/* Pipeline status */}
      <div className="card">
        <p className="card-title">Submission Status</p>
        <div className="pipeline">
          {pipelineSteps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className={`pipeline-step ${step.done ? 'done' : ''}`}>
                <span className="pipeline-icon">{step.icon}</span>
                <span className="pipeline-label">{step.label}</span>
                <span className="pipeline-value">{step.value}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <span className="pipeline-arrow">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {isSubmitted ? (
        <div className="card">
          <div className="alert alert-success" style={{ marginBottom: 0 }}>
            <div>
              <strong>Nominations Submitted!</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                Your nominations have been submitted to your reporting manager for review.
                You will see status updates above as the process progresses.
              </p>
            </div>
          </div>
          <hr className="divider" />
          <p className="card-title">Your Submitted Nominations</p>
          <div className="nomination-grid">
            {categories.map((cat) => (
              <div key={cat._id} className="nomination-row" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <div className="category-name-cell">
                  {cat.name}
                  <div className="category-desc">{cat.description}</div>
                </div>
                <div style={{ gridColumn: 'span 3', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700 }}>{nominations[cat._id]?.nomineeName || '—'}</span>
                  {nominations[cat._id]?.nomineeDesignation && (
                    <span className="chip">{nominations[cat._id].nomineeDesignation}</span>
                  )}
                  {nominations[cat._id]?.remarks && (
                    <span style={{ color: '#64748b', fontSize: 12 }}>{nominations[cat._id].remarks}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="card-title">Enter Your Nominations</p>
          <p className="card-subtitle">
            Nominate one person per category from your team.
            {' '}You can save a draft and come back, but once submitted you cannot change it.
          </p>

          {categories.length === 0 ? (
            <div className="alert alert-warning">
              No categories found. Ask the admin to run the seed script.
            </div>
          ) : (
            <>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr 1fr 1fr',
                gap: 10,
                padding: '0 16px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                <span>Category</span>
                <span>Nominee Name *</span>
                <span>Designation</span>
                <span>Remarks</span>
              </div>

              <div className="nomination-grid">
                {categories.map((cat) => (
                  <div key={cat._id} className="nomination-row">
                    <div className="category-name-cell">
                      {cat.name}
                      <div className="category-desc">{cat.description}</div>
                    </div>
                    <input
                      placeholder="Nominee name"
                      value={nominations[cat._id]?.nomineeName || ''}
                      onChange={(e) => setField(cat._id, 'nomineeName', e.target.value)}
                    />
                    <input
                      placeholder="Designation (optional)"
                      value={nominations[cat._id]?.nomineeDesignation || ''}
                      onChange={(e) => setField(cat._id, 'nomineeDesignation', e.target.value)}
                    />
                    <input
                      placeholder="Brief reason (optional)"
                      value={nominations[cat._id]?.remarks || ''}
                      onChange={(e) => setField(cat._id, 'remarks', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline-dark" onClick={handleSave} disabled={saving || submitting}>
                  {saving ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button className="btn btn-success" onClick={handleSubmit} disabled={saving || submitting}>
                  {submitting ? 'Submitting…' : '✅ Submit Nominations'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
