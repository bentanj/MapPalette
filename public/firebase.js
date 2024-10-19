// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

// Your web app's Firebase configuration (replace with your actual config)

const firebaseConfig = {
  apiKey: "AIzaSyAk51zep9W7jmO3zC6-lQJy6jeE6zMreis",
  authDomain: "mappalette-9e0bd.firebaseapp.com",
  projectId: "mappalette-9e0bd",
  storageBucket: "mappalette-9e0bd.appspot.com",
  messagingSenderId: "907670644284",
  appId: "1:907670644284:web:e1dc720f9ae0644cd2c539"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Handle login
document.getElementById('login-form')?.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            window.location.href = 'homepage.html';
        })
        .catch((error) => {
            const errorMessage = error.message;
            document.getElementById('error-message').textContent = errorMessage;
        });
});

// Handle signup
document.getElementById('signupForm')?.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Account created
            window.location.href = 'homepage.html';
        })
        .catch((error) => {
            const errorMessage = error.message;
            document.getElementById('signup-error-message').textContent = errorMessage;
        });
});


