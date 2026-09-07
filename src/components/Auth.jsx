import React from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { LogIn, LogOut } from 'lucide-react';

export default function Auth({ user }) {
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedInUser = result.user;
      
      // Save their profile so you can see who they are in the Firebase Console
      const userRef = doc(db, 'users', loggedInUser.uid);
      await setDoc(userRef, {
        name: loggedInUser.displayName,
        email: loggedInUser.email,
        lastLogin: new Date().toISOString()
      }, { merge: true });
      
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex items-center">
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user.displayName}
          </span>
          <img 
            src={user.photoURL} 
            alt="Profile" 
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full border border-gray-200"
          />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
        >
          <LogIn size={18} />
          Sign In with Google
        </button>
      )}
    </div>
  );
}
