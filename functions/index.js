// Import function triggers from their respective submodules
const { onRequest } = require('firebase-functions/v2/https');
// const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp, cert, applicationDefault} = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { getFirestore, FieldValue } = require('firebase-admin/firestore'); // Modular import for Firestore
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { getAuth } = require('firebase-admin/auth'); // Add this to import Firebase Auth

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


/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */


// Helper function to add points to the leaderboard
async function addPointsToCreator(userID, points) {
  try {
    const userRef = db.collection('leaderboard').doc(userID);

    // Use set with merge to update or create a document with both userID and points
    await userRef.set(
      {
        userID: userID,           // Store the userID within the document
        points: FieldValue.increment(points),
      },
      { merge: true }            // Merge to ensure we don’t overwrite existing fields
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

/* -------------------------------------------------------------------------- */
/*                               POSTS CRUD API                               */
/* -------------------------------------------------------------------------- */

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

// Get specific post by id
app.get('/api/posts', async (req, res) => {
  const postID = req.query.id;

  if (!postID) {
    return res.status(400).json({ message: 'Post ID is required.' });
  }

  try {
    const postRef = db.collection('posts').doc(postID);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Get post data
    const postData = postSnap.data();
    
    // Fetch user details
    const userRef = db.collection('users').doc(postData.userID);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.log(`User not found for userID: ${postData.userID}`);
      return res.status(404).json({ message: 'User not available' });
    }

    const userData = userSnap.data();
    
    // Add username and profile picture to the post data
    const postWithUserData = {
      ...postData,
      username: userData.username || 'Unknown User',
      profilePicture: userData.profilePicture || 'default-profile-picture-url'
    };

    // Fetch the list of users who liked this post
    const likesSnap = await postRef.collection('likes').get();
    const likedUsers = likesSnap.docs.map(doc => doc.id); // Collect user IDs of those who liked the post

    // Add the liked users to the response
    postWithUserData.likedBy = likedUsers;
    
    return res.status(200).json(postWithUserData);
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ message: 'Error fetching post data.' });
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


 /* -------------------------------------------------------------------------- */
 /*                             POST RETRIEVAL API                             */
 /* -------------------------------------------------------------------------- */

// Retrieve all posts from the posts collection and include username and profile picture
app.get('/api/allposts', async (req, res) => {
  const { userID: currentUserID } = req.query; // Assume userID of the current user is passed as a query parameter
  
  if (!currentUserID) {
    return res.status(400).json({ message: 'User ID of the current user is required.' });
  }

  try {
    const postsSnap = await db.collection('posts').get();

    if (postsSnap.empty) {
      return res.status(404).json({ message: 'No posts found.' });
    }

    const posts = await Promise.all(postsSnap.docs.map(async (doc) => {
      const postData = { id: doc.id, ...doc.data() };
      const userID = postData.userID;

      // Fetch user details for each post
      const userRef = db.collection('users').doc(userID);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : { username: 'Unknown User', profilePicture: 'default-profile-picture-url' };

      // Exclude posts if the user has `isPostPrivate` set to true, except if the post belongs to the current user
      if (userData && userData.isPostPrivate && userID !== currentUserID) return undefined;

      // Fetch the list of users who liked this post
      const likesSnap = await doc.ref.collection('likes').get();
      const likedUsers = likesSnap.docs.map(likeDoc => likeDoc.id);

      return {
        ...postData,
        username: userData.username || 'Unknown User',
        profilePicture: userData.profilePicture || 'default-profile-picture-url',
        likedBy: likedUsers,
      };
    }));

    const filteredPosts = posts.filter(post => post !== undefined && post !== null);
    return res.status(200).json(filteredPosts);
  } catch (error) {
    console.error('Error fetching all posts:', error);
    return res.status(500).json({ message: 'Error fetching posts.' });
  }
});

// Retrieve all posts made by users that the current user follows, including the user's own posts
app.get('/api/allposts/user/:userID', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // Step 1: Retrieve the list of user IDs that `userID` is following
    const followingSnap = await db.collection('users').doc(userID).collection('following').get();
    const followedUserIDs = followingSnap.docs.map(doc => doc.id);

    // Include the current user's own posts by adding their ID to the followedUserIDs array
    followedUserIDs.push(userID);

    // Step 2: Retrieve all posts from the main "posts" collection where userID matches any of the followedUserIDs
    const postsSnap = await db.collection('posts').where('userID', 'in', followedUserIDs).get();

    if (postsSnap.empty) {
      return res.status(404).json({ message: 'No posts found for this user or their followed users.' });
    }

    // Step 3: Map through each post document, fetch user data, and return post data with additional user info
    const postsWithUserData = await Promise.all(
      postsSnap.docs.map(async (doc) => {
        const postData = { id: doc.id, ...doc.data() };
        const userRef = db.collection('users').doc(postData.userID);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : { username: 'Unknown User', profilePicture: 'default-profile-picture-url' };

        // Fetch the list of users who liked this post
        const likesSnap = await doc.ref.collection('likes').get();
        const likedUsers = likesSnap.docs.map(likeDoc => likeDoc.id);

        return {
          ...postData,
          username: userData.username || 'Unknown User',
          profilePicture: userData.profilePicture || 'default-profile-picture-url',
          likedBy: likedUsers
        };
      })
    );

    // Sort the posts by `createdAt` in descending order
    postsWithUserData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

    console.log('Posts found:', postsWithUserData.length);
    return res.status(200).json(postsWithUserData);
  } catch (error) {
    console.error('Error fetching followed users posts:', error.message, error.stack);
    return res.status(500).json({ message: `Error fetching posts: ${error.message}` });
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

      // Deduct points from the post creator
      const postDoc = await postRef.get();
      if (postDoc.exists) {
        const creatorID = postDoc.data().userID;
        await addPointsToCreator(creatorID, -3); // Deduct points as desired, e.g., -3
      }
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
      await addPointsToCreator(userID, 2); // Adjust points as desired
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

    // Check if there are no comments, and return an empty array if true
    if (commentsSnap.empty) {
      return res.status(200).json([]); // Return an empty array for no comments
    }

    // Map through comments if they exist
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

// Delete a post by ID, remove from user's postsCreated subcollection, and delete all subcollections of the post
app.delete('/api/posts', async (req, res) => {
  const postID = req.query.id; // Retrieve ID from query parameter

  if (!postID) {
    return res.status(400).json({ message: 'Post ID is required.' });
  }

  try {
    // Step 1: Retrieve the post document to get the userID
    const postRef = db.collection('posts').doc(postID);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const { userID } = postSnap.data(); // Extract userID from post data

    // Step 2: Delete all subcollections of the post document
    const subcollections = await postRef.listCollections();
    const batch = db.batch(); // Use batch for atomic deletions

    for (const subcollection of subcollections) {
      const docs = await subcollection.get();
      docs.forEach((doc) => {
        batch.delete(doc.ref); // Add each document in the subcollection to the batch
      });
    }
    await batch.commit(); // Commit all subcollection deletions

    // Step 3: Delete the post from the main posts collection
    await postRef.delete();

    // Step 4: Delete the post from the user's postsCreated subcollection
    const userPostRef = db.collection('users').doc(userID).collection('postsCreated').doc(postID);
    await userPostRef.delete();

    return res.status(200).json({ message: 'Post deleted from posts collection, user\'s postsCreated subcollection, and all its subcollections successfully!' });
  } catch (error) {
    console.error('Error deleting post and subcollections:', error);
    return res.status(500).json({ message: 'Error deleting post and its subcollections.' });
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

// Retrieve all users from the "users" collection with subcollections as separate attributes
app.get('/api/users/getallusers', async (req, res) => {
  try {
    // Fetch all documents from the users collection
    const usersSnap = await db.collection('users').get();

    // Map each document to an object containing its data and individual subcollections as separate attributes
    const users = await Promise.all(usersSnap.docs.map(async (doc) => {
      // Base user data
      const userData = { id: doc.id, ...doc.data() };

      if (userData.isProfilePrivate) return undefined;

      // Fetch all subcollections for the current user and add each as its own attribute in userData
      const subcollectionRefs = await db.collection('users').doc(doc.id).listCollections();

      for (const subcollectionRef of subcollectionRefs) {
        const subcollectionDocs = await subcollectionRef.get();
        userData[subcollectionRef.id] = subcollectionDocs.docs.map(subDoc => ({
          id: subDoc.id,
          ...subDoc.data()
        }));
      }

      return userData;
    }));

    // Filter out undefined results before sending the response
    const filteredUsers = users.filter(user => user !== undefined);
    return res.status(200).json(filteredUsers);
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get all user objects followers by the current user
app.get('/api/users/getfollowers/:userID', async (req, res) => {
  const { userID } = req.params;
  
  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  } 

  try {
    // Reference the 'followers' subcollection under the current user
    const followersSnap = await db.collection('users').doc(userID).collection('followers').get();

    if (followersSnap.empty) {
      return res.status(404).json({ message: 'No followers users found for this user.' });
    }

    // Collect all followers user IDs
    const followersUserIDs = followersSnap.docs.map(doc => doc.id);

    // Fetch user data for each followers user ID from the main "users" collection
    const followersUsersPromises = followersUserIDs.map(async (followersUserID) => {
      const userDoc = await db.collection('users').doc(followersUserID).get();
      return userDoc.exists ? { userID: followersUserID, ...userDoc.data() } : null;
    });

    // Wait for all followers user data to be fetched
    const followersUsers = (await Promise.all(followersUsersPromises)).filter(user => user !== null);

    return res.status(200).json(followersUsers);
  } catch (error) {
    console.error('Error fetching followers users:', error);
    return res.status(500).json({ message: 'Error fetching followers users.' });
  }
});

// Get all user objects that the current user is following
app.get('/api/users/following/:userID', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // Reference the 'following' subcollection under the current user
    const followingSnap = await db.collection('users').doc(userID).collection('following').get();

    if (followingSnap.empty) {
      return res.status(404).json({ message: 'No following users found for this user.' });
    }

    // Collect all following user IDs
    const followingUserIDs = followingSnap.docs.map(doc => doc.id);

    // Fetch user data for each following user ID from the main "users" collection
    const followingUsersPromises = followingUserIDs.map(async (followingUserID) => {
      const userDoc = await db.collection('users').doc(followingUserID).get();
      return userDoc.exists ? { userID: followingUserID, ...userDoc.data() } : null;
    });

    // Wait for all following user data to be fetched
    const followingUsers = (await Promise.all(followingUsersPromises)).filter(user => user !== null);

    return res.status(200).json(followingUsers);
  } catch (error) {
    console.error('Error fetching following users:', error);
    return res.status(500).json({ message: 'Error fetching following users.' });
  }
});

// Retrieve condensed user data with an isFollowing flag for each user
app.get('/api/users/getcondensed/:currentUserID', async (req, res) => {
  const { currentUserID } = req.params;

  if (!currentUserID) {
    return res.status(400).json({ message: 'Current user ID is required.' });
  }

  try {
    const usersSnap = await db.collection('users').get();

    // Get all user IDs that the current user is following
    const followingSnap = await db.collection('users').doc(currentUserID).collection('following').get();
    const followingIDs = followingSnap.docs.map(doc => doc.id);

    const condensedUsers = usersSnap.docs.map(doc => {
      const userData = doc.data();
      const isFollowing = followingIDs.includes(doc.id);

      // Only return private users if the current user is following them
      if (userData.isProfilePrivate && !isFollowing) return undefined;

      return {
        userID: doc.id,
        username: userData.username || null,
        profilePicture: userData.profilePicture || null,
        isFollowing: isFollowing
      };
    });

    const filteredCondensedUsers = condensedUsers.filter(user => user !== undefined);
    return res.status(200).json(filteredCondensedUsers);
  } catch (error) {
    console.error('Error fetching condensed user data:', error);
    return res.status(500).json({ message: 'Error fetching condensed user data.' });
  }
});


// Get all post made by specific user
app.get('/api/users/:userID/posts', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // Fetch user's username and profile picture
    const userRef = db.collection('users').doc(userID);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { username, profilePicture } = userSnap.data();

    // Fetch user's posts
    const postsCreatedSnap = await db.collection('users').doc(userID).collection('postsCreated').get();
    if (postsCreatedSnap.empty) {
      return res.status(404).json({ message: 'No posts found for this user.' });
    }

    const posts = await Promise.all(
      postsCreatedSnap.docs.map(async (doc) => {
        const postRef = db.collection('posts').doc(doc.id);
        const postSnap = await postRef.get();
        // Fetch the list of users who liked this post
        const likesSnap = await postRef.collection('likes').get();
        const likedUsers = likesSnap.docs.map(likeDoc => likeDoc.id);
        return postSnap.exists
          ? {
              ...postSnap.data(),
              username,
              profilePicture,
              likedBy: likedUsers
            }
          : null;
      })
    );

    return res.status(200).json(posts.filter((post) => post !== null));
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return res.status(500).json({ message: 'Error fetching posts for this user.' });
  }
});


//
// UPDATE USER PROFILE APIs
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


// Update user's profile picture with a URL and delete any existing profile picture in Cloud Storage
app.put('/api/update/user/profilePicture/:userID', async (req, res) => {
  const { userID } = req.params;
  const { profilePicture } = req.body; // New profile picture URL

  if (!profilePicture) {
    return res.status(400).json({ message: 'Profile picture URL is required.' });
  }

  try {
    // Reference the user document in Firestore
    const userRef = db.collection('users').doc(userID);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Get existing profile picture URL, if any
    const existingProfilePicture = userSnap.data().profilePicture;

    // Delete the existing profile picture file if a URL is present
    if (existingProfilePicture && existingProfilePicture !== profilePicture) {
      const fileName = existingProfilePicture.split('/').pop(); // Extract file name from URL
      const file = bucket.file(fileName);

      try {
        await file.delete(); // Delete the file from Cloud Storage
        console.log('Previous profile picture deleted successfully.');
      } catch (error) {
        console.error('Error deleting previous profile picture:', error);
      }
    }

    // Update Firestore with the new profile picture URL
    await userRef.update({ profilePicture });

    return res.status(200).json({ message: 'Profile picture updated and previous one deleted successfully!' });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return res.status(500).json({ message: 'Error updating profile picture.' });
  }
});


// Get leaderboard data
app.get('/api/challenge/leaderboard', async (req, res) => {
  try {
    // Fetch all entries from the leaderboard collection
    const leaderboardSnap = await db.collection('leaderboard').get();

    if (leaderboardSnap.empty) {
      return res.status(404).json({ message: 'Leaderboard is empty.' });
    }

    // Map through leaderboard entries and fetch additional user details
    const leaderboard = await Promise.all(
      leaderboardSnap.docs.map(async (doc) => {
        const leaderboardData = doc.data();
        const { userID, points } = leaderboardData;

        // Fetch the user's profile data
        const userRef = db.collection('users').doc(userID);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          return null; // Exclude users that don't exist
        }

        const userData = userSnap.data();

        // Exclude users with isProfilePrivate set to true
        if (userData.isProfilePrivate) {
          return null;
        }

        // Set default profile picture if none is found
        const profilePicture = userData.profilePicture || '/resources/default-profile.png';

        // Return leaderboard data along with user details
        return {
          userID,
          points,
          username: userData.username || 'Unknown User',
          profilePicture: profilePicture,
        };
      })
    );

    // Filter out any null values (for users that are private or don't exist)
    const filteredLeaderboard = leaderboard.filter(entry => entry !== null);

    return res.status(200).json(filteredLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ message: 'Error fetching leaderboard.' });
  }
});

// Get all liked posts for a specific user
app.get('/api/users/:userID/likedPosts', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    // Reference all posts
    const postsSnap = await db.collection('posts').get();

    if (postsSnap.empty) {
      return res.status(404).json({ message: 'No posts found.' });
    }

    const likedPosts = [];

    // Iterate through each post and check if the user has liked it
    await Promise.all(postsSnap.docs.map(async (postDoc) => {
      const likeSnap = await postDoc.ref.collection('likes').doc(userID).get();
      if (likeSnap.exists) {
        likedPosts.push(postDoc.id); // Store the postID if liked by the user
      }
    }));

    // Return the list of liked post IDs
    return res.status(200).json({ likedPostIDs: likedPosts });
  } catch (error) {
    console.error('Error fetching liked posts:', error);
    return res.status(500).json({ message: 'Error fetching liked posts.' });
  }
});

// Update privacy settings for a user
app.put('/api/users/:userID/privacy', async (req, res) => {
  const { userID } = req.params;
  const { isProfilePrivate, isPostPrivate } = req.body;

  if (typeof isProfilePrivate === 'undefined' || typeof isPostPrivate === 'undefined') {
      return res.status(400).json({ message: 'Both isProfilePrivate and isPostPrivate are required.' });
  }

  try {
      const userRef = db.collection('users').doc(userID);
      await userRef.update({
          isProfilePrivate,
          isPostPrivate
      });
      return res.status(200).json({ message: 'Privacy settings updated successfully!' });
  } catch (error) {
      console.error('Error updating privacy settings:', error);
      return res.status(500).json({ message: 'Error updating privacy settings.' });
  }
});

//
// ADMIN ONLY API
//

app.delete('/api/users/:userID/delete', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    const batch = db.batch();

    // Step 1: Retrieve the user's document
    let userSnap;
    try {
      const userRef = db.collection('users').doc(userID);
      userSnap = await userRef.get();

      if (!userSnap.exists) {
        return res.status(404).json({ message: 'User not found.' });
      }
    } catch (error) {
      console.error('Error retrieving user document:', error);
      return res.status(500).json({ message: 'Error retrieving user document.' });
    }

    // Step 2: Delete profile picture if it exists
    const { email: userEmail, profilePicture } = userSnap.data();
    if (profilePicture) {
      const fileName = profilePicture.split('/').pop();
      try {
        await bucket.file(fileName).delete();
      } catch (error) {
        console.error('Error deleting profile picture:', error);
      }
    }

    // Step 3: Delete posts and their subcollections
    try {
      const postsCreatedSnap = await db.collection('users').doc(userID).collection('postsCreated').get();
      await Promise.all(postsCreatedSnap.docs.map(async (doc) => {
        const postID = doc.id;
        const postRef = db.collection('posts').doc(postID);

        const subcollections = await postRef.listCollections();
        for (const subcollection of subcollections) {
          const docs = await subcollection.get();
          docs.forEach((subDoc) => batch.delete(subDoc.ref));
        }

        batch.delete(postRef);
        batch.delete(doc.ref);
      }));
    } catch (error) {
      console.error('Error deleting posts and subcollections:', error);
      return res.status(500).json({ message: 'Error deleting posts and subcollections.' });
    }

    // Step 4: Delete followers and following references
    try {
      const followersSnap = await db.collection('users').doc(userID).collection('followers').get();
      await Promise.all(followersSnap.docs.map(async (followerDoc) => {
        const followingRef = db.collection('users').doc(followerDoc.id).collection('following').doc(userID);
        batch.delete(followingRef);
      }));
      followersSnap.forEach((doc) => batch.delete(doc.ref));

      const followingSnap = await db.collection('users').doc(userID).collection('following').get();
      followingSnap.forEach((doc) => batch.delete(doc.ref));
    } catch (error) {
      console.error('Error deleting followers and following references:', error);
      return res.status(500).json({ message: 'Error deleting followers and following references.' });
    }

    // Step 5: Delete user document
    try {
      batch.delete(db.collection('users').doc(userID));
      await batch.commit();
    } catch (error) {
      console.error('Error committing batch delete:', error);
      return res.status(500).json({ message: 'Error committing batch delete.' });
    }

    // Step 6: Delete from Firebase Authentication
    try {
      const userRecord = await getAuth().getUserByEmail(userEmail);
      await getAuth().deleteUser(userRecord.uid);
    } catch (error) {
      console.error('Error deleting user from Firebase Auth:', error);
      return res.status(500).json({ message: 'Error deleting user from Firebase Auth.' });
    }

    return res.status(200).json({ message: 'User and related data deleted successfully!' });
  } catch (error) {
    console.error('Unexpected error deleting user and related data:', error);
    return res.status(500).json({ message: 'Unexpected error deleting user and related data.' });
  }
});

