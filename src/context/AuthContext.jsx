// AuthContext.jsx - v1.1.0 (Fixed user document creation)
import { createContext, useContext, useEffect, useState } from "react";
import {
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  signInWithCustomToken
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

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
        // 카카오 등에서 정보를 못 가져올 경우를 대비한 기본 이름
        const tempName = u.displayName || u.email?.split('@')[0] || "사용자";
        finalData = {
          uid: u.uid,
          displayName: tempName,
          email: u.email || "",
          photoURL: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(tempName)}&background=random`,
          createdAt: new Date(),
          setupCompleted: false // 신규 사용자는 무조건 false
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

    // 카카오 SDK 초기화 추가
    const initKakao = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        const jsKey = import.meta.env.VITE_KAKAO_JS_KEY;
        if (jsKey && jsKey !== "your_kakao_js_key_here") {
          try {
            window.Kakao.init(jsKey);
            console.log("🟢 Kakao SDK Initialized");
          } catch (e) {
            console.error("🔴 Kakao Init Error:", e);
          }
        }
      }
    };
    
    // SDK가 로드될 때까지 약간의 대기 후 초기화 시도
    const timer = setTimeout(initKakao, 500);
    
    return () => {
      unsub();
      clearTimeout(timer);
    };
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

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (error) {
      console.error("🔴 Google Login error:", error);
      throw error;
    }
  };

  const loginWithKakao = async () => {
    try {
      if (!window.Kakao) {
        throw new Error("Kakao SDK not loaded. Please check your internet connection.");
      }
      
      // 혹시 초기화가 안 되어 있다면 다시 시도
      if (!window.Kakao.isInitialized()) {
        const jsKey = import.meta.env.VITE_KAKAO_JS_KEY;
        if (jsKey && jsKey !== "your_kakao_js_key_here") {
          window.Kakao.init(jsKey);
        } else {
          throw new Error("Kakao JS Key is missing.");
        }
      }

      return new Promise((resolve, reject) => {
        // v2 및 v1 SDK 호환성을 위해 체크
        const kakaoAuth = window.Kakao.Auth;
        
        if (!kakaoAuth) {
          reject(new Error("Kakao Auth module is missing."));
          return;
        }

        // 최신 SDK는 login을 권장하지만, 환경에 따라 loginForm 등이 필요할 수 있음
        const loginFn = kakaoAuth.login || kakaoAuth.authorize;
        
        if (!loginFn) {
          reject(new Error("No Kakao login method found."));
          return;
        }

        kakaoAuth.login({
          // persistAccessToken: false, // 필요 시 매번 로그인을 강제하려면 주석 해제
          success: async (authObj) => {
            try {
              // 여기서 백엔드(Firebase Functions)로 인가 코드를 보내야 하지만,
              // JS SDK 팝업 방식은 액세스 토큰을 바로 줍니다. 
              // 보안을 위해 액세스 토큰을 백엔드로 보내 Firebase Custom Token을 가져옵니다.
              const apiUrl = import.meta.env.VITE_API_BASE_URL;
              const response = await fetch(apiUrl, { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: authObj.access_token })
              });
              
              const data = await response.json();
              if (data.firebaseToken) {
                const res = await signInWithCustomToken(auth, data.firebaseToken);
                resolve(res.user);
              } else {
                reject(new Error("Failed to get Firebase token from backend"));
              }
            } catch (err) {
              reject(err);
            }
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    } catch (error) {
      console.error("🔴 Kakao Login error:", error);
      throw error;
    }
  };

   const updateUserSetup = async (uid, data) => {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        ...data,
        setupCompleted: true,
        updatedAt: new Date()
      }, { merge: true });
      // 데이터 갱신을 위해 handleUser 재동작 유도
      if (auth.currentUser) await handleUser(auth.currentUser);
    } catch (error) {
      console.error("🔴 Update User Setup error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (window.Kakao && window.Kakao.Auth && window.Kakao.Auth.getAccessToken()) {
        window.Kakao.Auth.logout();
      }
      setUser(null);
      setUserData(null);
      await signOut(auth);
    } catch (error) {
      console.error("🔴 Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      loginWithEmail, 
      registerWithEmail, 
      resendVerificationEmail, 
      loginWithGoogle,
      loginWithKakao,
      updateUserSetup,
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
