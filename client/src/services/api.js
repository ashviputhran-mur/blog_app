// API Client for CHRONICLE Blog Application

const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('chronicle_token') || localStorage.getItem('chronicle_admin_token') || '';
}

export function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('chronicle_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

export function saveAuthSession(token, user) {
  localStorage.setItem('chronicle_token', token);
  if (user?.role === 'admin') {
    localStorage.setItem('chronicle_admin_token', token);
  }
  localStorage.setItem('chronicle_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('chronicle_token');
  localStorage.removeItem('chronicle_admin_token');
  localStorage.removeItem('chronicle_user');
}

export function getAuthHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ==========================================
// PUBLIC API
// ==========================================

export async function fetchPosts(search = '', category = '', page = 1, limit = 24) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category && category !== 'All') params.append('category', category);
  params.append('page', page);
  params.append('limit', limit);

  const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch articles.');
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories.');
  return res.json();
}

export async function fetchPostBySlug(slug) {
  const headers = { ...getAuthHeader() };
  const res = await fetch(`${API_BASE}/posts/${slug}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to load article.');
  }
  return res.json();
}

export async function likePost(postId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to record like.');
  return res.json();
}

export async function fetchComments(postId) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments.');
  return res.json();
}

export async function submitComment(postId, { author_name, content }) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author_name, content })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit comment.');
  return data;
}

export async function submitReply(commentId, { author_name, content }) {
  const res = await fetch(`${API_BASE}/comments/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author_name, content })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit reply.');
  return data;
}

// ==========================================
// USER AUTHENTICATION & AUTHORING API
// ==========================================

export async function registerUser({ username, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed.');
  return data;
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Authentication failed.');
  return data;
}

// Backward compatible alias
export const adminLogin = loginUser;

export async function verifyCurrentSession() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Session invalid or expired.');
  return res.json();
}

export async function createPost(postData) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(postData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create article.');
  return data;
}

export async function updatePost(id, postData) {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(postData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update article.');
  return data;
}

export async function fetchMyPosts() {
  const res = await fetch(`${API_BASE}/user/my-posts`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch your articles.');
  return res.json();
}

// ==========================================
// ADMIN API
// ==========================================

export async function fetchAdminPosts() {
  const res = await fetch(`${API_BASE}/admin/posts`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch admin articles.');
  return res.json();
}

export async function createAdminPost(postData) {
  const res = await fetch(`${API_BASE}/admin/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(postData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create article.');
  return data;
}

export async function updateAdminPost(id, postData) {
  const res = await fetch(`${API_BASE}/admin/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(postData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update article.');
  return data;
}

export async function updateAdminPostStatus(id, status) {
  const res = await fetch(`${API_BASE}/admin/posts/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update status.');
  return data;
}

export async function archiveAdminPost(id) {
  const res = await fetch(`${API_BASE}/admin/posts/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to archive article.');
  return data;
}

export async function fetchAdminComments() {
  const res = await fetch(`${API_BASE}/admin/comments`, {
    headers: { ...getAuthHeader() }
  });
  if (!res.ok) throw new Error('Failed to fetch moderation discussions.');
  return res.json();
}

export async function editAdminComment(id, content) {
  const res = await fetch(`${API_BASE}/admin/comments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ content })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to edit comment.');
  return data;
}

export async function deleteAdminComment(id) {
  const res = await fetch(`${API_BASE}/admin/comments/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete comment.');
  return data;
}

export async function editAdminReply(id, content) {
  const res = await fetch(`${API_BASE}/admin/replies/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ content })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to edit reply.');
  return data;
}

export async function deleteAdminReply(id) {
  const res = await fetch(`${API_BASE}/admin/replies/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete reply.');
  return data;
}
