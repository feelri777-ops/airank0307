#!/usr/bin/env node
/**
 * 갤러리 더미 데이터 시드 스크립트
 * 사용법: node scripts/seed-gallery.js <config.json>
 */

import { readFileSync } from "fs";

const configPath = process.argv[2] || "/tmp/seed-config.json";
const { email: EMAIL, password: PASSWORD } = JSON.parse(readFileSync(configPath, "utf8"));

if (!EMAIL || !PASSWORD) {
  console.error("seed-config.json에 email과 password를 입력해주세요.");
  process.exit(1);
}

const API_KEY = "AIzaSyBgEK1nLoKTTa4tRwhZRQPC7xLQP8lf8NQ";
const PROJECT_ID = "airank0307";

const DUMMY_POSTS = [
  // 풍경
  {
    title: "새벽 한강의 고요",
    description: "새벽 4시, 아무도 없는 한강변에서 혼자 찍은 느낌으로 만들었어요. 안개가 낀 분위기가 마음에 들어요.",
    model: "Midjourney v6",
    prompt: "misty Han River Seoul at dawn, early morning fog, calm water reflection, city lights distant, photorealistic, cinematic",
    tags: ["풍경", "한강", "새벽", "서울"],
    seed: "hanriver_dawn", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "설악산 단풍",
    description: "설악산 단풍철에 가보고 싶어서 만들어봤습니다. 실제보다 더 극적으로 나온 것 같아요 ㅎㅎ",
    model: "Stable Diffusion XL",
    prompt: "Seoraksan mountain autumn foliage, vibrant red orange maple leaves, dramatic sky, Korean mountain landscape, ultra detailed",
    tags: ["풍경", "가을", "설악산", "단풍"],
    seed: "seorak_autumn", w: 1024, h: 768,
    source: "self",
  },
  {
    title: "제주도 에메랄드 바다",
    description: "제주 협재해변 느낌으로 프롬프트 짜봤어요. 실제 사진이라고 해도 믿을 것 같네요.",
    model: "DALL·E 3",
    prompt: "Jeju Island emerald sea beach, white sand, transparent turquoise water, coastal rocks, summer sunshine, aerial view, photorealistic",
    tags: ["풍경", "제주도", "바다", "여름"],
    seed: "jeju_beach", w: 1024, h: 768,
    source: "archiving",
  },
  {
    title: "북한산 운해",
    description: "운해 사진을 늘 찍고 싶었는데 AI로 먼저 체험해봤어요. 언젠간 직접 찍고싶다",
    model: "Midjourney v6",
    prompt: "Bukhansan mountain above the clouds, sea of clouds at sunrise, Buddhist temple visible, Korean mountain scenery, golden hour",
    tags: ["풍경", "북한산", "운해", "일출"],
    seed: "bukhan_cloud", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "겨울 경복궁",
    description: "눈 쌓인 경복궁 상상해서 만들어봤어요. 전통 건축과 눈의 조화가 너무 좋아요",
    model: "Adobe Firefly",
    prompt: "Gyeongbokgung Palace in winter snow, traditional Korean architecture, white snow on rooftops, frozen pond, misty winter morning, hyperrealistic",
    tags: ["풍경", "경복궁", "겨울", "눈"],
    seed: "gyeongbok_snow", w: 1024, h: 768,
    source: "self",
  },

  // 사이버펑크
  {
    title: "2087년 부산 해운대",
    description: "미래의 부산을 상상해봤습니다. 사이버펑크 느낌에 한국적 요소를 섞어봤어요",
    model: "Midjourney v6",
    prompt: "futuristic Haeundae Beach Busan 2087, neon lights reflecting on ocean, cyberpunk skyscrapers, Korean signage in Korean neon, rain wet streets, cinematic",
    tags: ["사이버펑크", "부산", "미래", "네온"],
    seed: "busan_cyber", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "강남 사이버펑크 야경",
    description: "강남을 배경으로 디스토피아 도시 만들어봤어요. 실제 강남이 이렇게 되면 좀 무서울 것 같기도 하고..",
    model: "Stable Diffusion XL",
    prompt: "Gangnam Seoul cyberpunk night scene, massive holographic advertisements Korean text, flying cars, neon rain, ultra detailed, cinematic wide angle",
    tags: ["사이버펑크", "강남", "서울", "야경"],
    seed: "gangnam_cyber", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "사이버펑크 무사",
    description: "사무라이 + 사이버펑크 조합이 너무 좋아서 만들어봤어요. 호리호리한 느낌으로 나온 것 같아요",
    model: "DALL·E 3",
    prompt: "cyberpunk samurai warrior with neon katana, glowing circuit tattoos, full black armor, rainy city background, cinematic lighting",
    tags: ["사이버펑크", "무사", "캐릭터"],
    seed: "cyber_samurai", w: 768, h: 1024,
    source: "archiving",
  },
  {
    title: "네온 지하철역",
    description: "지하철역을 사이버펑크 스타일로 상상했어요. 승객들이 전부 홀로그램 같은 느낌",
    model: "Midjourney v6",
    prompt: "cyberpunk subway station in Seoul, neon signage Korean characters, crowds with AR glasses, holographic billboards, gritty urban atmosphere",
    tags: ["사이버펑크", "지하철", "도시"],
    seed: "cyber_subway", w: 1024, h: 768,
    source: "self",
  },

  // 애니메이션 스타일
  {
    title: "벚꽃 교정의 소녀",
    description: "봄에 교정에서 혼자 책 읽는 소녀 느낌으로 그려봤어요. 지브리 느낌 나는 것 같아서 뿌듯해요",
    model: "NovelAI",
    prompt: "anime girl reading book under cherry blossom tree, school uniform, spring petals falling, warm sunlight, studio ghibli style, soft watercolor",
    tags: ["애니", "벚꽃", "소녀", "봄"],
    seed: "anime_sakura", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "마법소녀 변신씬",
    description: "어릴때 좋아했던 마법소녀물 생각나서 만들어봤어요. 변신씬 느낌이 잘 살아나서 좋아요",
    model: "Midjourney v6",
    prompt: "magical girl transformation scene, sparkles and ribbons, pastel color palette, anime style, dynamic pose, glowing star wand",
    tags: ["애니", "마법소녀", "판타지"],
    seed: "magical_girl", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "이세계 용사",
    description: "전형적인 이세계 주인공 느낌으로 만들어봤어요. 배경도 RPG 마을 느낌으로",
    model: "Stable Diffusion XL",
    prompt: "isekai hero anime style, adventurer outfit, medieval fantasy village background, warm evening light, detailed anime illustration",
    tags: ["애니", "이세계", "판타지", "RPG"],
    seed: "isekai_hero", w: 768, h: 1024,
    source: "archiving",
  },
  {
    title: "도시 야경 로파이",
    description: "로파이 힙합 커버 아트 느낌으로 만들어봤어요. 공부할 때 틀어놓고 싶은 분위기",
    model: "Midjourney v6",
    prompt: "lofi anime aesthetic, girl studying at desk, rainy night city view window, warm lamp light, cozy atmosphere, anime illustration",
    tags: ["애니", "로파이", "감성", "야경"],
    seed: "lofi_study", w: 768, h: 1024,
    source: "self",
  },

  // 인물/초상화
  {
    title: "전통 한복 미인도",
    description: "현대적 감각으로 재해석한 미인도 느낌이에요. 전통과 현대의 중간 어딘가",
    model: "Midjourney v6",
    prompt: "Korean woman in traditional hanbok, modern reinterpretation, elegant pose, soft bokeh background, hyperrealistic portrait, dramatic lighting",
    tags: ["인물", "한복", "전통", "초상화"],
    seed: "hanbok_portrait", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "AI 시대의 예술가",
    description: "AI를 다루는 미래의 예술가를 표현해봤어요. 홀로그램 브러시 아이디어가 마음에 들어요",
    model: "DALL·E 3",
    prompt: "futuristic artist using holographic brush in studio, surrounded by glowing artworks, creative workspace, cinematic portrait",
    tags: ["인물", "미래", "예술가"],
    seed: "future_artist", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "눈빛이 강렬한 노인",
    description: "나이는 들었지만 눈빛만큼은 살아있는 어르신 초상화 만들어봤어요. 사실감이 너무 좋아요",
    model: "Stable Diffusion XL",
    prompt: "elderly Korean man portrait, deep wrinkles, piercing intense eyes, white hair, dramatic chiaroscuro lighting, photorealistic, ultra detailed",
    tags: ["인물", "초상화", "노인"],
    seed: "elder_portrait", w: 768, h: 1024,
    source: "archiving",
  },

  // 건축/도시
  {
    title: "조선시대 상상 도시",
    description: "조선시대가 현대까지 이어졌다면 어떤 모습일까 상상해봤어요. 기와지붕과 고층건물의 조화",
    model: "Midjourney v6",
    prompt: "alternate history Korean city combining Joseon Dynasty architecture with modern skyscrapers, tiled roofs and glass towers, aerial view, golden hour",
    tags: ["건축", "조선", "역사", "상상"],
    seed: "joseon_city", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "미래 서울 스카이라인",
    description: "2150년 서울 스카이라인을 그려봤어요. 수직농장이 빌딩 사이에 있는 게 포인트예요",
    model: "Leonardo AI",
    prompt: "Seoul 2150 futuristic skyline, vertical farms integrated into skyscrapers, floating parks, ultra modern architecture, blue sky, drone view",
    tags: ["건축", "서울", "미래", "도시"],
    seed: "seoul_future", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "물 위의 사원",
    description: "동남아 사원 느낌에 한국적 요소를 섞어봤어요. 물에 반사된 모습이 너무 예쁘게 나왔어요",
    model: "Adobe Firefly",
    prompt: "ancient temple on water, reflection in still lake, misty mountains, lotus flowers, morning light, Asian architecture, photorealistic",
    tags: ["건축", "사원", "물", "아시아"],
    seed: "water_temple", w: 1024, h: 768,
    source: "archiving",
  },

  // 판타지
  {
    title: "구름 위의 왕국",
    description: "하늘에 떠있는 판타지 왕국이에요. 어릴 때 꿈꾸던 세계 같아서 애착가는 작품이에요",
    model: "Midjourney v6",
    prompt: "floating kingdom above clouds, fantasy castle with waterfalls cascading into sky, golden sunbeams, epic scale, digital painting",
    tags: ["판타지", "왕국", "하늘", "성"],
    seed: "sky_kingdom", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "숲의 정령",
    description: "한국 전통 설화에 나오는 산신령 느낌으로 만들어봤어요. 나무가 변신한 존재 같은",
    model: "DALL·E 3",
    prompt: "ancient forest spirit made of glowing roots and leaves, Korean mythological style, ethereal presence, deep forest, mystical light",
    tags: ["판타지", "정령", "숲", "한국신화"],
    seed: "forest_spirit", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "얼음 마법사",
    description: "얼음 원소를 다루는 마법사 캐릭터 콘셉트아트예요. 파란 팔레트로만 구성해봤어요",
    model: "Stable Diffusion XL",
    prompt: "ice mage casting spell, blue ice crystals erupting, dramatic pose, fantasy character concept art, detailed armor, cold atmosphere",
    tags: ["판타지", "마법사", "얼음", "캐릭터"],
    seed: "ice_mage", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "불사조 부활",
    description: "불사조가 재탄생하는 순간을 포착해봤어요. 불꽃과 빛의 표현이 마음에 들어요",
    model: "Midjourney v6",
    prompt: "phoenix rising from ashes, dramatic fire explosion, golden feathers glowing, epic fantasy moment, cinematic lighting, ultra detailed",
    tags: ["판타지", "불사조", "불꽃"],
    seed: "phoenix_rise", w: 1024, h: 768,
    source: "archiving",
  },

  // 추상/아트
  {
    title: "감정의 소용돌이",
    description: "복잡한 감정 상태를 추상화로 표현해봤어요. 빨강과 파랑의 대립이 포인트예요",
    model: "Stable Diffusion XL",
    prompt: "abstract emotional art, swirling colors red and blue clashing, fluid dynamics, expressive painting, turbulent motion, digital art",
    tags: ["추상", "감정", "아트"],
    seed: "emotion_swirl", w: 1024, h: 1024,
    source: "self",
  },
  {
    title: "기하학적 명상",
    description: "명상할 때 보이는 기하학적 패턴 같은 느낌이에요. 보고있으면 이상하게 집중이 돼요",
    model: "Midjourney v6",
    prompt: "sacred geometry mandala, intricate golden patterns, deep purple background, meditative abstract art, symmetric, glowing",
    tags: ["추상", "기하학", "명상", "만다라"],
    seed: "geo_meditate", w: 1024, h: 1024,
    source: "self",
  },
  {
    title: "빛의 파편",
    description: "유리가 산산조각 나면서 빛이 퍼지는 순간을 추상적으로 표현했어요",
    model: "Adobe Firefly",
    prompt: "shattered light abstract art, glass fragments becoming light beams, rainbow spectrum, dark background, ultra detailed macro",
    tags: ["추상", "빛", "유리"],
    seed: "shattered_light", w: 1024, h: 768,
    source: "archiving",
  },

  // 우주/SF
  {
    title: "행성 탐사대",
    description: "붉은 행성에 첫 발자국을 내딛는 순간이에요. 우주복 디테일이 마음에 들어요",
    model: "Midjourney v6",
    prompt: "astronaut first step on alien red planet, distant star system visible, dramatic sky two moons, cinematic epic scale, NASA style",
    tags: ["우주", "SF", "탐사"],
    seed: "planet_explorer", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "은하수 여행",
    description: "은하 중심부를 여행하는 우주선이에요. 스케일감을 강조하고 싶었어요",
    model: "Leonardo AI",
    prompt: "spacecraft traveling through colorful nebula, massive galaxy in background, hyperdetailed stars, space opera scale, epic cinematic",
    tags: ["우주", "SF", "은하"],
    seed: "galaxy_voyage", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "우주 정거장 석양",
    description: "지구 궤도의 우주정거장에서 바라보는 석양이에요. 지구가 절반쯤 보이는 뷰가 포인트",
    model: "DALL·E 3",
    prompt: "space station viewing Earth at sunset from orbit, curved horizon, solar panels glowing, half lit planet below, photorealistic",
    tags: ["우주", "지구", "우주정거장"],
    seed: "station_sunset", w: 1024, h: 576,
    source: "archiving",
  },

  // 음식/일상
  {
    title: "한식 코스 요리",
    description: "AI한테 최고급 한식 코스 차려달라고 했어요. 실제로 먹고싶다...",
    model: "DALL·E 3",
    prompt: "luxury Korean cuisine course meal, traditional ceramic tableware, bibimbap japchae bulgogi presented elegantly, soft studio lighting, food photography",
    tags: ["음식", "한식", "푸드포토"],
    seed: "korean_food", w: 1024, h: 768,
    source: "self",
  },
  {
    title: "아늑한 카페",
    description: "비 오는 날 창가 자리에 앉아서 커피 마시는 느낌으로 만들었어요",
    model: "Midjourney v6",
    prompt: "cozy Korean cafe corner seat, rainy window, hot coffee steam, warm ambient lighting, soft bokeh, film photography aesthetic",
    tags: ["음식", "카페", "감성", "비"],
    seed: "cozy_cafe", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "야식의 유혹",
    description: "밤 11시 치킨+맥주 느낌으로 만들어봤어요. 한국인이라면 이해할 것 같아요 ㅋㅋ",
    model: "Stable Diffusion XL",
    prompt: "Korean fried chicken and cold beer on wooden table, late night snack, warm kitchen light, steam rising, appetizing food photography",
    tags: ["음식", "치킨", "야식"],
    seed: "night_chicken", w: 1024, h: 768,
    source: "archiving",
  },

  // 자연/동물
  {
    title: "백두산 천지",
    description: "백두산 천지를 AI로 구현해봤어요. 언제쯤 직접 가볼 수 있을지...",
    model: "Midjourney v6",
    prompt: "Paektu Mountain Cheonji Lake Korea, crystal clear volcanic crater lake, dramatic cloudy sky, autumn mountain panorama, cinematic landscape",
    tags: ["자연", "백두산", "천지", "풍경"],
    seed: "paektu_lake", w: 1024, h: 576,
    source: "self",
  },
  {
    title: "호랑이의 눈빛",
    description: "한국 호랑이 느낌으로 만들어봤어요. 눈빛이 너무 강렬하게 나왔어요",
    model: "DALL·E 3",
    prompt: "Korean Siberian tiger closeup portrait, intense amber eyes, snowy forest background, breath visible in cold air, ultra photorealistic",
    tags: ["자연", "동물", "호랑이"],
    seed: "tiger_eye", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "청사초롱 반딧불",
    description: "여름밤 반딧불이 날아다니는 장면이에요. 무릉도원 같은 느낌",
    model: "Midjourney v6",
    prompt: "fireflies glowing in bamboo forest at night, Korean traditional lantern, magical summer evening, long exposure photography aesthetic",
    tags: ["자연", "반딧불", "대나무숲", "여름"],
    seed: "firefly_bamboo", w: 1024, h: 768,
    source: "self",
  },

  // 스팀펑크
  {
    title: "증기 거인",
    description: "스팀펑크 세계관의 전투용 거대 기계예요. 도시 위에 우뚝 선 모습이 포인트",
    model: "Stable Diffusion XL",
    prompt: "steampunk giant mech over Victorian city, brass gears and steam pipes, battle ready, dramatic overcast sky, sepia toned, ultra detailed",
    tags: ["스팀펑크", "기계", "SF"],
    seed: "steam_giant", w: 1024, h: 768,
    source: "self",
  },
  {
    title: "비행정의 시대",
    description: "하늘을 비행선이 날아다니는 스팀펑크 세계관이에요. 모험을 떠나고 싶어지는 그림",
    model: "Midjourney v6",
    prompt: "steampunk airship fleet above clouds, Victorian era aesthetics, brass and bronze vessels, adventure atmosphere, golden hour light",
    tags: ["스팀펑크", "비행선", "모험"],
    seed: "airship_fleet", w: 1024, h: 576,
    source: "archiving",
  },

  // 실사풍
  {
    title: "빛이 스며드는 골목",
    description: "오래된 동네 골목에 빛이 들어오는 순간을 포착했어요. 어느 도시인지 모를 그런 골목",
    model: "Midjourney v6",
    prompt: "narrow alley with warm sunlight streaming through, weathered walls with plants, puddles reflecting light, cinematic realistic photo",
    tags: ["실사", "골목", "빛"],
    seed: "sunny_alley", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "비 오는 퇴근길",
    description: "퇴근하다가 비 만난 느낌이에요. 우산 하나로 버티던 그 기억",
    model: "DALL·E 3",
    prompt: "lone person walking with umbrella in heavy rain, wet city street evening, neon reflections on pavement, melancholic atmosphere, realistic",
    tags: ["실사", "비", "도시", "감성"],
    seed: "rain_walk", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "해질녘 어부",
    description: "서해 노을에 배 타고 나가는 어부 할아버지 느낌이에요. 평화롭다",
    model: "Adobe Firefly",
    prompt: "elderly Korean fisherman on small boat at golden sunset, Yellow Sea, calm water reflection, warm tones, cinematic documentary photography",
    tags: ["실사", "어부", "노을", "바다"],
    seed: "fisherman_sunset", w: 1024, h: 768,
    source: "archiving",
  },

  // 감성/무드
  {
    title: "첫눈 오던 날",
    description: "첫눈이 오던 날 생각나서 만들었어요. 그때 연락을 못했던 사람이 생각나네요",
    model: "Midjourney v6",
    prompt: "first snowfall of winter, person standing in snow at night, streetlamps halo, quiet city, emotional nostalgic mood, soft film grain",
    tags: ["감성", "눈", "겨울", "추억"],
    seed: "first_snow", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "오래된 책방",
    description: "사라져가는 동네 책방 느낌이에요. 먼지 냄새까지 느껴지는 것 같아요",
    model: "Stable Diffusion XL",
    prompt: "old Korean bookstore, floor to ceiling shelves, warm dusty light, elderly owner reading, nostalgic atmosphere, film photography style",
    tags: ["감성", "책방", "노스탤지아"],
    seed: "old_bookstore", w: 768, h: 1024,
    source: "self",
  },
  {
    title: "엄마의 손",
    description: "손이 많이 거칠어진 엄마 손 생각하면서 만들었어요. 뭔가 울컥하게 되더라고요",
    model: "DALL·E 3",
    prompt: "close up of elderly mother's hands holding young child hands, wrinkled skin, warm afternoon light, emotional intimate family moment, soft focus",
    tags: ["감성", "가족", "손", "따뜻함"],
    seed: "mothers_hands", w: 1024, h: 768,
    source: "archiving",
  },

  // 로고/그래픽
  {
    title: "한국 전통 문양 현대화",
    description: "단청 문양을 현대적 그래픽 디자인으로 재해석해봤어요. 브랜딩에 써도 좋을 것 같아요",
    model: "Midjourney v6",
    prompt: "modern reinterpretation of Korean dancheong patterns, flat design, vibrant colors, minimalist logo aesthetic, geometric symmetry",
    tags: ["그래픽", "한국전통", "디자인", "로고"],
    seed: "dancheong_modern", w: 1024, h: 1024,
    source: "self",
  },
  {
    title: "봄 포스터",
    description: "봄 축제 포스터 느낌으로 만들었어요. 벚꽃이 가득한 타이포그래피",
    model: "Adobe Firefly",
    prompt: "spring festival poster design, cherry blossom elements, Korean typographic aesthetic, pastel pink and white, elegant layout, print ready",
    tags: ["그래픽", "봄", "포스터", "벚꽃"],
    seed: "spring_poster", w: 768, h: 1024,
    source: "self",
  },
];

