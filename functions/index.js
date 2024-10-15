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

// Initialise firestore
const db = getFirestore();

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json()); // Parse incoming JSON requests

// 
// TEST APIs
// 

// Test GET request
app.get('/hello-world', (req, res) => {
  return res.status(200).send('Hello world!');
});

// 
// ROUTE POSTS API
// CRUD operations for route posts
// 

// Create a post with auto-generated ID
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

// Get a specific post by ID
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

// Update a post by ID
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

// Delete a post by ID
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

// 
// POST LIKING API
// Increment and decerement functions for post by ID
// 


// Liking a post by ID
// NOTE: Firestore has a soft limit of 1 write per second to a single document
// Front-end developers should try to limit the time taken for each button click to be about 1 second
app.put('/api/posts/like', async (req, res) => {
  const postID = req.query.id; // Retrieve ID from query parameter

  if (!postID) {
    return res.status(400).json({ message: 'Post ID is required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);

    // Atomically increment the likeCount by 1
    await postRef.update({
      likeCount: FieldValue.increment(1),
    });

    return res.status(200).json({ message: 'Post liked successfully!' });
  } catch (error) {
    console.error('Error liking post:', error);
    return res.status(500).send(error);
  }
});

// Unliking a post by ID
// NOTE: Firestore has a soft limit of 1 write per second to a single document
// Front-end developers should try to limit the time taken for each button click to be about 1 second
app.put('/api/posts/unlike', async (req, res) => {
  const postID = req.query.id; // Retrieve ID from query parameter

  if (!postID) {
    return res.status(400).json({ message: 'Post ID is required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);

    // Atomically decrement the likeCount by 1
    await postRef.update({
      likeCount: FieldValue.increment(-1),
    });

    return res.status(200).json({ message: 'Post unliked successfully!' });
  } catch (error) {
    console.error('Error unliking post:', error);
    return res.status(500).send(error);
  }
});

// 
// POST COMMENTS API
// CRUD operations for comments of post by ID
// 

// Create a comment under a specific post and increment the comment count
app.post('/api/posts/:postId/comments', async (req, res) => {
  const postID = req.params.postId;
  const { userID, text } = req.body;

  if (!userID || !text) {
    return res.status(400).json({ message: 'UserID and comment text are required.' });
  }

  try {
    const commentData = {
      userID,
      text,
      createdAt: FieldValue.serverTimestamp(),
      likes: 0, // Initialise likes at 0
    };

    // Add the comment to the comments sub-collection
    const commentRef = await db.collection('routes').doc(postID).collection('comments').add(commentData);

    // Increment the commentCount field in the post document
    await db.collection('routes').doc(postID).update({
      commentCount: FieldValue.increment(1),
    });

    return res.status(201).json({ id: commentRef.id, message: 'Comment created successfully!' });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).send(error);
  }
});

// Get all comments by post ID
app.get('/api/posts/:postId/comments', async (req, res) => {
  const postID = req.params.postId;

  try {
    const commentsSnap = await db.collection('routes').doc(postID).collection('comments').orderBy('createdAt').get();

    if (commentsSnap.empty) {
      return res.status(404).json({ message: 'No comments found for this post.' });
    }

    const comments = commentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).send(error);
  }
});

// Update a comment by post ID
app.put('/api/posts/:postId/comments/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Updated comment text is required.' });
  }

  try {
    const commentRef = db.collection('routes').doc(postId).collection('comments').doc(commentId);
    await commentRef.update({ text });

    return res.status(200).json({ message: 'Comment updated successfully!' });
  } catch (error) {
    console.error('Error updating comment:', error);
    return res.status(500).send(error);
  }
});

// Delete a comment under a specific post and decrement the comment count
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;

  try {
    const commentRef = db.collection('routes').doc(postId).collection('comments').doc(commentId);

    // Check if the comment exists before deleting
    const commentSnap = await commentRef.get();
    if (!commentSnap.exists) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    // Delete the comment
    await commentRef.delete();

    // Decrement the commentCount field in the post document
    await db.collection('routes').doc(postId).update({
      commentCount: FieldValue.increment(-1),
    });

    return res.status(200).json({ message: 'Comment deleted successfully!' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).send(error);
  }
});


