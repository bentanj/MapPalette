// Import function triggers from their respective submodules
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore'); // Modular import for Firestore

const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(); // Initialize Firestore

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json()); // Parse incoming JSON requests

// 1. Test GET request
app.get('/hello-world', (req, res) => {
  return res.status(200).send('Hello world!');
});

// 2. Create a post with auto-generated ID
app.post('/api/create', async (req, res) => {
  try {
    const postData = {
      title: req.body.title,
      description: req.body.description,
      waypoints: req.body.waypoints, // Array of waypoints
      userID: req.body.userID, // ID of the creator
      likeCount: 0,
      shareCount: 0,
      commentCount: 0,
      createdAt: FieldValue.serverTimestamp(), // Correct usage of serverTimestamp()
    };

    // Create a new document with an auto-generated ID
    const docRef = await db.collection('routes').add(postData);
    return res.status(201).json({ id: docRef.id, message: 'Post created successfully!' });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).send(error);
  }
});

// 3. Get a specific post by ID using a query parameter
app.get('/api/posts', async (req, res) => {
  const postID = req.query.id; // Retrieve ID from query parameter

  if (!postID) {
    return res.status(400).json({ message: 'Post ID is required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res.status(200).json(postSnap.data());
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).send(error);
  }
});

// 4. Update a post by ID using a query parameter
app.put('/api/posts', async (req, res) => {
  const postID = req.query.id; // Retrieve ID from query parameter

  if (!postID) {
    return res.status(400).json({ message: 'Post ID is required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);
    await postRef.update(req.body); // Update with new data

    return res.status(200).json({ message: 'Post updated successfully!' });
  } catch (error) {
    console.error('Error updating post:', error);
    return res.status(500).send(error);
  }
});

// 5. Delete a post by ID using a query parameter
app.delete('/api/posts', async (req, res) => {
  const postID = req.query.id; // Retrieve ID from query parameter

  if (!postID) {
    return res.status(400).json({ message: 'Post ID is required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);
    await postRef.delete();

    return res.status(200).json({ message: 'Post deleted successfully!' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).send(error);
  }
});


// Export the app to Firebase Cloud Functions
exports.app = onRequest(app);
