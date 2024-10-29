// Import function triggers from their respective submodules
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp, cert, applicationDefault} = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { getFirestore, FieldValue } = require('firebase-admin/firestore'); // Modular import for Firestore
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'gs://mappalette-9e0bd.appspot.com'
});

// Initialise firestore
const db = getFirestore();
const bucket = getStorage().bucket();

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json()); // Parse incoming JSON requests

// Cloud Function to return the Google Maps API key
// exports.getGoogleMapsApiKey = functions.https.onRequest((req, res) => {
//   const apiKey = functions.config().googlemaps.apikey;
//   res.json({ apiKey });
// });

// Define route to return Google Maps API key with CORS enabled
app.get('/getGoogleMapsApiKey', (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return res.status(200).json({ apiKey });
});

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
    // Create a new document reference with an auto-generated ID
    const docRef = db.collection('routes').doc();
    const mapID = docRef.id; // Get the auto-generated ID to use as mapID

    const postData = {
      title: req.body.title,
      description: req.body.description,
      waypoints: req.body.waypoints,
      userID: req.body.userID, 
      color: req.body.color,
      likeCount: 0,
      shareCount: 0,
      commentCount: 0,
      image: req.body.image,
      mapID: mapID,
      createdAt: FieldValue.serverTimestamp(),
      region: req.body.region,      // New attribute for region
      distance: req.body.distance   // New attribute for distance
    };

    // Set the document data in the routes collection using the auto-generated mapID
    await docRef.set(postData);

    // Also, add the mapID to the user's 'mapsCreated' subcollection
    const userMapData = {
      title: postData.title,
      description: postData.description,
      mapID: postData.mapID,
      createdAt: postData.createdAt,
      region: postData.region,      // Include region in user's map data
      distance: postData.distance   // Include distance in user's map data
    };

    await db.collection('users').doc(req.body.userID).collection('mapsCreated').doc(mapID).set(userMapData);

    return res.status(201).json({ id: mapID, message: 'Post created successfully!' });
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


// LIKE a post by ID (only once per user)
app.put('/api/posts/like', async (req, res) => {
  const postID = req.query.id;
  const { userID } = req.body; // User ID should be in the request body

  if (!postID || !userID) {
    return res.status(400).json({ message: 'Post ID and User ID are required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);
    const likeRef = postRef.collection('likes').doc(userID); // Track individual user's like

    await db.runTransaction(async (transaction) => {
      const likeDoc = await transaction.get(likeRef);

      if (likeDoc.exists) {
        throw new Error('User has already liked this post.');
      }

      // Add user's like and increment likeCount atomically
      transaction.set(likeRef, { likedAt: FieldValue.serverTimestamp() });
      transaction.update(postRef, {
        likeCount: FieldValue.increment(1),
      });
    });

    return res.status(200).json({ message: 'Post liked successfully!' });
  } catch (error) {
    console.error('Error liking post:', error);
    return res.status(500).json({ message: error.message });
  }
});

// UNLIKE a post by ID (only if user previously liked)
app.put('/api/posts/unlike', async (req, res) => {
  const postID = req.query.id;
  const { userID } = req.body; // User ID should be in the request body

  if (!postID || !userID) {
    return res.status(400).json({ message: 'Post ID and User ID are required.' });
  }

  try {
    const postRef = db.collection('routes').doc(postID);
    const likeRef = postRef.collection('likes').doc(userID); // Track individual user's like

    await db.runTransaction(async (transaction) => {
      const likeDoc = await transaction.get(likeRef);

      if (!likeDoc.exists) {
        throw new Error('User has not liked this post yet.');
      }

      // Remove user's like and decrement likeCount atomically
      transaction.delete(likeRef);
      transaction.update(postRef, {
        likeCount: FieldValue.increment(-1),
      });
    });

    return res.status(200).json({ message: 'Post unliked successfully!' });
  } catch (error) {
    console.error('Error unliking post:', error);
    return res.status(500).json({ message: error.message });
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

// Get all user IDs that a specific userID is following
app.get('/api/users/:userID/following', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    const followingRef = db.collection('users').doc(userID).collection('following');
    const followingSnap = await followingRef.get();

    if (followingSnap.empty) {
      return res.status(404).json({ message: 'No following records found for this user.' });
    }

    // Map the documents to an array of followed user IDs
    const followingIDs = followingSnap.docs.map(doc => doc.id);

    return res.status(200).json({ following: followingIDs });
  } catch (error) {
    console.error('Error fetching following data:', error);
    return res.status(500).send(error.message);
  }
});

// Get all mapIDs related to a specific userID
app.get('/api/users/:userID/maps', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // Access the mapsCreated subcollection under the specified user document
    const mapsCreatedRef = db.collection('users').doc(userID).collection('mapsCreated');
    const mapsSnap = await mapsCreatedRef.get();

    if (mapsSnap.empty) {
      return res.status(404).json({ message: 'No maps created found for this user.' });
    }

    // Map the documents to an array of map data, such as mapID, title, and createdAt
    const maps = mapsSnap.docs.map(doc => ({
      mapID: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({ maps });
  } catch (error) {
    console.error('Error fetching maps for user:', error);
    return res.status(500).send(error.message);
  }
});

// Get all mapIds within the collection "routes"
app.get('/api/mapIDs', async (req, res) => {
  try {
    const mapIDsSnap = await db.collection('routes').select('mapID').get();
    const mapIDs = mapIDsSnap.docs.map(doc => doc.data().mapID);
    return res.status(200).json(mapIDs);
  } catch (error) {
    console.error('Error fetching map IDs:', error);
    return res.status(500).json({ message: 'Error fetching map IDs' });
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