// 
// POST SHARING API
// Increment and decerement functions for post by ID
// NOTE: User can share the same post more than once, but will only be counted as one share.
// 

// Sharing a post by ID and userID (only once per user)
app.put('/api/posts/share', async (req, res) => {
  const postID = req.query.id;
  const { userID } = req.body; // User ID provided in the request body

  if (!postID || !userID) {
    return res.status(400).json({ message: 'Post ID and User ID are required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);
    const shareRef = postRef.collection('shares').doc(userID); // Track each user's share

    await db.runTransaction(async (transaction) => {
      const shareDoc = await transaction.get(shareRef);

      if (shareDoc.exists) {
        throw new Error('User has already shared this post.');
      }

      // Add the share and increment the shareCount atomically
      transaction.set(shareRef, { sharedAt: FieldValue.serverTimestamp() });
      transaction.update(postRef, {
        shareCount: FieldValue.increment(1),
      });
    });

    return res.status(200).json({ message: 'Post shared successfully!' });
  } catch (error) {
    console.error('Error sharing post:', error);
    return res.status(500).json({ message: error.message });
  }
});

// 
// FOLLOW USER API
// Follow or unfollow users
// 

// Follow user and increment follower count
app.post('/api/follow', async (req, res) => {
  const { userID, followUserID } = req.body;

  if (!userID || !followUserID) {
    return res.status(400).json({ message: 'Both userID and followUserID are required.' });
  }

  if (userID === followUserID) {
    return res.status(400).json({ message: 'You cannot follow yourself.' });
  }

  try {
    const followingRef = db.collection('users').doc(userID).collection('following').doc(followUserID);
    const followerRef = db.collection('users').doc(followUserID).collection('followers').doc(userID);
    const followedUserDoc = db.collection('users').doc(followUserID);

    await db.runTransaction(async (transaction) => {
      const followingSnap = await transaction.get(followingRef);
      if (followingSnap.exists) {
        throw new Error('Already following this user.');
      }

      // Add to following/followers and increment follower count
      transaction.set(followingRef, { followedAt: FieldValue.serverTimestamp() });
      transaction.set(followerRef, { followedAt: FieldValue.serverTimestamp() });
      transaction.update(followedUserDoc, {
        followerCount: FieldValue.increment(1),
      });
    });

    return res.status(200).json({ message: 'User followed successfully!' });
  } catch (error) {
    console.error('Error following user:', error);
    return res.status(500).send(error.message);
  }
});

// Unfollow user and decrement follower count
app.delete('/api/unfollow', async (req, res) => {
  const { userID, followUserID } = req.body;

  if (!userID || !followUserID) {
    return res.status(400).json({ message: 'Both userID and followUserID are required.' });
  }

  if (userID === followUserID) {
    return res.status(400).json({ message: 'You cannot unfollow yourself.' });
  }

  try {
    const followingRef = db.collection('users').doc(userID).collection('following').doc(followUserID);
    const followerRef = db.collection('users').doc(followUserID).collection('followers').doc(userID);
    const followedUserDoc = db.collection('users').doc(followUserID);

    await db.runTransaction(async (transaction) => {
      const followingSnap = await transaction.get(followingRef);
      if (!followingSnap.exists) {
        throw new Error('Not following this user.');
      }

      // Remove from following/followers and decrement follower count
      transaction.delete(followingRef);
      transaction.delete(followerRef);
      transaction.update(followedUserDoc, {
        followerCount: FieldValue.increment(-1),
      });
    });

    return res.status(200).json({ message: 'User unfollowed successfully!' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return res.status(500).send(error.message);
  }
});

// TODO APIs
// List of APIs that is needed.

// Search for user - Find a user's profile and posts using a query.
// Leaderboard and statistics - Find the top performing users (most created routes, liked, commented, shared) for a given q=duration. Duration can be day, week, month, year, all-time.
// Notifications - Send notifications to users for various events like new followers, post like, and comment.
// Social feed API - Fetch paginated posts for the user's feed, containing routes shared by followed users.

// APIS FOR CONSIDERATION
// List of APIs that might be helpful but might be too much for the scope of the project

// Achievements and Badges API  - User accumulated achievements and badges

// Export the app to Firebase Cloud Functions
exports.app = onRequest(app);
