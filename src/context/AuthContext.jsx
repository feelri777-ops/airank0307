import { createContext, useContext, useEffect, useState } from "react";
import {
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleUser = async (u) => {
    try {
      if (!u) {
        setUser(null);
        setUserData(null);
        return;
      }

      // 이메일 인증 여부 확인
      const isEmailUser = u.providerData.some(p => p.providerId === "password");
      
      if (isEmailUser && !u.emailVerified) {
        setUser(null);
        setUserData(null);
        await signOut(auth);
        return;
      }
      
      // 정지 여부 확인
      const banRef = doc(db, "bannedUsers", u.uid);
      const banSnap = await getDoc(banRef);
      if (banSnap.exists()) {
        setUser(null);
        setUserData(null);
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", u.uid);
      const userSnap = await getDoc(userRef);
      
      let finalData = {};
      
      if (!userSnap.exists()) {
        finalData = {
          uid: u.uid,
          displayName: u.displayName || u.email?.split('@')[0],
          email: u.email,
          photoURL: u.photoURL || `https://ui-avatars.com/api/?name=${u.email?.split('@')[0]}&background=random`,
          createdAt: new Date(),
        };
        await setDoc(userRef, finalData);
      } else {
        finalData = userSnap.data();
      }
      
      setUser(u);
      setUserData(finalData);
    } catch (error) {
      console.error("🔴 Error handling user:", error);
      setUser(null);
      setUserData(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      handleUser(u).finally(() => setLoading(false));
    });
    return unsub;
  }, []);

  const registerWithEmail = async (email, password, name) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      
      // 프로필 업데이트
      await updateProfile(res.user, {
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${name}&background=random`
      });

      // 이메일 인증 메일 발송
      await sendEmailVerification(res.user);
      
      // 가입 직후 자동 로그인되는 것을 방지하기 위해 즉시 로그아웃
      await signOut(auth);
      setUser(null);
      
      return res.user;
    } catch (error) {
      console.error("🔴 Registration error:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);

      // 최신 인증 상태를 서버에서 다시 불러옴
      await res.user.reload();

      if (!res.user.emailVerified) {
        await signOut(auth);
        setUser(null);
        throw new Error("unverified-email");
      }
      
      await handleUser(res.user);
      return res.user;
    } catch (error) {
      console.error("🔴 Email Login error:", error);
      throw error;
    }
  };

  const resendVerificationEmail = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(res.user);
    await signOut(auth);
  };

  const logout = () => {
    setUser(null);
    setUserData(null);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, loginWithEmail, registerWithEmail, resendVerificationEmail, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
