const API = 'https://blog-platform-backend-x9h1.onrender.com';
let allPosts = [];
let currentPostId = null;
let editingPostId = null;

function getToken() { return localStorage.getItem('token'); }
function getUsername() { return localStorage.getItem('username'); }

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(`${page}-page`).style.display = 'block';
  if (page === 'home') fetchPosts();
  if (page === 'myposts') fetchMyPosts();
  if (page === 'write') resetWriteForm();
}

function showAuthTab(tab) {
  document.getElementById('login-tab').style.display    = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-tab').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const msg      = document.getElementById('register-msg');
  if (!username || !email || !password) {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'All fields required!';
    return;
  }
  try {
    const res = await fetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      msg.style.color = '#00b894';
      msg.textContent = 'Registered! Please login.';
      showAuthTab('login');
    } else {
      msg.style.color = '#ff6b6b';
      msg.textContent = data.message;
    }
  } catch {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Server error!';
  }
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const msg      = document.getElementById('login-msg');
  try {
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      updateNavbar();
      showPage('home');
    } else {
      msg.style.color = '#ff6b6b';
      msg.textContent = data.message;
    }
  } catch {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Server error!';
  }
}

function logout() {
  localStorage.clear();
  updateNavbar();
  showPage('home');
}

function updateNavbar() {
  const token = getToken();
  document.getElementById('logout-btn').style.display    = token ? 'block' : 'none';
  document.getElementById('login-nav-btn').style.display = token ? 'none' : 'block';
  document.getElementById('write-btn').style.display     = token ? 'block' : 'none';
  document.getElementById('my-posts-btn').style.display  = token ? 'block' : 'none';
  document.getElementById('nav-username').textContent    = token ? `Hi, ${getUsername()}!` : '';
}

async function fetchPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);
    allPosts = await res.json();
    renderPosts(allPosts);
  } catch {
    document.getElementById('posts-list').innerHTML = '<p class="empty-text">Could not load posts.</p>';
  }
}

function filterPosts() {
  const search   = document.getElementById('search-input').value.toLowerCase();
  const category = document.getElementById('category-filter').value;
  const filtered = allPosts.filter(p => {
    const matchSearch   = p.title.toLowerCase().includes(search) || p.content.toLowerCase().includes(search);
    const matchCategory = category === 'all' || p.category === category;
    return matchSearch && matchCategory;
  });
  renderPosts(filtered);
}

function renderPosts(posts) {
  const list = document.getElementById('posts-list');
  if (posts.length === 0) {
    list.innerHTML = '<p class="empty-text">No posts found!</p>';
    return;
  }
  list.innerHTML = posts.map(post => `
    <div class="post-card" onclick="openPost('${post.id}')">
      <div class="post-card-header">
        <p class="post-card-title">${post.title}</p>
        <span class="post-category">${post.category}</span>
      </div>
      ${post.tags ? `<div class="post-tags">${post.tags.split(',').map(t => `<span class="tag">#${t.trim()}</span>`).join('')}</div>` : ''}
      <p class="post-excerpt">${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
      <div class="post-card-footer">
        <p class="post-author">By <span>${post.username}</span></p>
        <p class="post-comments">💬 ${post.commentCount || 0} comments</p>
        <p class="post-date">${new Date(post.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  `).join('');
}

async function openPost(id) {
  currentPostId = id;
  showPage('post');
  try {
    const res  = await fetch(`${API}/api/posts/${id}`);
    const post = await res.json();
    const isOwner = getUsername() === post.username;

    document.getElementById('single-post').innerHTML = `
      <h1 class="single-post-title">${post.title}</h1>
      <div class="single-post-meta">
        <span>By <b>${post.username}</b></span>
        <span>${new Date(post.createdAt).toLocaleDateString()}</span>
        <span class="post-category">${post.category}</span>
        ${post.tags ? post.tags.split(',').map(t => `<span class="tag">#${t.trim()}</span>`).join('') : ''}
        ${isOwner ? `
          <div class="post-actions">
            <button class="edit-btn" onclick="editPost('${post.id}')">Edit</button>
            <button class="delete-btn" onclick="deletePost('${post.id}')">Delete</button>
          </div>` : ''}
      </div>
      <p class="single-post-content">${post.content}</p>
    `;

    if (getToken()) {
      document.getElementById('comment-form').style.display = 'block';
      document.getElementById('comment-login-msg').style.display = 'none';
    } else {
      document.getElementById('comment-form').style.display = 'none';
      document.getElementById('comment-login-msg').style.display = 'block';
    }

    renderComments(post.comments || []);
  } catch {
    document.getElementById('single-post').innerHTML = '<p class="empty-text">Could not load post.</p>';
  }
}

function renderComments(comments) {
  const list = document.getElementById('comments-list');
  if (comments.length === 0) {
    list.innerHTML = '<p class="empty-text">No comments yet. Be the first!</p>';
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-card">
      <div class="comment-header">
        <span class="comment-author">${c.username}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="comment-date">${new Date(c.createdAt).toLocaleDateString()}</span>
          ${getUsername() === c.username ? `<button class="comment-delete" onclick="deleteComment('${c.id}')">Delete</button>` : ''}
        </div>
      </div>
      <p class="comment-content">${c.content}</p>
    </div>
  `).join('');
}

