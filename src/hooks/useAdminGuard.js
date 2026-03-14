import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 관리자 UID 목록 — Firebase 콘솔 Authentication 탭에서 확인 후 추가
export const ADMIN_UIDS = [
  "REPLACE_WITH_YOUR_FIREBASE_UID",
];

export const isAdmin = (user) => user && ADMIN_UIDS.includes(user.uid);

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
