import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../context/AuthContext';

const ROLES = ['manager', 'senior_manager', 'director'];
const WORKGROUPS = ['Wireless', 'CATC', 'IoT', 'Other'];
const SHIFTS = [1, 2];

const EMPTY_USER = {
  name: '', email: '', cwid: '', role: 'manager',
  workgroup: '', shift: '', tower: '', technologyGroup: '',
  reportingManager: '', reportingDirector: '',
};

const DEADLINE_ROLES = [
  { value: 'manager',         label: 'Manager' },
  { value: 'senior_manager',  label: 'Senior Manager' },
  { value: 'director',        label: 'Director' },
];

/**
 * Three-field DD / MM / YYYY date picker.
 * value: 'yyyy-mm-dd' string (or '')
 * onChange: called with new 'yyyy-mm-dd' string (or '' when incomplete)
 */
function DeadlineDateInput({ value, onChange }) {
  const [day,   setDay]   = useState('');
  const [month, setMonth] = useState('');
  const [year,  setYear]  = useState('');

  const dayRef   = useRef(null);
  const monthRef = useRef(null);
  const yearRef  = useRef(null);

  // Sync internal state when the parent value changes (e.g. after fetch)
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y); setMonth(m); setDay(d);
    } else if (!value) {
      setDay(''); setMonth(''); setYear('');
    }
  }, [value]);

  const emit = (d, m, y) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
  };

  const handleDay = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(val);
    emit(val, month, year);
    if (val.length === 2) monthRef.current?.focus();
  };

  const handleMonth = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(val);
    emit(day, val, year);
    if (val.length === 2) yearRef.current?.focus();
  };

  const handleYear = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(val);
    emit(day, month, val);
  };

  const handleMonthKey = (e) => {
    if (e.key === 'Backspace' && month === '') dayRef.current?.focus();
  };

  const handleYearKey = (e) => {
    if (e.key === 'Backspace' && year === '') monthRef.current?.focus();
  };

  const segStyle = {
    width: 46, textAlign: 'center', padding: '8px 6px',
    border: '1.5px solid #d1d5db', borderRadius: 8,
    fontSize: 14, outline: 'none',
  };
  const sepStyle = { color: '#94a3b8', fontWeight: 700, userSelect: 'none' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input ref={dayRef}   value={day}   onChange={handleDay}
        placeholder="DD"   maxLength={2} inputMode="numeric" style={segStyle} />
      <span style={sepStyle}>/</span>
      <input ref={monthRef} value={month} onChange={handleMonth} onKeyDown={handleMonthKey}
        placeholder="MM"   maxLength={2} inputMode="numeric" style={segStyle} />
      <span style={sepStyle}>/</span>
      <input ref={yearRef}  value={year}  onChange={handleYear}  onKeyDown={handleYearKey}
        placeholder="YYYY" maxLength={4} inputMode="numeric" style={{ ...segStyle, width: 62 }} />
    </div>
  );
}

