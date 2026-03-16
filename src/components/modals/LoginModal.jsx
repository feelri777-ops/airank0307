import { useState } from "react";
import { createPortal } from "react-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const NICK_REGEX = /^[가-힣a-zA-Z0-9]{2,12}$/;

const LoginModal = ({ onClose }) => {
  const { loginWithEmail, registerWithEmail, resendVerificationEmail, loginWithNaver, loginWithKakao } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showResend, setShowResend] = useState(false);

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

  const handleSocialLogin = async (provider) => {
    setError("");
    setMessage("");
    try {
      if (provider === 'naver') {
        await loginWithNaver();
      } else if (provider === 'kakao') {
        await loginWithKakao();
      }
      onClose();
    } catch (err) {
      console.error("소셜 로그인 오류:", err);
      const code = err.code || err.message;
      setError(
        code.includes("popup-closed-by-user")
          ? "로그인이 취소되었습니다." :
        code.includes("cancelled")
          ? "로그인이 취소되었습니다." :
        "로그인 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setShowResend(false);
    try {
      if (isRegister) {
        const trimmed = name.trim();
        if (!trimmed) throw new Error("닉네임을 입력해주세요.");
        if (!NICK_REGEX.test(trimmed)) {
          setError("닉네임은 2~12자, 한글·영문·숫자만 사용 가능합니다.");
          return;
        }
        // 중복 확인
        const dupSnap = await getDocs(query(collection(db, "users"), where("displayName", "==", trimmed)));
        if (!dupSnap.empty) {
          setError("이미 사용 중인 닉네임입니다.");
          return;
        }
        await registerWithEmail(email, password, trimmed);
        setMessage("가입이 완료됐습니다! 메일함을 확인하여 인증 링크를 클릭해주세요.");
        setIsRegister(false);
        setEmail("");
        setPassword("");
      } else {
        await loginWithEmail(email, password);
        onClose();
      }
    } catch (err) {
      if (err.message === "unverified-email") {
        setError("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.");
        setShowResend(true);
      } else if (err.message && !err.code) {
        setError(err.message);
      } else {
        const code = err.code || err.message;
        setError(
          code.includes("auth/invalid-credential") || code.includes("auth/user-not-found") || code.includes("auth/wrong-password")
            ? "이메일 또는 비밀번호가 올바르지 않습니다." :
          code.includes("auth/email-already-in-use")
            ? "이미 사용 중인 이메일입니다." :
          code.includes("auth/weak-password")
            ? "비밀번호는 6자 이상이어야 합니다." :
          code.includes("auth/invalid-email")
            ? "올바른 이메일 형식이 아닙니다." :
          code.includes("auth/too-many-requests")
            ? "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." :
          "오류가 발생했습니다. 다시 시도해주세요."
        );
      }
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        width: "100vw", height: "100vh", zIndex: 9999,
        background: "rgba(0,0,0,0.7)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: "20px",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border-primary)",
          borderRadius: "var(--r-lg)", padding: "2.5rem 2rem 2rem", width: "100%", maxWidth: "380px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)", position: "relative",
          display: "flex", flexDirection: "column", gap: "1.5rem",
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: "20px", right: "20px",
          background: "var(--bg-tertiary)", border: "none", borderRadius: "50%",
          width: "36px", height: "36px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)",
        }}>✕</button>

        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.6rem", color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>
            {isRegister ? "회원가입" : "이메일 로그인"}
          </h2>
        </div>

        {message && (
          <div style={{
            padding: "12px", borderRadius: "var(--r-md)", background: "rgba(34,197,94,0.1)",
            color: "#22c55e", fontSize: "0.85rem", textAlign: "center", border: "1px solid #22c55e"
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {isRegister && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <input
                type="text" placeholder="닉네임 (2~12자, 한글·영문·숫자)" value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ padding: "15px", borderRadius: "var(--r-md)", border: "1px solid var(--border-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "1rem" }}
              />
            </div>
          )}
          <input
            type="email" placeholder="이메일 주소" value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "15px", borderRadius: "var(--r-md)", border: "1px solid var(--border-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "1rem" }}
          />
          <input
            type="password" placeholder="비밀번호" value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "15px", borderRadius: "var(--r-md)", border: "1px solid var(--border-primary)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "1rem" }}
          />

          {error && (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "0 0 8px 0" }}>{error}</p>
              {showResend && (
                <button
                  type="button"
                  onClick={handleResend}
                  style={{ fontSize: "0.82rem", color: "var(--accent-indigo)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  인증 메일 재발송
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <button
              type="submit"
              style={{
                padding: "16px", borderRadius: "var(--r-md)",
                background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
                color: "#fff", border: "none", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer"
              }}
            >
              {isRegister ? "가입 완료 (인증 메일 발송)" : "로그인"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "15px", borderRadius: "var(--r-md)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}>
              취소
            </button>
          </div>
        </form>

        {!isRegister && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "10px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-primary)" }}></div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>또는</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-primary)" }}></div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => handleSocialLogin('naver')}
                style={{
                  padding: "14px", borderRadius: "var(--r-md)",
                  background: "#03C75A", color: "#fff",
                  border: "none", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
              >
                <span style={{ fontSize: "1.2rem", fontWeight: 900 }}>N</span>
                네이버로 로그인
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('kakao')}
                style={{
                  padding: "14px", borderRadius: "var(--r-md)",
                  background: "#FEE500", color: "#000000",
                  border: "none", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>💬</span>
                카카오로 로그인
              </button>
            </div>
          </>
        )}

        <p style={{ textAlign: "center", margin: 0, fontSize: "0.95rem", color: "var(--text-muted)" }}>
          {isRegister ? "이미 계정이 있으신가요?" : "처음이신가요?"} {" "}
          <span onClick={() => { setIsRegister(!isRegister); setError(""); setMessage(""); }} style={{ color: "var(--accent-indigo)", fontWeight: 700, cursor: "pointer", textDecoration: "underline", marginLeft: "4px" }}>
            {isRegister ? "로그인하기" : "회원가입하기"}
          </span>
        </p>
      </div>
    </div>,
    document.body
  );
};

export default LoginModal;
