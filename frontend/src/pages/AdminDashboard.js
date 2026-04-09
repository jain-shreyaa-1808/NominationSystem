import React, { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    fetchUsers();
    fetchSeniorManagers();
    fetchDirectors();
    fetchCategories();
  }, [fetchUsers, fetchSeniorManagers, fetchDirectors, fetchCategories]);

  useEffect(() => {
    if (tab === 'status') fetchStatus();
  }, [tab, fetchStatus]);

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
      flash(`Category deleted`);
      fetchCategories();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed', true);
    }
  };

  const f = (k) => (e) => setFormData({ ...formData, [k]: e.target.value });

  const roleLabel = (r) => r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage users, categories, and monitor submission status</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        {[['users','👥 Users'], ['categories','🏷️ Categories'], ['status','📊 Status Overview']].map(([key, label]) => (
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
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12 }}>⏳ Awaiting signup</span>
                        ) : u.isActive ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>✓ Active</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>✗ Deactivated</span>
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

          {/* Add category form */}
          <form onSubmit={handleAddCategory} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
            <p style={{ fontWeight: 700, margin: '0 0 12px', fontSize: 13, color: '#374151' }}>Add New Category</p>
            <div className="form-row">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Name</label>
                <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Category name" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Order</label>
                <input type="number" value={catForm.order} onChange={e => setCatForm({...catForm, order: e.target.value})} placeholder="1, 2, 3…" />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} placeholder="Brief description of this award" />
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

      {/* ── STATUS OVERVIEW TAB ── */}
      {tab === 'status' && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline-dark btn-sm" onClick={fetchStatus}>↻ Refresh</button>
          </div>

          {loading && <div className="loading">Loading status…</div>}

          {statusData && (
            <>
              {/* Managers */}
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
                  {statusData.managers.length === 0 && (
                    <p style={{ color: '#94a3b8' }}>No managers found</p>
                  )}
                </div>
              </div>

              {/* Senior Managers */}
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
                  {statusData.seniorManagers.length === 0 && (
                    <p style={{ color: '#94a3b8' }}>No senior managers found</p>
                  )}
                </div>
              </div>

              {/* Directors */}
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
                  {statusData.directors.length === 0 && (
                    <p style={{ color: '#94a3b8' }}>No directors found</p>
                  )}
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
                    {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tower</label>
                  <input value={formData.tower} onChange={f('tower')} placeholder="e.g. Tower4" />
                </div>
              </div>
              {/* Manager fields */}
              {formData.role === 'manager' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Workgroup</label>
                      <select value={formData.workgroup} onChange={f('workgroup')}>
                        <option value="">Select workgroup</option>
                        {WORKGROUPS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Shift</label>
                      <select value={formData.shift} onChange={f('shift')}>
                        <option value="">No shift</option>
                        {SHIFTS.map(s => <option key={s} value={s}>Shift {s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Reporting Manager (Senior Manager)</label>
                    <select value={formData.reportingManager} onChange={f('reportingManager')}>
                      <option value="">— None —</option>
                      {seniorManagers.map(sm => (
                        <option key={sm._id} value={sm._id}>{sm.name}{sm.tower ? ` (${sm.tower})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Senior Manager fields */}
              {formData.role === 'senior_manager' && (
                <div className="form-group">
                  <label>Reporting Director</label>
                  <select value={formData.reportingDirector} onChange={f('reportingDirector')}>
                    <option value="">— None —</option>
                    {directors.map(d => (
                      <option key={d._id} value={d._id}>{d.name}{d.technologyGroup ? ` (${d.technologyGroup})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Director fields */}
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
