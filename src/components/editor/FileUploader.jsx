import { useState, useRef } from "react";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { checkUploadLimit, incrementUploadCount } from "../../utils/rateLimit";
import styled from "styled-components";

/* ── 파일 제한 ── */
const IMAGE_MAX_MB = 5;
const AUDIO_MAX_MB = 10;
const IMAGE_MAX_COUNT = 5;
const AUDIO_MAX_COUNT = 1;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_AUDIO = ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-m4a"];

/* ── NSFW 감지 (TensorFlow.js + nsfwjs CDN 동적 로드) ── */
let nsfwModel = null;
let nsfwLoading = false;

async function loadNSFW() {
  if (nsfwModel) return nsfwModel;
  if (nsfwLoading) {
    // 로딩 중이면 완료 대기
    await new Promise((r) => { const t = setInterval(() => { if (!nsfwLoading) { clearInterval(t); r(); } }, 200); });
    return nsfwModel;
  }
  nsfwLoading = true;
  try {
    // TF.js 로드
    if (!window.tf) {
      await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
    }
    // nsfwjs 로드
    if (!window.nsfwjs) {
      await loadScript("https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/nsfwjs.min.js");
    }
    nsfwModel = await window.nsfwjs.load("https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/quant_nsfw_mobilenet/");
  } catch (e) {
    console.warn("NSFW 모델 로드 실패 (건너뜀):", e);
    nsfwModel = null;
  }
  nsfwLoading = false;
  return nsfwModel;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function isNSFW(file) {
  try {
    const model = await loadNSFW();
    if (!model) return false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise((r) => { img.onload = r; });
    const predictions = await model.classify(img);
    URL.revokeObjectURL(url);
    const unsafe = predictions.filter((p) => ["Porn", "Hentai", "Sexy"].includes(p.className));
    return unsafe.some((p) => p.probability > 0.65);
  } catch {
    return false; // 감지 실패 시 통과 (false negative 허용)
  }
}

/* ── styled ── */
const Section = styled.div`
  border: 1px solid var(--border-primary);
  border-radius: 10px; overflow: hidden; margin-bottom: 0.75rem;
`;
const SectionHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);
`;
const UploadArea = styled.label`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 18px;
  border: 2px dashed var(--border-primary);
  border-radius: 8px; margin: 10px;
  cursor: pointer; transition: all 0.15s;
  color: var(--text-muted); font-size: 0.82rem; text-align: center;
  &:hover { border-color: var(--accent-indigo); background: var(--bg-secondary); color: var(--text-secondary); }
