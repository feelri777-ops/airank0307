/**
 * 갤러리 관련 상수
 */

export const GALLERY_CONFIG = {
  PAGE_SIZE: 12,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TAGS: 10,
  MIN_UPLOAD_INTERVAL: 30000, // 30초
  MAX_DAILY_UPLOADS: 20,
  HONEYPOT_DELAY: 4000, // 4초
};

export const AI_MODELS = [
  { id: "midjourney-v6", name: "Midjourney v6" },
  { id: "midjourney-v5", name: "Midjourney v5" },
  { id: "midjourney-v4", name: "Midjourney v4" },
  { id: "midjourney-niji", name: "Midjourney Niji" },
  { id: "dalle-3", name: "DALL·E 3" },
  { id: "dalle-2", name: "DALL·E 2" },
  { id: "stable-diffusion", name: "Stable Diffusion" },
  { id: "stable-diffusion-xl", name: "Stable Diffusion XL" },
  { id: "leonardo-ai", name: "Leonardo.Ai" },
  { id: "adobe-firefly", name: "Adobe Firefly" },
  { id: "ideogram", name: "Ideogram" },
  { id: "flux", name: "Flux" },
  { id: "other", name: "기타" },
];

export const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "oldest", label: "오래된순" },
];