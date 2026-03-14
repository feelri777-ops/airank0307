import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

/** 오늘 날짜 문자열 YYYY-MM-DD */
const today = () => new Date().toISOString().slice(0, 10);

/** 하루 업로드 한도 */
export const DAILY_LIMITS = {
  images: 20,        // 이미지 최대 20장/일
  audios: 5,         // 오디오 최대 5개/일
  totalMB: 50,       // 총 50MB/일
};

/**
 * 사용자의 오늘 업로드 현황을 가져오거나 초기화
 */
export async function getUserUploadStats(uid) {
  const ref = doc(db, "userDailyLimits", uid);
  const snap = await getDoc(ref);
  const d = today();

  if (!snap.exists() || snap.data().date !== d) {
    const fresh = { date: d, images: 0, audios: 0, totalBytes: 0 };
    await setDoc(ref, fresh);
    return fresh;
  }
  return snap.data();
}

/**
 * 업로드 전 한도 체크
 * @param {string} uid
 * @param {"image"|"audio"} type
 * @param {number} bytes 파일 크기
 * @returns {{ ok: boolean, reason?: string }}
 */
export async function checkUploadLimit(uid, type, bytes) {
  const stats = await getUserUploadStats(uid);
  const addedMB = bytes / (1024 * 1024);

  if (stats.totalBytes / (1024 * 1024) + addedMB > DAILY_LIMITS.totalMB) {
    return { ok: false, reason: `오늘 업로드 가능한 총 용량(${DAILY_LIMITS.totalMB}MB)을 초과했습니다.` };
  }
  if (type === "image" && stats.images >= DAILY_LIMITS.images) {
    return { ok: false, reason: `오늘 이미지 업로드 한도(${DAILY_LIMITS.images}장)에 도달했습니다.` };
  }
  if (type === "audio" && stats.audios >= DAILY_LIMITS.audios) {
    return { ok: false, reason: `오늘 오디오 업로드 한도(${DAILY_LIMITS.audios}개)에 도달했습니다.` };
  }
  return { ok: true };
}

/**
 * 업로드 완료 후 카운터 증가
 */
export async function incrementUploadCount(uid, type, bytes) {
  const ref = doc(db, "userDailyLimits", uid);
  const stats = await getUserUploadStats(uid);
  await updateDoc(ref, {
    [type === "image" ? "images" : "audios"]: (stats[type === "image" ? "images" : "audios"] || 0) + 1,
    totalBytes: (stats.totalBytes || 0) + bytes,
  });
}