const StatusBadge = ({ status }) => (
  <span className={`status-badge status-${status}`}>
    {status === 'not_started' ? 'Not Started' : status}
  </span>
);

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [seniorManagers, setSeniorManagers] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusData, setStatusData] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_USER);
  const [saving, setSaving] = useState(false);

  // Category form
  const [catForm, setCatForm] = useState({ name: '', description: '', order: '' });
  const [catSaving, setCatSaving] = useState(false);

  // Deadline form: { manager: { deadline, note }, senior_manager: {...}, director: {...} }
  const [deadlineForm, setDeadlineForm] = useState({
    manager:        { deadline: '', note: '' },
    senior_manager: { deadline: '', note: '' },
    director:       { deadline: '', note: '' },
  });
  const [deadlineSaving, setDeadlineSaving] = useState(null); // which role is saving
  const [testingReminders, setTestingReminders] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/users`);
      setUsers(res.data);
    } catch { setError('Failed to load users'); }
  }, []);

  const fetchSeniorManagers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/senior-managers`);
      setSeniorManagers(res.data);
    } catch {}
  }, []);

  const fetchDirectors = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/directors`);
      setDirectors(res.data);
    } catch {}
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/categories`);
      setCategories(res.data);
    } catch {}
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/status`);
      setStatusData(res.data);
    } catch { setError('Failed to load status'); }
    finally { setLoading(false); }
  }, []);

  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/deadlines`);
      // Build fresh from a clean default — no dependency on current deadlineForm state
      const updated = {
        manager:        { deadline: '', note: '' },
        senior_manager: { deadline: '', note: '' },
        director:       { deadline: '', note: '' },
      };
      res.data.forEach((dl) => {
        updated[dl.role] = {
          deadline: dl.deadline ? dl.deadline.slice(0, 10) : '', // yyyy-mm-dd for <input type="date">
          note: dl.note || '',
        };
      });
      setDeadlines(res.data);
      setDeadlineForm(updated);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchSeniorManagers();
    fetchDirectors();
    fetchCategories();
  }, [fetchUsers, fetchSeniorManagers, fetchDirectors, fetchCategories]);

  useEffect(() => {
    if (tab === 'status') fetchStatus();
    if (tab === 'deadlines') fetchDeadlines();
  }, [tab, fetchStatus, fetchDeadlines]);

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  // ── User CRUD ──
  const openCreate = () => {
    setEditingUser(null);
    setFormData(EMPTY_USER);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      cwid: u.cwid || '',
      role: u.role,
      workgroup: u.workgroup || '',
      shift: u.shift || '',
      tower: u.tower || '',
      technologyGroup: u.technologyGroup || '',
      reportingManager: u.reportingManager?._id || '',
      reportingDirector: u.reportingDirector?._id || '',
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.shift) payload.shift = null;
      if (!payload.reportingManager) payload.reportingManager = null;

      if (editingUser) {
        await axios.put(`${API_BASE}/admin/users/${editingUser._id}`, payload);
        flash('User updated successfully');
      } else {
        await axios.post(`${API_BASE}/admin/users`, payload);
        flash('User created successfully');
      }
      setShowModal(false);
      fetchUsers();
      fetchSeniorManagers();
      fetchDirectors();
    } catch (err) {
      flash(err.response?.data?.message || 'Save failed', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE}/admin/users/${id}`);
      flash(`User "${name}" deleted`);
      fetchUsers();
    } catch (err) {
      flash(err.response?.data?.message || 'Delete failed', true);
    }
  };

  // ── Category ──
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setCatSaving(true);
    try {
      await axios.post(`${API_BASE}/admin/categories`, catForm);
      flash('Category added');
      setCatForm({ name: '', description: '', order: '' });
      fetchCategories();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed', true);
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/admin/categories/${id}`);
      flash('Category deleted');
      fetchCategories();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed', true);
    }
  };

  // ── Deadlines ──
  const handleSaveDeadline = async (e, role) => {
    e.preventDefault();
    if (!deadlineForm[role].deadline) {
      flash('Please enter a complete deadline date (DD / MM / YYYY)', true);
      return;
    }
    setDeadlineSaving(role);
    try {
      await axios.put(`${API_BASE}/admin/deadlines/${role}`, deadlineForm[role]);
      flash(`Deadline saved for ${DEADLINE_ROLES.find((r) => r.value === role)?.label}`);
      fetchDeadlines();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to save deadline', true);
    } finally {
      setDeadlineSaving(null);
    }
  };

  const handleDeleteDeadline = async (role) => {
    if (!window.confirm(`Remove deadline for ${DEADLINE_ROLES.find((r) => r.value === role)?.label}?`)) return;
    try {
      await axios.delete(`${API_BASE}/admin/deadlines/${role}`);
      flash('Deadline removed');
      fetchDeadlines();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed', true);
    }
  };

  const handleTestReminders = async () => {
    if (!window.confirm('This will trigger the reminder check right now and send emails to pending users whose deadline is today or in 2 days. Continue?')) return;
    setTestingReminders(true);
    try {
      await axios.post(`${API_BASE}/admin/deadlines/test-reminders`);
      flash('Reminder check triggered. Check server logs for details.');
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to trigger reminders', true);
    } finally {
      setTestingReminders(false);
    }
  };

  const f = (k) => (e) => setFormData({ ...formData, [k]: e.target.value });

  const roleLabel = (r) => r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Format a date string nicely for display
  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage users, categories, deadlines, and monitor submission status</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        {[
          ['users', '👥 Users'],
          ['categories', '🏷️ Categories'],
          ['deadlines', '📅 Deadlines'],
          ['status', '📊 Status Overview'],
        ].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <span className="card-title" style={{ margin: 0 }}>All Users ({users.length})</span>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add User</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tower</th>
                  <th>Workgroup</th>
                  <th>Shift</th>
                  <th>Reporting Manager</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                    No users yet. Click "Add User" to create one.
                  </td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id}>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td><span className="chip">{roleLabel(u.role)}</span></td>
                      <td>{u.tower || '—'}</td>
                      <td>{u.workgroup || '—'}</td>
                      <td>{u.shift || '—'}</td>
                      <td>{u.reportingManager?.name || '—'}</td>
                      <td>
                        {!u.passwordSet ? (
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12 }}>Awaiting signup</span>
                        ) : u.isActive ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>Active</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>Deactivated</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline-dark btn-sm" onClick={() => openEdit(u)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id, u.name)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ── */}
      {tab === 'categories' && (
        <div className="card">
          <p className="card-title">Award Categories</p>
          <p className="card-subtitle">These 6 categories are used for all nominations</p>

          <form onSubmit={handleAddCategory} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
            <p style={{ fontWeight: 700, margin: '0 0 12px', fontSize: 13, color: '#374151' }}>Add New Category</p>
            <div className="form-row">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Name</label>
                <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Category name" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Order</label>
                <input type="number" value={catForm.order} onChange={(e) => setCatForm({ ...catForm, order: e.target.value })} placeholder="1, 2, 3…" />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder="Brief description of this award" />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={catSaving}>
              {catSaving ? 'Adding…' : '+ Add Category'}
            </button>
          </form>

          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Description</th><th>Action</th></tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id}>
                    <td>{c.order}</td>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.description}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCategory(c._id, c.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                    Run the seed script to add default categories.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DEADLINES TAB ── */}
      {tab === 'deadlines' && (
        <>
          <div className="card" style={{ background: '#eff6ff', borderLeft: '4px solid #3b82f6', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1d4ed8', lineHeight: 1.6 }}>
              <strong>How email reminders work:</strong> Once a deadline is set for a role, the system automatically
              emails every user of that role who has <em>not yet submitted</em> — once <strong>2 days before</strong>
              the deadline and once <strong>on the day of the deadline</strong> (at 8 AM server time).
              Configure SMTP settings in <code>backend/.env</code> to enable emails.
            </p>
          </div>

          <div className="flex-between" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {deadlines.length} deadline(s) configured
            </span>
            <button
              className="btn btn-outline-dark btn-sm"
              onClick={handleTestReminders}
              disabled={testingReminders}
              title="Manually trigger the reminder check right now"
            >
              {testingReminders ? 'Checking…' : '🔔 Test Reminders Now'}
            </button>
          </div>

          {DEADLINE_ROLES.map(({ value: role, label }) => {
            const existing = deadlines.find((d) => d.role === role);
            const form = deadlineForm[role];
            const isSaving = deadlineSaving === role;

            return (
              <div key={role} className="card" style={{ marginBottom: 16 }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <p className="card-title" style={{ margin: 0 }}>
                    {label} Deadline
                  </p>
                  {existing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                        background: new Date(existing.deadline) >= new Date() ? '#dcfce7' : '#fef2f2',
                        color: new Date(existing.deadline) >= new Date() ? '#16a34a' : '#dc2626',
                      }}>
                        {new Date(existing.deadline) >= new Date() ? 'Active' : 'Expired'}
                      </span>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDeadline(role)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {existing && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Current deadline: </span>
                    <strong style={{ color: '#1e3a5f' }}>{fmtDate(existing.deadline)}</strong>
                    {existing.note && <span style={{ color: '#64748b' }}> · {existing.note}</span>}
                  </div>
                )}

                <form onSubmit={(e) => handleSaveDeadline(e, role)}>
                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>{existing ? 'Update Deadline Date' : 'Set Deadline Date'} *</label>
                      <DeadlineDateInput
                        value={form.deadline}
                        onChange={(val) => setDeadlineForm((prev) => ({
                          ...prev,
                          [role]: { ...prev[role], deadline: val },
                        }))}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Note (optional)</label>
                      <input
                        type="text"
                        value={form.note}
                        onChange={(e) => setDeadlineForm((prev) => ({
                          ...prev,
                          [role]: { ...prev[role], note: e.target.value },
                        }))}
                        placeholder="e.g. Q1 2025 nominations"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving} style={{ marginTop: 4 }}>
                    {isSaving ? 'Saving…' : (existing ? 'Update Deadline' : 'Set Deadline')}
                  </button>
                </form>
              </div>
            );
          })}
        </>
      )}

      {/* ── STATUS OVERVIEW TAB ── */}
      {tab === 'status' && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline-dark btn-sm" onClick={fetchStatus}>Refresh</button>
          </div>

          {loading && <div className="loading">Loading status…</div>}

          {statusData && (
            <>
              <div className="card">
                <p className="card-title">Managers — Submission Status</p>
                <div className="team-grid">
                  {statusData.managers.map((m) => (
                    <div key={m._id} className={`team-member-card ${m.status === 'submitted' ? 'complete' : 'pending'}`}>
                      <div className="team-member-name">{m.name}</div>
                      <div className="team-member-meta">
                        {[m.tower, m.workgroup, m.shift ? `Shift ${m.shift}` : null].filter(Boolean).join(' · ')}
                      </div>
                      {m.reportingManager && (
                        <div className="team-member-meta">Reports to: {m.reportingManager.name}</div>
                      )}
                      <div className="team-member-status">
                        <span className={`dot ${m.status === 'submitted' ? 'dot-green' : m.status === 'draft' ? 'dot-orange' : 'dot-grey'}`} />
                        {m.status === 'submitted' ? 'Submitted' : m.status === 'draft' ? 'Draft Saved' : 'Not Started'}
                      </div>
                    </div>
                  ))}
                  {statusData.managers.length === 0 && <p style={{ color: '#94a3b8' }}>No managers found</p>}
                </div>
              </div>

              <div className="card">
                <p className="card-title">Senior Managers — Submission Status</p>
                <div className="team-grid">
                  {statusData.seniorManagers.map((sm) => (
                    <div key={sm._id} className={`team-member-card ${sm.status === 'submitted' ? 'complete' : 'pending'}`}>
                      <div className="team-member-name">{sm.name}</div>
                      <div className="team-member-meta">{sm.tower}</div>
                      <div className="team-member-status">
                        <span className={`dot ${sm.status === 'submitted' ? 'dot-green' : 'dot-grey'}`} />
                        {sm.status === 'submitted' ? 'Submitted to Director' : 'Pending'}
                      </div>
                    </div>
                  ))}
                  {statusData.seniorManagers.length === 0 && <p style={{ color: '#94a3b8' }}>No senior managers found</p>}
                </div>
              </div>

              <div className="card">
                <p className="card-title">Directors — Action Status</p>
                <div className="team-grid">
                  {statusData.directors.map((d) => (
                    <div key={d._id} className={`team-member-card ${d.status === 'completed' ? 'complete' : 'pending'}`}>
                      <div className="team-member-name">{d.name}</div>
                      <div className="team-member-status">
                        <span className={`dot ${d.status === 'completed' ? 'dot-green' : 'dot-grey'}`} />
                        {d.status === 'completed' ? 'Action Taken' : 'Pending'}
                      </div>
                    </div>
                  ))}
                  {statusData.directors.length === 0 && <p style={{ color: '#94a3b8' }}>No directors found</p>}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── CREATE/EDIT USER MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingUser ? 'Edit User' : 'Add New User'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input value={formData.name} onChange={f('name')} placeholder="Full name" required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={formData.email} onChange={f('email')} placeholder="email@company.com" required />
                </div>
              </div>
              {!editingUser && (
                <div className="alert alert-info" style={{ marginBottom: 8 }}>
                  No password needed — the user will set their own password on the <strong>Sign Up</strong> page using this email.
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select value={formData.role} onChange={f('role')} required>
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </div>
                {/* Directors do not belong to a tower — hide the field for them */}
                {formData.role !== 'director' && (
                  <div className="form-group">
                    <label>Tower</label>
                    <input value={formData.tower} onChange={f('tower')} placeholder="e.g. Tower4" />
                  </div>
                )}
              </div>

              {formData.role === 'manager' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Workgroup</label>
                      <select value={formData.workgroup} onChange={f('workgroup')}>
                        <option value="">Select workgroup</option>
                        {WORKGROUPS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Shift</label>
                      <select value={formData.shift} onChange={f('shift')}>
                        <option value="">No shift</option>
                        {SHIFTS.map((s) => <option key={s} value={s}>Shift {s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Reporting Manager (Senior Manager)</label>
                    <select value={formData.reportingManager} onChange={f('reportingManager')}>
                      <option value="">— None —</option>
                      {seniorManagers.map((sm) => (
                        <option key={sm._id} value={sm._id}>{sm.name}{sm.tower ? ` (${sm.tower})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {formData.role === 'senior_manager' && (
                <div className="form-group">
                  <label>Reporting Director</label>
                  <select value={formData.reportingDirector} onChange={f('reportingDirector')}>
                    <option value="">— None —</option>
                    {directors.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}{d.technologyGroup ? ` (${d.technologyGroup})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.role === 'director' && (
                <div className="form-group">
                  <label>Technology Group</label>
                  <input value={formData.technologyGroup} onChange={f('technologyGroup')} placeholder="e.g. Enterprise, Wireless, CATC" />
                </div>
              )}

              {editingUser && (
                <div className="form-group">
                  <label>Active</label>
                  <select
                    value={formData.isActive === false ? 'false' : 'true'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Deactivated</option>
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline-dark" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : (editingUser ? 'Save Changes' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
