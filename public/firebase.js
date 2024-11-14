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
/*                                   Sign Up                                  */
/* -------------------------------------------------------------------------- */
const signupForm = document.getElementById('signupForm');
const errorAlert = document.getElementById('errorAlert');
const errorList = document.getElementById('errorList');
const successAlert = document.getElementById('successAlert');
const submitButton = document.getElementById('submitButton');
const spinner = document.getElementById('spinner');
const buttonText = document.getElementById('buttonText');

// Handle signup form submissions
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Clear any previous Firebase error messages
  errorList.innerHTML = '';
  errorAlert.style.display = 'none';
  successAlert.style.display = 'none';
  
  // Validate form fields
  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const birthday = document.getElementById('birthday').value;
  const gender = document.getElementById('gender').value;
  const profilePicture = document.getElementById('profilePicture').files[0];

  let isValid = true;

  // Check that passwords match
  if (password !== confirmPassword) {
    isValid = false;
    // console.error("Passwords do not match.");
  }

  // Check that birthdate is not empty and valid
  if (!birthday || isNaN(new Date(birthday).getTime())) {
    isValid = false;
    // console.error("Invalid birthdate.");
  }

  // Check that gender is selected (not default)
  if (gender === "Select your gender") {
    isValid = false;
    // console.error("Gender not selected.");
  }

  if (!isValid) {
    return; // Stop if validation fails
  }

  // Display spinner and disable button during async operation
  spinner.style.display = 'inline-block';
  buttonText.style.display = 'none';
  submitButton.disabled = true;

  try {
    // Sign up user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // If a profile picture file is uploaded, upload it, otherwise use default path
    const profilePicURL = profilePicture 
      ? await uploadProfilePicture(user, profilePicture) 
      : '/resources/default-profile.png';

    // Save user information to Firestore
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

    startSessionTimeout(); // Start session timeout on signup

    // Show success alert
    successAlert.style.display = 'block';
    document.querySelector('.signup-container').scrollTo({ top: 0, behavior: 'smooth' });

    // Redirect to homepage after delay
    setTimeout(() => {
      window.location.href = 'homepage.html';
    }, 3000);

  } catch (error) {
    console.error('Firebase signup error:', error);
    // Display the error in the sign-up container alert div
    const li = document.createElement('li');
    li.textContent = `Signup failed: ${error.message}`;
    errorList.appendChild(li);
    errorAlert.style.display = 'block';
    document.querySelector('.signup-container').scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    // Reset button and spinner state after completion
    spinner.style.display = 'none';
    buttonText.style.display = 'inline';
    submitButton.disabled = false;
  }
});

/* -------------------------------------------------------------------------- */
/*                                    Login                                   */
/* -------------------------------------------------------------------------- */
const loginForm = document.getElementById('login-form');
const loginErrorAlert = document.getElementById('loginErrorAlert');
const loginSuccessAlert = document.getElementById('loginSuccessAlert'); // Add success alert element
const loginButton = document.getElementById('loginButton');
const loginSpinner = document.getElementById('loginSpinner');
const loginButtonText = document.getElementById('loginButtonText');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErrorAlert.style.display = 'none';
  loginSuccessAlert.style.display = 'none'; // Hide success alert initially

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    startSessionTimeout(); // Start session timeout on login

    // Show success alert and scroll to top
    loginSuccessAlert.style.display = 'block';
    document.querySelector('.login-container').scrollTo({ top: 0, behavior: 'smooth' });

    // Delay redirection to allow user to see success message
    setTimeout(() => {
      window.location.href = 'homepage.html';
    }, 3000); // Redirect after 3 seconds

  } catch (error) {
    console.error('Login error:', error);
    displayLoginErrors();
    resetLoginButtonState(); // Reset button state after a failed login attempt
  }
});

