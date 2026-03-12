import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBgEK1nLoKTTa4tRwhZRQPC7xLQP8lf8NQ",
  authDomain: "airank0307.firebaseapp.com",
  projectId: "airank0307",
  storageBucket: "airank0307.firebasestorage.app",
  messagingSenderId: "778502679462",
  appId: "1:778502679462:web:65e2dced1dfdb41de93d67",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

