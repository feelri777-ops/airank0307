import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 관리자 UID 목록 — Firebase 콘솔 Authentication 탭에서 확인 후 추가
const ADMIN_UIDS = [
  "48n4hAjZUbTPR4pBIAJzqivJhp42",
];

// 로컬 환경인지 확인하는 함수
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const isAdmin = (user) => {
  if (isLocal) return true; // 로컬 테스트를 위해 무조건 허용
  if (!user) return false;
  return ADMIN_UIDS.includes(user.uid);
};

export const useAdminGuard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin(user)) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  return { user, isAuthorized: isAdmin(user) };
};
