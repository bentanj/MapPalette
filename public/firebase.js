// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAk51zep9W7jmO3zC6-lQJy6jeE6zMreis",
    authDomain: "mappalette-9e0bd.firebaseapp.com",
    projectId: "mappalette-9e0bd",
    storageBucket: "gs://mappalette-9e0bd.appspot.com",
    messagingSenderId: "907670644284",
    appId: "1:907670644284:web:e1dc720f9ae0644cd2c539"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Global user data storage
window.currentUser = null; // Define a global variable to store user data

// Handle session timeout duration (in milliseconds)
const SESSION_TIMEOUT = 3600000; // 1 hour

// Track session timeout
let sessionTimeout;

function startSessionTimeout() {
  clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(async () => {
    await signOut(auth); // End the session
    alert("Session timed out. Please log in again.");
    window.location.href = "index.html"; // Redirect to the login page
  }, SESSION_TIMEOUT);
}

// Redirect to homepage if user is already authenticated
function redirectIfAuthenticated() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = 'homepage.html';
    }
  });
}

// Check if a user is already logged in when login button on index.html is clicked
document.getElementById('login-button')?.addEventListener('click', (e) => {
  e.preventDefault();
  redirectIfAuthenticated(); // Check authentication status
  window.location.href = 'login.html'; // Otherwise, go to login page
});

// Handle signup and login form submissions

/* -------------------------------------------------------------------------- */
/*                                sign up auth                                */
/* -------------------------------------------------------------------------- */

// Sign Up
const signupForm = document.getElementById('signupForm');
const errorAlert = document.getElementById('errorAlert');
const errorList = document.getElementById('errorList');

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorList.innerHTML = ''; // Clear previous errors
  errorAlert.style.display = 'none';

  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const birthday = document.getElementById('birthday').value;
  const gender = document.getElementById('gender').value;
  const profilePicture = document.getElementById('profilePicture').files[0];

  // Array to collect all validation error messages
  const errors = [];

  // Validation checks
  if (!email || !username || !password || !confirmPassword || !birthday || !gender) {
    errors.push("Please fill out all fields.");
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    errors.push("Please enter a valid email address with a legitimate domain.");
  }

  if (password !== confirmPassword) {
    errors.push("Passwords do not match.");
  }

  // If there are validation errors, display them and stop form submission
  if (errors.length > 0) {
    displayErrors(errors);
    resetButtonState(); // Ensure button is re-enabled in case of errors
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Profile picture handling
    let profilePicURL = '';
    if (profilePicture) {
      profilePicURL = await uploadProfilePicture(user, profilePicture);
    } else {
      const defaultProfileRef = ref(storage, 'profile_pictures/default.jpg');
      profilePicURL = await getDownloadURL(defaultProfileRef);
    }

    // Create user document in Firestore
    await setDoc(doc(db, `users/${user.uid}`), {
      email,
      username,
      birthday,
      gender,
      profilePicture: profilePicURL,
      numFollowers: 0,
      numFollowing: 0,
      isProfilePrivate: false,
      isPostPrivate: false
    });

    // Show success alert and delay redirection
    const successAlert = document.getElementById('successAlert');
    successAlert.style.display = 'block';
    document.querySelector('.signup-container').scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      window.location.href = 'homepage.html';
    }, 3000); // Redirect after 3 seconds

  } catch (error) {
    console.error('Signup error:', error);
    displayErrors([`Signup failed: ${error.message}`]); // Pass error as array to displayErrors
    resetButtonState(); // Reset the button in case of an error
  }
});

// Updated displayErrors function
function displayErrors(errors) {
  errors.forEach(error => {
    const li = document.createElement('li');
    li.textContent = error;
    errorList.appendChild(li);
  });
  errorAlert.style.display = 'block';
  document.querySelector('.signup-container').scrollTo({ top: 0, behavior: 'smooth' });
}

// Reset button state after error or successful handling
function resetButtonState() {
  spinner.style.display = 'none';
  buttonText.style.display = 'inline';
  submitButton.disabled = false;
}

/* -------------------------------------------------------------------------- */
/*                                 Login auth                                 */
/* -------------------------------------------------------------------------- */

// Login
const loginForm = document.getElementById('login-form');
const loginErrorAlert = document.getElementById('loginErrorAlert');
// const loginErrorList = document.getElementById('loginErrorList');
const loginButton = document.getElementById('loginButton');
const loginSpinner = document.getElementById('loginSpinner');
const loginButtonText = document.getElementById('loginButtonText');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  // loginErrorList.innerHTML = ''; // Clear previous errors
  loginErrorAlert.style.display = 'none';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Show spinner and disable button
  loginSpinner.style.display = 'inline-block';
  loginButtonText.style.display = 'none';
  loginButton.disabled = true;

  const errors = [];
  if (!email) errors.push("Email is required.");
  if (!password) errors.push("Password is required.");

  if (errors.length > 0) {
    displayLoginErrors(errors);
    resetLoginButtonState();
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    startSessionTimeout(); // Start session timeout on login
    window.location.href = 'homepage.html';
  } catch (error) {
    console.error('Login error:', error);
    displayLoginErrors([`Login failed: ${error.message}`]);
    resetLoginButtonState();
  }
});

