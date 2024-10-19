// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAk51zep9W7jmO3zC6-lQJy6jeE6zMreis",
  authDomain: "mappalette-9e0bd.firebaseapp.com",
  projectId: "mappalette-9e0bd",
  storageBucket: "mappalette-9e0bd.appspot.com",
  messagingSenderId: "907670644284",
  appId: "1:907670644284:web:e1dc720f9ae0644cd2c539"
};

// Initialisation
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
// Create instance of google provider object
const provider = new GoogleAuthProvider();

// Email signup functions
// Create account using email and password
export const handleEmailSignUp = (formId, redirectUrl) => {
  const form = document.getElementById(formId);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log('User signed up:', userCredential.user);
        window.location.href = redirectUrl;  // Redirect to the feed page on success
      })
      .catch((error) => {
        console.error('Error during sign-up:', error.message);
        alert(error.message);  // Display the error to the user
      });
  });
};

// Google sign-up
export const handleGoogleSignUp = (buttonId, redirectUrl) => {
  const googleButton = document.getElementById(buttonId);

  googleButton.addEventListener('click', (event) => {
    event.preventDefault();

    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('Google sign-in successful:', result.user);
        window.location.href = redirectUrl;  // Redirect to feed page on success
      })
      .catch((error) => {
        console.error('Error during Google sign-in:', error.message);
        alert(error.message);  // Display the error to the user
      });
  });
};
// Sign in with existing email and password
signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed in 
    const user = userCredential.user;
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
  });

// What to do when user logs in / out
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/auth.user
    const uid = user.uid;
    // ...
  } else {
    // User is signed out
    // ...
  }
});

// Google sign up functions
// Google sign in with pop up