async function addComment() {
  const content = document.getElementById('comment-input').value.trim();
  const msg     = document.getElementById('comment-msg');
  if (!content) {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Comment cannot be empty!';
    return;
  }
  try {
    const res = await fetch(`${API}/api/posts/${currentPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ content })
    });
    if (res.ok) {
      document.getElementById('comment-input').value = '';
      msg.style.color = '#00b894';
      msg.textContent = 'Comment added!';
      openPost(currentPostId);
    }
  } catch {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Error adding comment!';
  }
}

async function deleteComment(commentId) {
  try {
    await fetch(`${API}/api/posts/${currentPostId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    openPost(currentPostId);
  } catch {
    console.error('Error deleting comment');
  }
}

function resetWriteForm() {
  editingPostId = null;
  document.getElementById('write-title').textContent  = 'Write New Post';
  document.getElementById('post-title').value         = '';
  document.getElementById('post-content').value       = '';
  document.getElementById('post-tags').value          = '';
  document.getElementById('post-msg').textContent     = '';
}

async function submitPost() {
  const title    = document.getElementById('post-title').value.trim();
  const content  = document.getElementById('post-content').value.trim();
  const category = document.getElementById('post-category').value;
  const tags     = document.getElementById('post-tags').value.trim();
  const msg      = document.getElementById('post-msg');
  if (!title || !content) {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Title and content required!';
    return;
  }
  try {
    const url    = editingPostId ? `${API}/api/posts/${editingPostId}` : `${API}/api/posts`;
    const method = editingPostId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ title, content, category, tags })
    });
    const data = await res.json();
    if (res.ok) {
      msg.style.color = '#00b894';
      msg.textContent = editingPostId ? 'Post updated!' : 'Post published!';
      setTimeout(() => showPage('home'), 1000);
    } else {
      msg.style.color = '#ff6b6b';
      msg.textContent = data.message;
    }
  } catch {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Error saving post!';
  }
}

function editPost(id) {
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
  editingPostId = id;
  showPage('write');
  document.getElementById('write-title').textContent  = 'Edit Post';
  document.getElementById('post-title').value         = post.title;
  document.getElementById('post-content').value       = post.content;
  document.getElementById('post-tags').value          = post.tags || '';
  document.getElementById('post-category').value      = post.category;
}

async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    await fetch(`${API}/api/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    showPage('home');
  } catch {
    console.error('Error deleting post');
  }
}

async function fetchMyPosts() {
  try {
    const res   = await fetch(`${API}/api/posts`);
    const posts = await res.json();
    const mine  = posts.filter(p => p.username === getUsername());
    const list  = document.getElementById('my-posts-list');
    if (mine.length === 0) {
      list.innerHTML = '<p class="empty-text">You have not written any posts yet!</p>';
      return;
    }
    list.innerHTML = mine.map(post => `
      <div class="post-card">
        <div class="post-card-header">
          <p class="post-card-title" onclick="openPost('${post.id}')">${post.title}</p>
          <div class="post-actions">
            <button class="edit-btn" onclick="editPost('${post.id}')">Edit</button>
            <button class="delete-btn" onclick="deletePost('${post.id}')">Delete</button>
          </div>
        </div>
        <p class="post-excerpt">${post.content.substring(0, 150)}...</p>
        <div class="post-card-footer">
          <p class="post-date">${new Date(post.createdAt).toLocaleDateString()}</p>
          <p class="post-comments">💬 ${post.commentCount || 0} comments</p>
        </div>
      </div>
    `).join('');
  } catch {
    document.getElementById('my-posts-list').innerHTML = '<p class="empty-text">Could not load posts.</p>';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  showPage('home');
});