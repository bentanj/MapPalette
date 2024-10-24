// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

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

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Handle signup
const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    // Retrieve form values
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const birthday = document.getElementById('birthday').value;
    const gender = document.getElementById('gender').value;
    const profilePicture = document.getElementById('profile-picture').files[0]; // Profile picture file

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    try {
        // 1. Create user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Upload profile picture to Firebase Storage and get the download URL
        let profilePicURL = '';
        if (profilePicture) {
            const storageRef = ref(storage, `profile_pictures/${user.uid}`); // Correct syntax to reference storage
            await uploadBytes(storageRef, profilePicture); // Upload the file to Firebase Storage
            profilePicURL = await getDownloadURL(storageRef); // Get the file's download URL
        }

        // 3. Store additional user details in Firestore
        await setDoc(doc(db, `users/${user.uid}`), {
            email: email,
            username: username,
            birthday: birthday,
            gender: gender,
            profilePicture: profilePicURL
        });

        alert("Signup successful! Welcome to MapPalette");
        window.location.href = 'login.html'; // Redirect to login page or homepage

    } catch (error) {
        console.error('Error signing up:', error);
        alert("Signup failed: " + error.message);
    }
});

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, and their session persists across page reloads.
        const uid = user.uid;
        console.log("User is logged in with UID:", uid);
    } else {
        // No user is signed in.
        console.log("User is logged out.");
    }
});
