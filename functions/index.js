// Import function triggers from their respective submodules
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp, cert, applicationDefault} = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { getFirestore, FieldValue } = require('firebase-admin/firestore'); // Modular import for Firestore
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');

// These are used to store images in our backend later
const multer = require('multer');
const storage = multer.memoryStorage(); // Store file in memory before uploading to Cloud Storage
const upload = multer({ storage });


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

//
// HELPER FUNCTIONS
//

async function addPointsToCreator(userID, points) {
  try {
    const userRef = db.collection('leaderboard').doc(userID);
    await userRef.set(
      { points: FieldValue.increment(points) },
      { merge: true }
    );
  } catch (error) {
    console.error('Error adding points to creator:', error);
  }
}


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
// POSTS API
// CRUD operations for route posts
// 

// Create a post with auto-generated ID
app.post('/api/create/:userID', async (req, res) => {
  const { userID } = req.params; // Get userID from the URL parameters

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required to create a post.' });
  }

  try {
    // Create a new document reference with an auto-generated ID
    const docRef = db.collection('posts').doc();
    const postID = docRef.id; // Get the auto-generated ID to use as postID

    // Construct postData with userID as the first attribute
    const postData = {
      userID: userID,  // Place userID as the first attribute
      title: req.body.title,
      description: req.body.description,
      waypoints: req.body.waypoints,
      color: req.body.color,
      likeCount: 0,
      shareCount: 0,
      commentCount: 0,
      image: req.body.image,
      postID: postID,
      createdAt: FieldValue.serverTimestamp(),
      region: req.body.region,      // New attribute for region
      distance: req.body.distance   // New attribute for distance
    };

    // Set the document data in the posts collection using the auto-generated postID
    await docRef.set(postData);

    // Also, add the postID to the user's 'postsCreated' subcollection
    const userMapData = {
      title: postData.title,
      description: postData.description,
      postID: postData.postID,
      createdAt: postData.createdAt,
      region: postData.region,      // Include region in user's map data
      distance: postData.distance   // Include distance in user's map data
    };

    await db.collection('users').doc(userID).collection('postsCreated').doc(postID).set(userMapData);

    // Add points to user for creating the post
    await addPointsToCreator(userID, 10); // Adjust points as desired
    return res.status(201).json({ id: postID, message: 'Post created successfully!' });
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
    const postRef = db.collection('posts').doc(postID);
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
    const postRef = db.collection('posts').doc(postID);
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
    const postRef = db.collection('posts').doc(postID);
    await postRef.delete();

    return res.status(200).json({ message: 'Post deleted successfully!' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).send(error);
  }
});