const DUMMY_USERS = [
  { name: "하늘그림체", photo: "https://ui-avatars.com/api/?name=%ED%95%98%EB%8A%98%EA%B7%B8%EB%A6%BC%EC%B2%B4&background=6366f1&color=fff" },
  { name: "달빛화백", photo: "https://ui-avatars.com/api/?name=%EB%8B%AC%EB%B9%9B%ED%99%94%EB%B0%B1&background=8b5cf6&color=fff" },
  { name: "픽셀장인", photo: "https://ui-avatars.com/api/?name=%ED%94%BD%EC%85%80%EC%9E%A5%EC%9D%B8&background=06b6d4&color=fff" },
  { name: "AI탐정", photo: "https://ui-avatars.com/api/?name=AI%ED%83%90%EC%A0%95&background=f59e0b&color=fff" },
  { name: "프롬요리사", photo: "https://ui-avatars.com/api/?name=%ED%94%84%EB%A1%AC%EC%9A%94%EB%A6%AC%EC%82%AC&background=10b981&color=fff" },
  { name: "상상공장", photo: "https://ui-avatars.com/api/?name=%EC%83%81%EC%83%81%EA%B3%B5%EC%9E%A5&background=ef4444&color=fff" },
  { name: "미래화가", photo: "https://ui-avatars.com/api/?name=%EB%AF%B8%EB%9E%98%ED%99%94%EA%B0%80&background=ec4899&color=fff" },
  { name: "빛과그림자", photo: "https://ui-avatars.com/api/?name=%EB%B9%9B%EA%B3%BC%EA%B7%B8%EB%A6%BC%EC%9E%90&background=14b8a6&color=fff" },
];

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`로그인 실패: ${JSON.stringify(data)}`);
  console.log(`✅ 로그인 성공: ${data.email}`);
  return data.idToken;
}

