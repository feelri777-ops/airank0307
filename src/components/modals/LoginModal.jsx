import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "firebase/auth";

const NICK_REGEX = /^[가-힣a-zA-Z0-9]{2,12}$/;

const AVATAR_STYLES = [
  { label: "🤖 로봇", style: "bottts" },
  { label: "👤 사람", style: "avataaars" },
  { label: "🎨 아트", style: "lorelei" },
  { label: "😀 이모지", style: "fun-emoji" },
];

const LoginModal = ({ onClose }) => {
  const { 
    loginWithEmail, 
    registerWithEmail, 
    resendVerificationEmail, 
    loginWithGoogle,
    updateUserSetup,
    userData 
  } = useAuth();

  const [mode, setMode] = useState("login"); // "login", "register", "setup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [loading, setLoading] = useState(false);

  // Setup states
  const [setupNickname, setSetupNickname] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [avatarStyle, setAvatarStyle] = useState("bottts");

  const dicebearUrl = (style, seed) => `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

  const handleResend = async () => {
    try {
      await resendVerificationEmail(email, password);
      setShowResend(false);
      setError("");
      setMessage("인증 메일을 재발송했습니다. 메일함을 확인해주세요.");
    } catch {
      setError("재발송 실패. 이메일/비밀번호를 확인해주세요.");
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const u = await loginWithGoogle();
      
      // 사용자 문서 확인
      const userRef = doc(db, "users", u.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists() || !userSnap.data().setupCompleted) {
        // 설정 모드로 전환
        setSetupNickname(u.displayName || "");
        setSelectedAvatar(u.photoURL || dicebearUrl("bottts", u.uid));
        setMode("setup");
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("구글 로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!NICK_REGEX.test(setupNickname)) {
      setError("닉네임은 2~12자, 한글·영문·숫자만 가능합니다.");
      return;
    }
    if (!birthYear || !birthMonth || !birthDay) {
      setError("생년월일을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 닉네임 중복 확인
      const dupSnap = await getDocs(query(collection(db, "users"), where("displayName", "==", setupNickname)));
      if (!dupSnap.empty && dupSnap.docs.some(d => d.id !== auth.currentUser.uid)) {
        setError("이미 사용 중인 닉네임입니다.");
        setLoading(false);
        return;
      }

      const birthday = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      
      // 성인 확인 (만 19세 기준)
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      const isAdult = age >= 19;

      await updateUserSetup(auth.currentUser.uid, {
        displayName: setupNickname,
        photoURL: selectedAvatar,
        birthday: birthday,
        birthyear: birthYear,
        isAdult: isAdult
      });

      // Firebase Auth 프로필도 업데이트
      await updateProfile(auth.currentUser, {
        displayName: setupNickname,
        photoURL: selectedAvatar
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError("설정 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setShowResend(false);
    setLoading(true);
    try {
      if (mode === "register") {
        const trimmed = name.trim();
        if (!trimmed) throw new Error("닉네임을 입력해주세요.");
        if (!NICK_REGEX.test(trimmed)) {
          setError("닉네임은 2~12자, 한글·영문·숫자만 가능합니다.");
          return;
        }
        const dupSnap = await getDocs(query(collection(db, "users"), where("displayName", "==", trimmed)));
        if (!dupSnap.empty) {
          setError("이미 사용 중인 닉네임입니다.");
          return;
        }
        await registerWithEmail(email, password, trimmed);
        setMessage("가입 완료! 인증 메일을 확인해주세요.");
        setMode("login");
        setEmail("");
        setPassword("");
      } else {
        await loginWithEmail(email, password);
        onClose();
      }
    } catch (err) {
      if (err.message === "unverified-email") {
        setError("이메일 인증이 필요합니다.");
        setShowResend(true);
      } else {
        setError(err.message || "오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderLogin = () => (
    <>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.6rem", color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>
          {mode === "register" ? "회원가입" : "로그인"}
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
          {mode === "register" ? "새로운 계정을 만드세요." : "이메일 또는 구글로 시작하세요."}
        </p>
      </div>

      {message && (
        <div style={{ padding: "12px", borderRadius: "var(--r-md)", background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: "0.85rem", textAlign: "center", border: "1px solid #22c55e" }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {mode === "register" && (
          <input
            type="text" placeholder="닉네임 (2~12자)" value={name}
            onChange={(e) => setName(e.target.value)} required
            style={inputStyle}
          />
        )}
        <input
          type="email" placeholder="이메일 주소" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          style={inputStyle}
        />
        <input
          type="password" placeholder="비밀번호" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          style={inputStyle}
        />

        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>{error}</p>}
        
        <button type="submit" disabled={loading} style={primaryBtnStyle}>
          {loading ? "처리 중..." : (mode === "register" ? "가입하기" : "로그인")}
        </button>
      </form>

      {mode === "login" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border-primary)" }}></div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>또는</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border-primary)" }}></div>
          </div>

          <button onClick={handleGoogleLogin} disabled={loading} style={googleBtnStyle}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.85 2.22c1.67-1.53 2.63-3.79 2.64-6.55z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.22c-.79.53-1.8.85-3.11.85-2.39 0-4.41-1.61-5.14-3.78H.9v2.33C2.39 15.99 5.4 18 9 18z" fill="#34A853"/><path d="M3.86 10.67c-.19-.56-.3-1.16-.3-1.77s.11-1.21.3-1.77V4.8H.9c-.64 1.27-.99 2.71-.99 4.2s.36 2.93.99 4.2l2.96-2.33z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.4 0 2.39 2.01.9 5.01l2.96 2.33c.73-2.17 2.75-3.79 5.14-3.79z" fill="#EA4335"/></svg>
            구글로 계속하기
          </button>
        </>
      )}

      <p style={{ textAlign: "center", margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
        {mode === "register" ? "이미 계정이 있으신가요?" : "처음이신가요?"} {" "}
        <span onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ color: "var(--accent-indigo)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
          {mode === "login" ? "회원가입하기" : "로그인하기"}
        </span>
      </p>
    </>
  );

  const renderSetup = () => (
    <>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>프로필 설정</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>추가 정보를 입력하여 가입을 완료하세요.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
        {/* Avatar Selection */}
        <div style={{ position: "relative" }}>
          <img src={selectedAvatar} alt="avatar" style={{ width: "90px", height: "90px", borderRadius: "50%", border: "4px solid var(--accent-indigo)" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--bg-card)", borderRadius: "50%", padding: "4px", border: "1px solid var(--border-primary)" }}>✨</div>
        </div>

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", width: "100%", padding: "4px" }}>
          {AVATAR_STYLES.map(s => (
            <button key={s.style} onClick={() => { setAvatarStyle(s.style); setSelectedAvatar(dicebearUrl(s.style, Math.random())); }}
              style={{ padding: "6px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--border-primary)", background: avatarStyle === s.style ? "var(--bg-tertiary)" : "none", fontSize: "0.75rem", whiteSpace: "nowrap", cursor: "pointer" }}>
              {s.label}
            </button>
          ))}
          <button onClick={() => setSelectedAvatar(dicebearUrl(avatarStyle, Math.random()))} style={{ padding: "6px 12px", border: "1px solid var(--border-primary)", background: "none", borderRadius: "var(--r-md)", fontSize: "0.75rem", cursor: "pointer" }}>🎲 랜덤</button>
        </div>
      </div>

      <form onSubmit={handleSetupSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={labelStyle}>닉네임</label>
          <input type="text" placeholder="2~12자, 한글·영문·숫자" value={setupNickname} onChange={(e) => setSetupNickname(e.target.value)} required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>생년월일 (성인 인증용)</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="number" placeholder="년(4자리)" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required style={{ ...inputStyle, flex: 2 }} min="1900" max="2026" />
            <input type="number" placeholder="월" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} required style={{ ...inputStyle, flex: 1 }} min="1" max="12" />
            <input type="number" placeholder="일" value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required style={{ ...inputStyle, flex: 1 }} min="1" max="31" />
          </div>
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "0.82rem", textAlign: "center", margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={primaryBtnStyle}>
          {loading ? "저장 중..." : "설정 완료 및 시작하기"}
        </button>
      </form>
    </>
  );

  return createPortal(
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
        {mode === "setup" ? renderSetup() : renderLogin()}
      </div>
    </div>,
    document.body
  );
};

const overlayStyle = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(10px)" };
const modalStyle = { background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: "var(--r-lg)", padding: "2.5rem 2rem 2rem", width: "100%", maxWidth: "400px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", position: "relative", display: "flex", flexDirection: "column", gap: "1.5rem" };
const closeBtnStyle = { position: "absolute", top: "20px", right: "20px", background: "var(--bg-tertiary)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "var(--r-md)", border: "1px solid var(--border-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.95rem", boxSizing: "border-box", outline: "none" };
const primaryBtnStyle = { padding: "16px", borderRadius: "var(--r-md)", background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))", color: "#fff", border: "none", fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "opacity 0.2s" };
const googleBtnStyle = { width: "100%", padding: "14px", borderRadius: "var(--r-md)", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-primary)", fontWeight: 600, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" };
const labelStyle = { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase" };

export default LoginModal;
