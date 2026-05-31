const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const JWT_SECRET = 'blog_secret_123';

let users = [];
let posts = [];
let comments = [];

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const existing = users.find(u => u.email === email);
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = { id: Date.now().toString(), username, email, password: hashed, createdAt: new Date() };
    users.push(user);
    res.status(201).json({ message: 'Registered successfully' });
  } catch {
    res.status(500).json({ message: 'Error registering' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Wrong password' });
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/api/posts', (req, res) => {
  const postsWithComments = posts.map(post => ({
    ...post,
    comments: comments.filter(c => c.postId === post.id),
    commentCount: comments.filter(c => c.postId === post.id).length
  }));
  res.json(postsWithComments.reverse());
});

app.get('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  const postComments = comments.filter(c => c.postId === post.id);
  res.json({ ...post, comments: postComments });
});

app.post('/api/posts', auth, (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content required' });
    const post = {
      id: Date.now().toString(),
      title,
      content,
      category: category || 'general',
      tags: tags || '',
      userId: req.user.userId,
      username: req.user.username,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    posts.push(post);
    res.status(201).json({ message: 'Post created!', post });
  } catch {
    res.status(500).json({ message: 'Error creating post' });
  }
});

app.put('/api/posts/:id', auth, (req, res) => {
  try {
    const index = posts.findIndex(p => p.id === req.params.id && p.userId === req.user.userId);
    if (index === -1) return res.status(404).json({ message: 'Post not found or unauthorized' });
    posts[index] = { ...posts[index], ...req.body, updatedAt: new Date() };
    res.json({ message: 'Post updated!', post: posts[index] });
  } catch {
    res.status(500).json({ message: 'Error updating post' });
  }
});

app.delete('/api/posts/:id', auth, (req, res) => {
  try {
    const post = posts.find(p => p.id === req.params.id && p.userId === req.user.userId);
    if (!post) return res.status(404).json({ message: 'Post not found or unauthorized' });
    posts = posts.filter(p => p.id !== req.params.id);
    comments = comments.filter(c => c.postId !== req.params.id);
    res.json({ message: 'Post deleted!' });
  } catch {
    res.status(500).json({ message: 'Error deleting post' });
  }
});

app.get('/api/posts/:id/comments', (req, res) => {
  const postComments = comments.filter(c => c.postId === req.params.id);
  res.json(postComments);
});

app.post('/api/posts/:id/comments', auth, (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Comment cannot be empty' });
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const comment = {
      id: Date.now().toString(),
      postId: req.params.id,
      content,
      userId: req.user.userId,
      username: req.user.username,
      createdAt: new Date()
    };
    comments.push(comment);
    res.status(201).json({ message: 'Comment added!', comment });
  } catch {
    res.status(500).json({ message: 'Error adding comment' });
  }
});

app.delete('/api/posts/:postId/comments/:commentId', auth, (req, res) => {
  try {
    const comment = comments.find(c => c.id === req.params.commentId && c.userId === req.user.userId);
    if (!comment) return res.status(404).json({ message: 'Comment not found or unauthorized' });
    comments = comments.filter(c => c.id !== req.params.commentId);
    res.json({ message: 'Comment deleted!' });
  } catch {
    res.status(500).json({ message: 'Error deleting comment' });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));