async function createPost(idToken, post, user, index) {
  const imageUrl = `https://picsum.photos/seed/${post.seed}/${post.w}/${post.h}`;
  const likeCount = Math.floor(Math.random() * 120);
  const createdAt = new Date(Date.now() - (DUMMY_POSTS.length - index) * 3600000 * 8);

  const tagsValues = (post.tags || []).map((t) => ({ stringValue: t }));

  const body = {
    fields: {
      imageUrl: { stringValue: imageUrl },
      storagePath: { stringValue: "" },
      uid: { stringValue: `dummy_${index % DUMMY_USERS.length}` },
      displayName: { stringValue: user.name },
      photoURL: { stringValue: user.photo },
      title: { stringValue: post.title },
      description: { stringValue: post.description },
      modelName: { stringValue: post.model },
      prompt: { stringValue: post.prompt },
      tags: { arrayValue: { values: tagsValues } },
      visibility: { stringValue: "public" },
      source: { stringValue: post.source },
      likeCount: { integerValue: likeCount },
      likedBy: { arrayValue: { values: [] } },
      createdAt: { timestampValue: createdAt.toISOString() },
    },
  };

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/galleryPosts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`문서 생성 실패 [${index}]: ${JSON.stringify(err)}`);
  }
  console.log(`  📸 ${index + 1}. [${post.tags[0]}] ${post.title} — ${user.name}`);
}

async function main() {
  console.log("🌱 갤러리 더미 데이터 생성 시작...\n");
  const idToken = await signIn();
  console.log("\n📸 더미 게시물 생성 중...");

  for (let i = 0; i < DUMMY_POSTS.length; i++) {
    const user = DUMMY_USERS[i % DUMMY_USERS.length];
    await createPost(idToken, DUMMY_POSTS[i], user, i);
  }

  console.log(`\n✅ 완료! ${DUMMY_POSTS.length}개의 더미 게시물이 생성됐습니다.`);
}

main().catch((e) => { console.error("❌ 오류:", e.message); process.exit(1); });
