import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCeR7q_Q9iA21ckbuMUE4ZRWcBVDx-CCRw",
  authDomain: "attendance-tracker-11ecc.firebaseapp.com",
  projectId: "attendance-tracker-11ecc",
  storageBucket: "attendance-tracker-11ecc.firebasestorage.app",
  messagingSenderId: "143575877659",
  appId: "1:143575877659:web:af9d546d70782e7c6fd0be"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