// Function to recalculate and set numFollowers and numFollowing for each user
app.put('/api/update/followerFollowingCounts', async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();

    // Loop through each user and update numFollowers and numFollowing
    await Promise.all(usersSnap.docs.map(async (userDoc) => {
      const userID = userDoc.id;
      const userRef = db.collection('users').doc(userID);

      // Get followers and following subcollections count
      const followersSnap = await userRef.collection('followers').get();
      const followingSnap = await userRef.collection('following').get();

      const numFollowers = followersSnap.size;
      const numFollowing = followingSnap.size;

      // Update the user's main document with the new counts
      await userRef.update({ numFollowers, numFollowing });
    }));

    return res.status(200).json({ message: 'Follower and following counts updated successfully for all users.' });
  } catch (error) {
    console.error('Error updating follower and following counts:', error);
    return res.status(500).json({ message: 'Error updating follower and following counts.' });
  }
});

// Cleanup endpoint for deleting orphan posts and their subcollections
app.delete('/api/cleanup/orphanPosts', async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const ownedPostIDs = new Set();

    await Promise.all(usersSnap.docs.map(async (userDoc) => {
      const postsCreatedSnap = await userDoc.ref.collection('postsCreated').get();
      postsCreatedSnap.forEach(postDoc => ownedPostIDs.add(postDoc.id));
    }));

    const postsSnap = await db.collection('posts').get();
    const batch = db.batch();

    await Promise.all(postsSnap.docs.map(async (postDoc) => {
      if (!ownedPostIDs.has(postDoc.id)) {
        const postRef = postDoc.ref;

        // Delete all subcollections of the orphan post
        const subcollections = await postRef.listCollections();
        for (const subcollection of subcollections) {
          const docs = await subcollection.get();
          docs.forEach((doc) => batch.delete(doc.ref));
        }

        // Delete the orphan post document itself
        batch.delete(postRef);
      }
    }));

    await batch.commit();
    return res.status(200).json({ message: 'Orphan posts and their subcollections cleaned up successfully!' });
  } catch (error) {
    console.error('Error cleaning up orphan posts:', error);
    return res.status(500).json({ message: 'Error cleaning up orphan posts.' });
  }
});