// Get all postIDs within the collection "posts"
app.get('/api/postIDs', async (req, res) => {
  try {
    const postIDsSnap = await db.collection('posts').select('postID').get();
    const postIDs = postIDsSnap.docs.map(doc => doc.data().postID);
    return res.status(200).json(postIDs);
  } catch (error) {
    console.error('Error fetching map IDs:', error);
    return res.status(500).json({ message: 'Error fetching map IDs' });
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
    const postRef = db.collection('posts').doc(postID);
    const likeRef = postRef.collection('likes').doc(userID); // Track individual user's like

    await db.runTransaction(async (transaction) => {
      const likeDoc = await transaction.get(likeRef);

      if (likeDoc.exists) {
        throw new Error('User has already liked this post.');
      }

      // Add user's like and increment likeCount atomically
      transaction.set(likeRef, { likedAt: FieldValue.serverTimestamp() });

      // Add points to user for liking a post
      const postDoc = await postRef.get();
      if (postDoc.exists) {
        const creatorID = postDoc.data().userID;
        await addPointsToCreator(creatorID, 3); // Adjust points as desired
      }

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
    const postRef = db.collection('posts').doc(postID);
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
    const commentRef = await db.collection('posts').doc(postID).collection('comments').add(commentData);

    // Increment the commentCount field in the post document
    await db.collection('posts').doc(postID).update({
      commentCount: FieldValue.increment(1),
    });

    // Add points to user IF it's their FIRST comment
    const commentCheckRef = db.collection('posts').doc(postID).collection('commentPoints').doc(userID);
    const commentCheckDoc = await commentCheckRef.get();
    
    if (!commentCheckDoc.exists) {
      await addPointsToCreator(postData.userID, 2); // Adjust points as desired
      await commentCheckRef.set({ createdAt: FieldValue.serverTimestamp() }); // Record that points were awarded
    }

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
    const commentsSnap = await db.collection('posts').doc(postID).collection('comments').orderBy('createdAt').get();

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
    const commentRef = db.collection('posts').doc(postId).collection('comments').doc(commentId);
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
    const commentRef = db.collection('posts').doc(postId).collection('comments').doc(commentId);

    // Check if the comment exists before deleting
    const commentSnap = await commentRef.get();
    if (!commentSnap.exists) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    // Delete the comment
    await commentRef.delete();

    // Decrement the commentCount field in the post document
    await db.collection('posts').doc(postId).update({
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
    const postRef = db.collection('posts').doc(postID);
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

      // Add points for sharing a post
      const postDoc = await postRef.get();
      if (postDoc.exists) {
        const creatorID = postDoc.data().userID;
        await addPointsToCreator(creatorID, 2); // Adjust points as desired
      }

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

// Follow user and increment follower/following counts
app.post('/api/follow', async (req, res) => {
  // Extract userID (current user) from the request body and followUserID from the query parameter
  const { userID } = req.body; // Current user ID from the request body
  const followUserID = req.query.id; // Target user ID from the query parameter

  // Validate that both userID and followUserID are provided
  if (!userID || !followUserID) {
    return res.status(400).json({ message: 'Both userID and followUserID are required.' });
  }

  // Prevent users from following themselves
  if (userID === followUserID) {
    return res.status(400).json({ message: 'You cannot follow yourself.' });
  }

  try {
    // Define references for Firestore documents:
    // 1. Following subcollection for current user
    const followingRef = db.collection('users').doc(userID).collection('following').doc(followUserID);
    
    // 2. Followers subcollection for target user
    const followerRef = db.collection('users').doc(followUserID).collection('followers').doc(userID);
    
    // 3. Target user document to update follower count
    const followedUserDoc = db.collection('users').doc(followUserID);
    
    // 4. Current user document to update following count
    const followingUserDoc = db.collection('users').doc(userID);

    // Use Firestore transaction to ensure atomicity of the follow action
    await db.runTransaction(async (transaction) => {
      // Check if the current user is already following the target user
      const followingSnap = await transaction.get(followingRef);
      if (followingSnap.exists) {
        throw new Error('Already following this user.'); // Prevent duplicate following
      }

      // Add the follow relationship in both users' subcollections with a timestamp
      transaction.set(followingRef, { followedAt: FieldValue.serverTimestamp() });
      transaction.set(followerRef, { followedAt: FieldValue.serverTimestamp() });

      // Increment numFollowers for the target user
      transaction.update(followedUserDoc, {
        numFollowers: FieldValue.increment(1),
      });

      // Add points to user for following someone else
      await addPointsToCreator(followUserID, 5); // Adjust points as desired
      
      // Increment numFollowing for the current user
      transaction.update(followingUserDoc, {
        numFollowing: FieldValue.increment(1),
      });
    });



    // Return a success message if the transaction completes without errors
    return res.status(200).json({ message: 'User followed successfully!' });
  } catch (error) {
    console.error('Error following user:', error);
    return res.status(500).send(error.message); // Handle any errors during the follow process
  }
});



// Unfollow user and decrement follower/following counts
app.delete('/api/unfollow', async (req, res) => {
  // Extract userID (current user) from the request body and followUserID (target user) from the query parameter
  const { userID } = req.body; // Current user ID from the request body
  const followUserID = req.query.id; // Target user ID from the query parameter

  // Validate that both userID and followUserID are provided
  if (!userID || !followUserID) {
    return res.status(400).json({ message: 'Both userID and followUserID are required.' });
  }

  // Prevent users from unfollowing themselves
  if (userID === followUserID) {
    return res.status(400).json({ message: 'You cannot unfollow yourself.' });
  }

  try {
    // Define references for Firestore documents:
    // 1. Following subcollection for current user
    const followingRef = db.collection('users').doc(userID).collection('following').doc(followUserID);
    
    // 2. Followers subcollection for target user
    const followerRef = db.collection('users').doc(followUserID).collection('followers').doc(userID);
    
    // 3. Target user document to update follower count
    const followedUserDoc = db.collection('users').doc(followUserID);
    
    // 4. Current user document to update following count
    const followingUserDoc = db.collection('users').doc(userID);

    // Use Firestore transaction to ensure atomicity of the unfollow action
    await db.runTransaction(async (transaction) => {
      // Check if the current user is actually following the target user
      const followingSnap = await transaction.get(followingRef);
      if (!followingSnap.exists) {
        throw new Error('Not following this user.'); // Prevent errors if already unfollowed
      }

      // Remove the follow relationship in both users' subcollections
      transaction.delete(followingRef);
      transaction.delete(followerRef);

      // Decrement numFollowers for the target user
      transaction.update(followedUserDoc, {
        numFollowers: FieldValue.increment(-1),
      });

      // Decrement numFollowing for the current user
      transaction.update(followingUserDoc, {
        numFollowing: FieldValue.increment(-1),
      });
    });

    // Return a success message if the transaction completes without errors
    return res.status(200).json({ message: 'User unfollowed successfully!' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return res.status(500).send(error.message); // Handle any errors during the unfollow process
  }
});


//
// RETREIEVE USER API
// Getting all users based on certain parameters
//

// Get user object by userID
app.get('/api/:userID', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // Reference the user document in Firestore
    const userRef = db.collection('users').doc(userID);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return the user document data
    return res.status(200).json(userSnap.data());
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Error fetching user data.' });
  }
});

// Retrieve all users from the "users" collection along with their subcollections
app.get('/api/users/getallusers', async (req, res) => {
  try {
    // Fetch all documents from the users collection
    const usersSnap = await db.collection('users').get();

    // Map each document to an object containing its data and subcollections
    const users = await Promise.all(usersSnap.docs.map(async (doc) => {
      // Base user data
      const userData = { id: doc.id, ...doc.data() };

      // Fetch all subcollections for the current user
      const subcollections = {};
      const subcollectionRefs = await db.collection('users').doc(doc.id).listCollections();

      // Iterate over each subcollection, retrieving its data
      for (const subcollectionRef of subcollectionRefs) {
        const subcollectionDocs = await subcollectionRef.get();
        subcollections[subcollectionRef.id] = subcollectionDocs.docs.map(subDoc => ({
          id: subDoc.id,
          ...subDoc.data()
        }));
      }

      // Merge subcollections with the main user data
      return { ...userData, subcollections };
    }));

    // Respond with an array of all users, including their subcollections
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
});



// Get all posts made by a specific user
app.get('/api/users/:userID/posts', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // Access the postsCreated subcollection under the specified user document
    const postsCreatedRef = db.collection('users').doc(userID).collection('postsCreated');
    const postsCreatedSnap = await postsCreatedRef.get();

    if (postsCreatedSnap.empty) {
      return res.status(404).json({ message: 'No posts found for this user.' });
    }

    // Collect all postIDs from the user's postsCreated subcollection
    const postIDs = postsCreatedSnap.docs.map(doc => doc.id);

    // Retrieve each post's details from the main posts collection
    const postsPromises = postIDs.map(async (postID) => {
      const postRef = db.collection('posts').doc(postID);
      const postSnap = await postRef.get();
      return postSnap.exists ? { postID, ...postSnap.data() } : null;
    });

    // Wait for all post data to be fetched
    const posts = (await Promise.all(postsPromises)).filter(post => post !== null);

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return res.status(500).json({ message: 'Error fetching posts for this user.' });
  }
});


//
// UPDATE USER PROFILE API
//

// Update username for a specific user
app.put('/api/update/user/username/:userID', async (req, res) => {
  const { userID } = req.params; // Extract userID from the URL
  const { username } = req.body; // Extract new username from the request body

  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  try {
    // Reference the user document in Firestore
    const userRef = db.collection('users').doc(userID);
    
    // Update the username field
    await userRef.update({ username });

    return res.status(200).json({ message: 'Username updated successfully!' });
  } catch (error) {
    console.error('Error updating username:', error);
    return res.status(500).json({ message: 'Error updating username.' });
  }
});

// THESE IMPORTS ARE ALREADY PRESENT AT THE START OF INDEX.JS, JUST PUTTING HERE SO YOU KNOW THESE IMPORTS ARE FOR UPDATING USER PROFILE PICTURE
// const multer = require('multer');
// const storage = multer.memoryStorage(); // Store file in memory before uploading to Cloud Storage
// const upload = multer({ storage });


// Update user's profile picture with a URL that includes a token
app.put('/api/update/user/profilePicture/:userID', upload.single('profilePicture'), async (req, res) => {
  const { userID } = req.params;
  const { username } = req.body; // Retrieve the username from the request body

  if (!req.file || !username) {
    return res.status(400).json({ message: 'Profile picture file and username are required.' });
  }

  try {
    const fileType = req.file.mimetype.split('/')[1]; // Get file extension (e.g., jpg or png)
    const fileName = `profile_pictures/${userID}/${username}.${fileType}`; // Define the file path in Cloud Storage

    // Define the file reference in Firebase Storage
    const fileRef = bucket.file(fileName);

    // Upload the new profile picture file
    await fileRef.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    // Get the URL of the uploaded file with a token
    const newProfilePictureUrl = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'  // Arbitrary far future date
    });

    // Update the user's profilePicture field in Firestore with the URL containing the token
    const userRef = db.collection('users').doc(userID);
    await userRef.update({ profilePicture: newProfilePictureUrl[0] });

    return res.status(200).json({ message: 'Profile picture updated successfully!', profilePictureUrl: newProfilePictureUrl[0] });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return res.status(500).json({ message: 'Error updating profile picture.' });
  }
});

//
// LEADERBOARD API
//

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboardRef = db.collection('leaderboard').orderBy('points', 'desc');
    const snapshot = await leaderboardRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No leaderboard data found.' });
    }

    // Fetch leaderboard data along with `username` and `profilePicture`
    const leaderboard = await Promise.all(snapshot.docs.map(async (doc) => {
      const userID = doc.id;
      const userDoc = await db.collection('users').doc(userID).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        return {
          userID,
          points: doc.data().points,
          username: userData.username || null,
          profilePicture: userData.profilePicture || null
        };
      } else {
        return {
          userID,
          points: doc.data().points,
          username: null,
          profilePicture: null
        };
      }
    }));
    
    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ message: 'Error fetching leaderboard data.' });
  }
});

exports.resetLeaderboard = pubsub.schedule('59 23 * * 0').onRun(async (context) => {
  try {
    const leaderboardRef = db.collection('leaderboard');
    const snapshot = await leaderboardRef.get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { points: 0 });
    });

    await batch.commit();
    console.log('Leaderboard reset successfully');
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
  }
});


// TODO APIs
// List of APIs that is needed.

// Search for user - Find a user's profile and posts using a query.
// Leaderboard and statistics - Find the top performing users (most created posts, liked, commented, shared) for a given q=duration. Duration can be day, week, month, year, all-time.
// Notifications - Send notifications to users for various events like new followers, post like, and comment.
// Social feed API - Fetch paginated posts for the user's feed, containing posts shared by followed users.

// APIS FOR CONSIDERATION
// List of APIs that might be helpful but might be too much for the scope of the project

// Achievements and Badges API  - User accumulated achievements and badges

// Export the app to Firebase Cloud Functions
exports.app = onRequest(app);