// Function to display errors in the login error alert
function displayLoginErrors() {
  // errors.forEach(error => {
  //   const li = document.createElement('li');
  //   li.textContent = error;
  //   // loginErrorList.appendChild(li);
  // });
  loginErrorAlert.style.display = 'block';
  document.querySelector('.alert-container').scrollTo({ top: 0, behavior: 'smooth' });
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

// Update the onAuthStateChanged logic to use the single logout alert function
onAuthStateChanged(auth, async (user) => {
  const allowedPages = ["index.html", "signup.html", "login.html"];
  const currentPage = window.location.pathname.split("/").pop();

  if (user) {
    console.log("User is authenticated with UID:", user.uid);
    startSessionTimeout(); // Reset session timeout on page load

    try {
      const userDocRef = doc(db, `users/${user.uid}`);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const postsCreated = await fetchSubcollectionIds(user.uid, 'postsCreated');
        const followers = await fetchSubcollectionIds(user.uid, 'followers');
        const following = await fetchSubcollectionIds(user.uid, 'following');

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

    if (!allowedPages.includes(currentPage) && !loggedOutAlertDisplayed) {
      showLogoutAlert(); // Show logout alert only if not displayed already
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
    // Display the signing out alert
    showLogoutAlert();

    // Perform logout
    await signOut(auth); // Log out the user
    window.currentUser = null; // Clear global user data

    // Redirect to login page after a delay to show alert
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000); // Adjust delay as needed
  } catch (error) {
    console.error("Logout failed:", error);

    // Create a Bootstrap alert element for logout error
    const logoutErrorAlert = document.createElement('div');
    logoutErrorAlert.classList.add('alert', 'alert-danger', 'alert-dismissible', 'fade', 'show');
    logoutErrorAlert.role = 'alert';
    logoutErrorAlert.innerHTML = `
      <strong>Error!</strong> An error occurred during logout. Please try again.
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Append the alert to the body or a specific container on the page
    document.body.prepend(logoutErrorAlert);

    // Optionally, auto-remove the alert after a delay
    setTimeout(() => {
      logoutErrorAlert.classList.remove('show');
      document.body.removeChild(logoutErrorAlert);
    }, 5000); // Adjust delay as needed (5 seconds in this case)
  }
});

// Global variable to track if logout alert is already shown
let loggedOutAlertDisplayed = false;

// Function to show a logout notification alert
function showLogoutAlert() {
  if (loggedOutAlertDisplayed) return; // Prevent multiple alerts
  loggedOutAlertDisplayed = true;      // Set the flag to indicate alert has been shown

  const alertContainer = document.createElement('div');
  alertContainer.classList.add('alert', 'alert-warning', 'fade', 'show'); // Default Bootstrap alert
  alertContainer.role = 'alert';
  alertContainer.innerHTML = `
    Signing out... You will be redirected shortly.
  `;

  // Center the alert with limited width
  alertContainer.style.zIndex = "9999";            // High stacking order
  alertContainer.style.position = "fixed";         // Fix alert in viewport
  alertContainer.style.top = "20px";               // Position near top of screen
  alertContainer.style.left = "50%";               // Center horizontally
  alertContainer.style.transform = "translateX(-50%)"; // Center align
  alertContainer.style.width = "300px";            // Set a fixed width for alert
  alertContainer.style.maxWidth = "80%";           // Allow it to shrink on smaller screens

  document.body.appendChild(alertContainer);

  setTimeout(() => {
    alertContainer.classList.remove('show');
    document.body.removeChild(alertContainer);
    window.location.href = "index.html"; // Redirect after alert
  }, 2000);
}


/* -------------------------------------------------------------------------- */
/*                             Reset Password auth                            */
/* -------------------------------------------------------------------------- */

// Password reset functionality
const resetPasswordForm = document.getElementById('reset-password-form');
const resetSuccessAlert = document.getElementById('resetSuccessAlert');
const resetErrorAlert = document.getElementById('resetErrorAlert');

resetPasswordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetSuccessAlert.style.display = 'none';
  resetErrorAlert.style.display = 'none';

  const email = document.getElementById('reset-email').value.trim();

  try {
    await sendPasswordResetEmail(auth, email);
    resetSuccessAlert.style.display = 'block';
    resetErrorAlert.style.display = 'none';
  } catch (error) {
    console.error('Error sending password reset email:', error);
    resetErrorAlert.textContent = "Failed to send password reset email: " + error.message;
    resetErrorAlert.style.display = 'block';
  }
});

// Export initialized services for use in other files
export default app;      // Default export for the Firebase app
export { auth, db, storage, ref, uploadBytes, getDownloadURL, onAuthStateChanged };