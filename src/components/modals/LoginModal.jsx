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
    loginWithGoogle,
    updateUserSetup,
    userData 
  } = useAuth();

  const [mode, setMode] = useState("login"); // "login", "setup"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Setup states
  const [setupNickname, setSetupNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [avatarStyle, setAvatarStyle] = useState("bottts");

  const dicebearUrl = (style, seed) => `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const u = await loginWithGoogle();
      
      const userRef = doc(db, "users", u.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists() || !userSnap.data().setupCompleted) {
        setSetupNickname(u.displayName || "");
        setSelectedAvatar(u.photoURL || dicebearUrl("bottts", u.uid));
        setMode("setup");
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("구글 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
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

    setLoading(true);
    try {
      const dupSnap = await getDocs(query(collection(db, "users"), where("displayName", "==", setupNickname)));
      if (dupSnap.docs.some(d => d.id !== auth.currentUser.uid)) {
        setError("이미 사용 중인 닉네임입니다.");
        setLoading(false);
        return;
      }

      await updateUserSetup(auth.currentUser.uid, {
        displayName: setupNickname,
        photoURL: selectedAvatar,
        updatedAt: new Date()
      });

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

  const renderLogin = () => (
    <>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 800, fontSize: "2rem", color: "var(--text-primary)", margin: "0 0 0.5rem 0", letterSpacing: "-0.05rem" }}>
          로그인
        </h2>
        <p style={{ fontSize: "1rem", color: "var(--text-muted)", margin: 0 }}>
          AIRANK 서비스를 안전하게 시작하세요.
        </p>
      </div>

      <div style={{ padding: "10px 0" }}>
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading} 
          style={{
            ...googleBtnStyle,
            height: "64px",
            fontSize: "1.1rem",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-primary)",
            boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: loading ? "not-allowed" : "pointer"
          }}
          onMouseEnter={(e) => { if(!loading) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "var(--accent-indigo)"; } }}
          onMouseLeave={(e) => { if(!loading) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border-primary)"; } }}
        >
          <svg width="24" height="24" viewBox="0 0 18 18" style={{ marginRight: "12px" }}>
            <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.85 2.22c1.67-1.53 2.63-3.79 2.64-6.55z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.22c-.79.53-1.8.85-3.11.85-2.39 0-4.41-1.61-5.14-3.78H.9v2.33C2.39 15.99 5.4 18 9 18z" fill="#34A853"/>
            <path d="M3.86 10.67c-.19-.56-.3-1.16-.3-1.77s.11-1.21.3-1.77V4.8H.9c-.64 1.27-.99 2.71-.99 4.2s.36 2.93.99 4.2l2.96-2.33z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.4 0 2.39 2.01.9 5.01l2.96 2.33c.73-2.17 2.75-3.79 5.14-3.79z" fill="#EA4335"/>
          </svg>
          {loading ? "연결 중..." : "구글 계정으로 로그인"}
        </button>
      </div>

      {error && <p style={{ color: "#ef4444", fontSize: "0.9rem", textAlign: "center", marginTop: "10px" }}>{error}</p>}

      <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "1.5rem", lineHeight: "1.4" }}>
        로그인 시 이용약관 및 개인정보처리방침에<br/>동의하는 것으로 간주됩니다.
      </p>
    </>
  );

  const renderSetup = () => (
    <>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.8rem", color: "var(--text-primary)", margin: "0 0 0.5rem 0", letterSpacing: "-0.05rem" }}>프로필 완성하기</h2>
        <p style={{ fontSize: "1rem", color: "var(--text-muted)", margin: 0 }}>나를 표현할 닉네임과 아바타를 골라주세요.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
        {/* Avatar Display */}
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <div style={{
            position: "absolute", inset: "-4px", borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
            opacity: 0.6, zIndex: 0, filter: "blur(8px)"
          }}></div>
          <img src={selectedAvatar} alt="avatar" style={{ 
            width: "110px", height: "110px", borderRadius: "50%", 
            border: "4px solid var(--bg-card)", position: "relative", zIndex: 1,
            backgroundColor: "var(--bg-tertiary)", objectFit: "cover"
          }} />
          <button 
            onClick={() => setSelectedAvatar(dicebearUrl(avatarStyle, Math.random()))}
            style={{ 
              position: "absolute", bottom: "4px", right: "4px", 
              background: "var(--accent-indigo)", color: "white", 
              borderRadius: "50%", width: "32px", height: "32px", 
              border: "3px solid var(--bg-card)", display: "flex", 
              alignItems: "center", justifyContent: "center", 
              cursor: "pointer", zIndex: 2, fontSize: "1rem" 
            }}
          >
            🎲
          </button>
        </div>

        {/* Avatar Style Grid */}
        <div style={{ 
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)", 
          gap: "8px", width: "100%", padding: "4px" 
        }}>
          {AVATAR_STYLES.map(s => (
            <button key={s.style} 
              onClick={() => { setAvatarStyle(s.style); setSelectedAvatar(dicebearUrl(s.style, Math.random())); }}
              style={{ 
                padding: "10px", borderRadius: "var(--r-md)", 
                border: "1px solid",
                borderColor: avatarStyle === s.style ? "var(--accent-indigo)" : "var(--border-primary)",
                background: avatarStyle === s.style ? "rgba(99, 102, 241, 0.1)" : "var(--bg-secondary)",
                color: avatarStyle === s.style ? "var(--accent-indigo)" : "var(--text-secondary)",
                fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSetupSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "10px" }}>
        <div>
          <label style={{ ...labelStyle, fontSize: "0.85rem", marginBottom: "8px", color: "var(--text-primary)" }}>닉네임</label>
          <input 
            type="text" placeholder="2~12자, 한글·영문·숫자" 
            value={setupNickname} onChange={(e) => setSetupNickname(e.target.value)} 
            required 
            style={{ 
              ...inputStyle, 
              fontSize: "1.1rem", 
              padding: "16px",
              textAlign: "center",
              background: "var(--bg-tertiary)",
              border: "2px solid var(--border-primary)",
              borderRadius: "16px"
            }} 
          />
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>{error}</p>}

        <button 
          type="submit" 
          disabled={loading} 
          style={{
            ...primaryBtnStyle,
            height: "60px",
            fontSize: "1.1rem",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            boxShadow: "0 8px 16px rgba(99, 102, 241, 0.3)",
            marginTop: "8px"
          }}
        >
          {loading ? "준비 중..." : "설정 완료 및 시작하기"}
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
