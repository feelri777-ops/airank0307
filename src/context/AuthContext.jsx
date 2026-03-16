import { createContext, useContext, useEffect, useState } from "react";
import {
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  OAuthProvider
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleUser = async (u) => {
    try {
      if (!u) {
        setUser(null);
        return;
      }

      // 이메일 인증 여부 확인 (소셜 로그인은 제외하고 이메일/비밀번호 로그인인 경우만 체크)
      const isEmailUser = u.providerData.some(p => p.providerId === "password");
      
      if (isEmailUser && !u.emailVerified) {
        // 인증되지 않은 유저는 즉시 로그아웃 처리하여 세션을 종료합니다.
        setUser(null);
        await signOut(auth);
        return;
      }
      
      // 정지 여부 확인
      const banRef = doc(db, "bannedUsers", u.uid);
      const banSnap = await getDoc(banRef);
      if (banSnap.exists()) {
        setUser(null);
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", u.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: u.uid,
          displayName: u.displayName || u.email?.split('@')[0],
          email: u.email,
          photoURL: u.photoURL || `https://ui-avatars.com/api/?name=${u.email?.split('@')[0]}&background=random`,
          createdAt: new Date(),
        });
      }
      setUser(u);
    } catch (error) {
      console.error("🔴 Error handling user:", error);
      setUser(null);
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

      // 최신 인증 상태를 서버에서 다시 불러옴 (인증 링크 클릭 후 캐시 미갱신 대응)
      await res.user.reload();

      // 로그인 시점에 이메일 인증 여부 재확인
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

  const loginWithNaver = async () => {
    try {
      const provider = new OAuthProvider('oidc.naver');
      const result = await signInWithPopup(auth, provider);
      await handleUser(result.user);
      return result.user;
    } catch (error) {
      console.error("🔴 Naver Login error:", error);
      throw error;
    }
  };

  const loginWithKakao = async () => {
    try {
      const provider = new OAuthProvider('oidc.kakao');
      const result = await signInWithPopup(auth, provider);
      await handleUser(result.user);
      return result.user;
    } catch (error) {
      console.error("🔴 Kakao Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, registerWithEmail, resendVerificationEmail, loginWithNaver, loginWithKakao, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