`;
const UploadIcon = styled.div`font-size: 1.6rem;`;
const HiddenInput = styled.input`display: none;`;

const PreviewGrid = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px; padding: 10px;
`;
const ImageThumb = styled.div`
  position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden;
  border: 1px solid var(--border-primary);
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const RemoveBtn = styled.button`
  position: absolute; top: 3px; right: 3px;
  width: 18px; height: 18px; border-radius: 50%; border: none;
  background: rgba(0,0,0,0.6); color: #fff;
  font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  &:hover { background: #ef4444; }
`;
const AudioItem = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px 8px 10px; background: var(--bg-secondary);
  border: 1px solid var(--border-primary); border-radius: 8px; margin: 0 10px 10px;
  font-size: 0.82rem; color: var(--text-secondary);
`;
const AudioName = styled.span`flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const AudioSize = styled.span`color: var(--text-muted); font-size: 0.75rem; flex-shrink: 0;`;

const ProgressWrap = styled.div`
  padding: 6px 10px; background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
`;
const ProgressBar = styled.div`
  height: 4px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;
`;
const ProgressFill = styled.div`
  height: 100%; border-radius: 4px; transition: width 0.15s;
  background: var(--accent-gradient);
  width: ${({ $pct }) => $pct}%;
`;
const ProgressText = styled.div`
  font-size: 0.73rem; color: var(--text-muted); margin-top: 3px;
`;

const ErrorMsg = styled.div`
  margin: 6px 10px; padding: 7px 12px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  border-radius: 7px; font-size: 0.78rem; color: #ef4444;
`;
const LimitInfo = styled.div`
  font-size: 0.72rem; color: var(--text-muted); font-weight: 400;
`;

/* ── 유틸 ── */
const fmtMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1) + "MB";
const uid6 = () => Math.random().toString(36).slice(2, 8);

/* ── 드래그 오버레이 ── */
const DragOverlay = styled.div`
  position: fixed; inset: 0; z-index: 999;
  background: rgba(124, 58, 237, 0.08);
  border: 3px dashed var(--accent-indigo);
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
`;
const DragMsg = styled.div`
  background: var(--bg-card); border-radius: 16px;
  padding: 2rem 3rem; text-align: center;
  box-shadow: var(--shadow-lg);
  font-size: 1.1rem; font-weight: 700; color: var(--accent-indigo);
`;

/* ── 컴포넌트 ── */
export default function FileUploader({ postKey, onInsertImage, onInsertAudio }) {
  const { user } = useAuth();
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const [images, setImages] = useState([]); // { id, file, url, progress, done, error }
  const [audios, setAudios] = useState([]); // { id, file, url, progress, done, error }
  const [checking, setChecking] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  /* ── 드래그 앤 드롭 핸들러 ── */
  const handleDragEnter = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const imgFiles = files.filter((f) => ALLOWED_IMAGE.includes(f.type));
    const audFiles = files.filter((f) => ALLOWED_AUDIO.includes(f.type));
    if (imgFiles.length) await handleImageFiles(imgFiles);
    if (audFiles.length) await handleAudioFile(audFiles[0]);
    if (!imgFiles.length && !audFiles.length) {
      setGlobalError("지원하지 않는 파일 형식입니다. (이미지: jpg/png/gif/webp, 오디오: mp3/m4a/ogg/wav)");
    }
  };

  const uploadFile = (file, type, id, setList) => {
    const path = `community/${user.uid}/${postKey || Date.now()}/${type}/${id}_${file.name}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);

    task.on("state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setList((prev) => prev.map((f) => f.id === id ? { ...f, progress: pct } : f));
      },
      (err) => {
        setList((prev) => prev.map((f) => f.id === id ? { ...f, error: "업로드 실패: " + err.message } : f));
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setList((prev) => prev.map((f) => f.id === id ? { ...f, url, progress: 100, done: true } : f));
        await incrementUploadCount(user.uid, type, file.size);
        if (type === "image") onInsertImage?.(url, file.name);
        else onInsertAudio?.(url, file.name);
      }
    );
  };

  const handleImageFiles = async (files) => {
    setGlobalError("");
    if (!files.length) return;
    if (images.length + files.length > IMAGE_MAX_COUNT) {
      setGlobalError(`이미지는 최대 ${IMAGE_MAX_COUNT}장까지 첨부할 수 있습니다.`); return;
    }
    for (const file of files) {
      if (!ALLOWED_IMAGE.includes(file.type)) {
        setGlobalError(`지원하지 않는 형식: ${file.name} (jpg/png/gif/webp만 가능)`); return;
      }
      if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
        setGlobalError(`${file.name} 파일이 ${IMAGE_MAX_MB}MB를 초과합니다.`); return;
      }
    }
    const limit = await checkUploadLimit(user.uid, "image", files.reduce((a, f) => a + f.size, 0));
    if (!limit.ok) { setGlobalError(limit.reason); return; }
    setChecking(true);
    for (const file of files) {
      const unsafe = await isNSFW(file);
      if (unsafe) {
        setChecking(false);
        setGlobalError(`'${file.name}' 이미지가 커뮤니티 가이드라인을 위반하여 업로드가 차단되었습니다.`);
        return;
      }
    }
    setChecking(false);
    const newItems = files.map((file) => {
      const id = uid6();
      const preview = URL.createObjectURL(file);
      return { id, file, url: preview, progress: 0, done: false, error: null };
    });
    setImages((prev) => [...prev, ...newItems]);
    newItems.forEach(({ id, file }) => uploadFile(file, "image", id, setImages));
  };

  const handleAudioFile = async (file) => {
    setGlobalError("");
    if (!file) return;
    if (audios.length >= AUDIO_MAX_COUNT) {
      setGlobalError(`오디오는 최대 ${AUDIO_MAX_COUNT}개까지 첨부할 수 있습니다.`); return;
    }
    if (!ALLOWED_AUDIO.includes(file.type)) {
      setGlobalError("지원하지 않는 형식입니다. (mp3/m4a/ogg/wav만 가능)"); return;
    }
    if (file.size > AUDIO_MAX_MB * 1024 * 1024) {
      setGlobalError(`파일이 ${AUDIO_MAX_MB}MB를 초과합니다.`); return;
    }
    const limit = await checkUploadLimit(user.uid, "audio", file.size);
    if (!limit.ok) { setGlobalError(limit.reason); return; }
    const id = uid6();
    setAudios((prev) => [...prev, { id, file, url: null, progress: 0, done: false, error: null }]);
    uploadFile(file, "audio", id, setAudios);
  };

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    await handleImageFiles(files);
  };

  const handleAudio = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await handleAudioFile(file);
  };

  const removeImage = (id) => setImages((prev) => prev.filter((f) => f.id !== id));
  const removeAudio = (id) => setAudios((prev) => prev.filter((f) => f.id !== id));

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: "relative" }}
    >
      {dragging && (
        <DragOverlay>
          <DragMsg>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
            <div>여기에 파일을 놓아주세요</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 400, marginTop: "0.4rem", opacity: 0.7 }}>
              이미지 (jpg/png/gif/webp) · 오디오 (mp3/m4a/ogg/wav)
            </div>
          </DragMsg>
        </DragOverlay>
      )}
      {globalError && <ErrorMsg>⚠️ {globalError}</ErrorMsg>}

      {/* ── 이미지 업로드 ── */}
      <Section>
        <SectionHeader>
          <span>🖼️ 이미지 첨부</span>
          <LimitInfo>{images.length}/{IMAGE_MAX_COUNT}장 · 장당 최대 {IMAGE_MAX_MB}MB · JPG/PNG/GIF/WEBP</LimitInfo>
        </SectionHeader>

        {images.length > 0 && (
          <PreviewGrid>
            {images.map((item) => (
              <ImageThumb key={item.id}>
                <img src={item.url} alt={item.file.name} />
                {!item.done && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "0.7rem", fontWeight: 700,
                  }}>{checking ? "검사 중..." : `${item.progress}%`}</div>
                )}
                {item.done && <RemoveBtn onClick={() => removeImage(item.id)}>✕</RemoveBtn>}
                {item.error && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#fff", padding: 4, textAlign: "center" }}>
                    업로드 실패
                  </div>
                )}
              </ImageThumb>
            ))}
          </PreviewGrid>
        )}

        {images.some((f) => !f.done && !f.error) && (
          <ProgressWrap>
            <ProgressBar>
              <ProgressFill $pct={Math.round(images.filter(f=>!f.error).reduce((a,f)=>a+f.progress,0)/Math.max(images.length,1))} />
            </ProgressBar>
            <ProgressText>업로드 중... AI 성인 콘텐츠 필터 검사 포함</ProgressText>
          </ProgressWrap>
        )}

        {images.length < IMAGE_MAX_COUNT && (
          <UploadArea>
            <HiddenInput
              ref={imageInputRef} type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple onChange={handleImages}
            />
            <UploadIcon>📸</UploadIcon>
            <span>클릭하여 이미지 선택</span>
            <span style={{ fontSize: "0.72rem" }}>자동으로 AI 성인 콘텐츠 필터가 적용됩니다</span>
          </UploadArea>
        )}
      </Section>

      {/* ── 오디오 업로드 ── */}
      <Section>
        <SectionHeader>
          <span>🎵 오디오 첨부</span>
          <LimitInfo>{audios.length}/{AUDIO_MAX_COUNT}개 · 최대 {AUDIO_MAX_MB}MB · MP3/M4A/OGG/WAV</LimitInfo>
        </SectionHeader>

        {audios.map((item) => (
          <div key={item.id}>
            <AudioItem>
              <span>🎵</span>
              <AudioName>{item.file.name}</AudioName>
              <AudioSize>{fmtMB(item.file.size)}</AudioSize>
              {item.done
                ? <RemoveBtn style={{ position: "static", width: 22, height: 22 }} onClick={() => removeAudio(item.id)}>✕</RemoveBtn>
                : <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.progress}%</span>
              }
            </AudioItem>
            {!item.done && !item.error && (
              <ProgressWrap>
                <ProgressBar><ProgressFill $pct={item.progress} /></ProgressBar>
                <ProgressText>업로드 중... {item.progress}%</ProgressText>
              </ProgressWrap>
            )}
            {item.error && <ErrorMsg>{item.error}</ErrorMsg>}
          </div>
        ))}

        {audios.length < AUDIO_MAX_COUNT && (
          <UploadArea>
            <HiddenInput
              ref={audioInputRef} type="file"
              accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-m4a"
              onChange={handleAudio}
            />
            <UploadIcon>🎙️</UploadIcon>
            <span>클릭하여 오디오 파일 선택</span>
          </UploadArea>
        )}
      </Section>

      {/* 드래그 안내 */}
      <div style={{ textAlign: "center", fontSize: "0.73rem", color: "var(--text-muted)", padding: "0.3rem 0 0.1rem" }}>
        💡 이미지·오디오 파일을 이 영역으로 드래그하면 바로 업로드됩니다
      </div>
    </div>
  );
}