// Cleanup endpoint to delete leaderboard entries for users who no longer exist
app.delete('/api/cleanup/leaderboard', async (req, res) => {
  try {
    // Step 1: Get all user IDs from the `users` collection
    const usersSnap = await db.collection('users').get();
    const existingUserIDs = new Set(usersSnap.docs.map((doc) => doc.id));

    // Step 2: Retrieve all entries from the `leaderboard` collection
    const leaderboardSnap = await db.collection('leaderboard').get();
    const batch = db.batch();

    // Step 3: For each leaderboard entry, delete if `userID` is not in `existingUserIDs`
    leaderboardSnap.forEach((doc) => {
      const leaderboardUserID = doc.id;
      if (!existingUserIDs.has(leaderboardUserID)) {
        batch.delete(doc.ref);
      }
    });

    // Step 4: Commit the batch delete operation
    await batch.commit();

    return res.status(200).json({ message: 'Leaderboard cleaned up successfully!' });
  } catch (error) {
    console.error('Error cleaning up leaderboard:', error);
    return res.status(500).json({ message: 'Error cleaning up leaderboard.' });
  }
});

// Cleanup endpoint to remove comments by users that no longer exist
app.delete('/api/cleanup/orphanComments', async (req, res) => {
  try {
    // Step 1: Get all user IDs from the `users` collection
    const usersSnap = await db.collection('users').get();
    const existingUserIDs = new Set(usersSnap.docs.map(doc => doc.id));

    // Step 2: Retrieve all posts and iterate over each post to check its comments
    const postsSnap = await db.collection('posts').get();
    const batch = db.batch();

    await Promise.all(postsSnap.docs.map(async postDoc => {
      const commentsSnap = await postDoc.ref.collection('comments').get();
      
      commentsSnap.forEach(commentDoc => {
        const commentUserID = commentDoc.data().userID;

        // If the user ID in the comment does not exist in the `users` collection, mark it for deletion
        if (!existingUserIDs.has(commentUserID)) {
          batch.delete(commentDoc.ref);
        }
      });
    }));

    // Step 3: Commit the batch delete operation
    await batch.commit();

    return res.status(200).json({ message: 'Orphan comments cleaned up successfully!' });
  } catch (error) {
    console.error('Error cleaning up orphan comments:', error);
    return res.status(500).json({ message: 'Error cleaning up orphan comments.' });
  }
});

// Assign default profile picture to users with empty or null profilePicture
app.put('/api/users/assignDefaultProfilePicture', async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();

    usersSnap.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      if (!userData.profilePicture) {
        const userRef = db.collection('users').doc(userDoc.id);
        batch.update(userRef, { profilePicture: '/resources/default-profile.png' });
      }
    });

    // Commit batch update
    await batch.commit();
    return res.status(200).json({ message: 'Default profile pictures assigned successfully to users without one.' });
  } catch (error) {
    console.error('Error assigning default profile pictures:', error);
    return res.status(500).json({ message: 'Error assigning default profile pictures.' });
  }
});



// // FUNCTION TO RESET LEADERBOARD
// exports.resetLeaderboard = onSchedule('59 23 * * 0', async (context) => {
//   try {
//     const leaderboardRef = db.collection('leaderboard');
//     const snapshot = await leaderboardRef.get();

//     const batch = db.batch();
//     snapshot.forEach((doc) => {
//       batch.update(doc.ref, { points: 0 });
//     });

//     await batch.commit();
//     console.log('Leaderboard reset successfully');
//   } catch (error) {
//     console.error('Error resetting leaderboard:', error);
//   }
// });

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