// Function to display errors in the login error alert
function displayLoginErrors(errors) {
  errors.forEach(error => {
    const li = document.createElement('li');
    li.textContent = error;
    // loginErrorList.appendChild(li);
  });
  loginErrorAlert.style.display = 'block';
  document.querySelector('.login-container').scrollTo({ top: 0, behavior: 'smooth' });
}

// Function to reset the login button state
function resetLoginButtonState() {
  loginSpinner.style.display = 'none';
  loginButtonText.style.display = 'inline';
  loginButton.disabled = false;
}

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

// Helper function to fetch document IDs in a subcollection
async function fetchSubcollectionIds(userId, subcollection) {
  const subcollectionRef = collection(db, `users/${userId}/${subcollection}`);
  const snapshot = await getDocs(subcollectionRef);
  return snapshot.docs.map(doc => doc.id); // Returns an array of document IDs
}

/* -------------------------------------------------------------------------- */
/*                           Current user as Global                           */
/* -------------------------------------------------------------------------- */

// Handle session persistence and set global user data
onAuthStateChanged(auth, async (user) => {
  // List of pages where unauthenticated users are allowed
  const allowedPages = ["index.html", "signup.html", "login.html"];
  const currentPage = window.location.pathname.split("/").pop();

  if (user) {
      console.log("User is authenticated with UID:", user.uid);
      startSessionTimeout(); // Reset session timeout on page load

      // Fetch user document and store in global variable
      try {
          const userDocRef = doc(db, `users/${user.uid}`);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Fetch subcollection document IDs
            const postsCreated = await fetchSubcollectionIds(user.uid, 'postsCreated');
            const followers = await fetchSubcollectionIds(user.uid, 'followers');
            const following = await fetchSubcollectionIds(user.uid, 'following');

            // Set `window.currentUser` with user data and subcollection IDs
            window.currentUser = {
                id: user.uid,
                ...userDoc.data(),
                postsCreated: postsCreated || [],
                followers: followers || [],
                following: following || [],
                isProfilePrivate: userData.isProfilePrivate || false,
                isPostPrivate: userData.isPostPrivate || false,  
            };
            window.dispatchEvent(new Event("userLoaded"));
          } else {
              console.error("User document does not exist!");
          }
      } catch (error) {
          console.error("Failed to fetch user data:", error);
      }
  } else {
      console.log("No user is authenticated.");
      window.currentUser = null;

      // Only redirect if the current page is not in the allowed list
      if (!allowedPages.includes(currentPage)) {
          alert("You are logged out. Redirecting to the login page.");
          window.location.href = "index.html";
      }
  }
});

// Function to get user data by userID
async function getCurrentUserObject() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, `users/${user.uid}`));
          if (userDoc.exists()) {
            resolve(userDoc.data());  // Send back user data
          } else {
            reject("No user document found!");
          }
        } catch (error) {
          reject("Failed to get user data: " + error);
        }
      } else {
        resolve(null);  // No authenticated user
      }
    });
  });
}

// Function to retrieve global user data
export async function displayUserData() {
  try {
      const userObject = window.currentUser || await getCurrentUserObject(); // Check global or fetch
      if (userObject) {
          console.log("Accessing user data:", userObject);
          return userObject;
      } else {
          console.log("No user is currently authenticated.");
          return null;
      }
  } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
  }
}

// Upload profile picture and get URL
async function uploadProfilePicture(user, file) {
  const storageRef = ref(storage, `profile_pictures/${user.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/* -------------------------------------------------------------------------- */
/*                                Log out auth                                */
/* -------------------------------------------------------------------------- */

document.getElementById('logout')?.addEventListener('click', async () => {
  try {
    await signOut(auth); // Log out the user
    window.currentUser = null; // Clear global user data
    alert("Sad to see you leave, but love to watch you go (and run)! See you soon!");
    window.location.href = "index.html"; // Redirect to login page
  } catch (error) {
    console.error("Logout failed:", error);
    alert("An error occurred during logout.");
  }
});

/* -------------------------------------------------------------------------- */
/*                             Reset Password auth                            */
/* -------------------------------------------------------------------------- */

// Password reset functionality
const resetPasswordForm = document.getElementById('reset-password-form');
resetPasswordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('reset-email').value;

  try {
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent! Please check your inbox.');
    // Close the modal
    document.getElementById('forgotPasswordModal').querySelector('.btn-close').click();
  } catch (error) {
    console.error('Error sending password reset email:', error);
    alert("Failed to send password reset email: " + error.message);
  }
});

// Export initialized services for use in other files
export default app;      // Default export for the Firebase app
export { auth, db, storage, ref, uploadBytes, getDownloadURL, onAuthStateChanged };
