import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
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

export const googleProvider = new GoogleAuthProvider();
// 생년월일 정보를 요청하기 위한 스코프 추가 (선택사항, 구글 설정 필요할 수 있음)
googleProvider.addScope('https://www.googleapis.com/auth/user.birthday.read');

