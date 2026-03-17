const GlobalStyles = () => (
  <style>{`
    /* ── Google Fonts 로드 ── */
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:ital,wght@0,500;1,500&display=swap');

    :root {
      /* ── 브라운 크림 라이트 테마 ── */
      --bg-primary: #F5EFE8;
      --bg-secondary: #EDE5DB;
      --bg-tertiary: #E2D8CC;
      --bg-card: #FBF8F4;
      --bg-card-hover: #F2EBE2;
      --bg-nav: rgba(245, 239, 232, 0.93);
      --text-primary: #1C1008;
      --text-secondary: #6B5A4E;
      --text-muted: #A08878;
      --border-primary: #D4C4B4;
      --border-hover: rgba(161, 100, 60, 0.4);
      --accent-indigo: #8B5E3C;
      --accent-cyan: #6B4226;
      --accent-gradient: linear-gradient(135deg, #8B5E3C, #C4874A);
      --color-green: #10B981;
      --color-red: #EF4444;
      --color-gold: #D4870A;
      --color-silver: #94A3B8;
      --color-bronze: #B86020;
      --shadow-sm: 0 1px 2px rgba(80, 50, 20, 0.07);
      --shadow-md: 0 4px 16px rgba(80, 50, 20, 0.11);
      --shadow-lg: 0 12px 40px rgba(80, 50, 20, 0.14);
      --shadow-card: 0 1px 3px rgba(80, 50, 20, 0.07), 0 1px 2px rgba(80, 50, 20, 0.05);
      --r-xs: 6px;
      --r-sm: 10px;
      --r-md: 14px;
      --r-lg: 20px;
      --r-pill: 999px;
      --r-circle: 50%;
      --blob-opacity: 0.05;
      --noise-opacity: 0.015;
      --ticker-bg: rgba(139, 94, 60, 0.05);
      --ticker-border: rgba(180, 140, 100, 0.25);
      --tag-bg: rgba(139, 94, 60, 0.08);
      --tag-color: #7A4E28;
      --tag-border: rgba(139, 94, 60, 0.2);
      --modal-overlay: rgba(28, 16, 8, 0.38);
      --font-main: 'Pretendard', -apple-system, 'Segoe UI', sans-serif;
      --font-title: 'Pretendard', -apple-system, 'Segoe UI', sans-serif;
      --rank1-bg: #FFF4DC;
      --rank2-bg: #F0EBE4;
      --rank3-bg: #FAE8D8;
      --rank1-shadow: var(--shadow-md);
      --rank2-shadow: var(--shadow-md);
      --rank3-shadow: var(--shadow-md);
    }

    [data-theme="dark"] {
      --bg-primary: #0a0a0a;
      --bg-secondary: #111111;
      --bg-tertiary: #1a1a1a;
      --bg-card: #111111;
      --bg-card-hover: #1a1a1a;
      --bg-nav: rgba(10, 10, 10, 0.94);
      --text-primary: #ffffff;
      --text-secondary: #888888;
      --text-muted: #505050;
      --border-primary: rgba(255, 255, 255, 0.07);
      --border-hover: rgba(99, 102, 241, 0.4);
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.5);
      --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.6);
      --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.4);
      --blob-opacity: 0.12;
      --noise-opacity: 0.3;
      --ticker-bg: rgba(6, 182, 212, 0.04);
      --ticker-border: rgba(6, 182, 212, 0.12);
      --tag-bg: rgba(99, 102, 241, 0.15);
      --tag-color: #818cf8;
      --tag-border: rgba(99, 102, 241, 0.3);
      --modal-overlay: rgba(0, 0, 0, 0.8);
      --rank1-bg: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 50%, rgba(245, 158, 11, 0.12) 100%);
      --rank2-bg: linear-gradient(135deg, rgba(148, 163, 184, 0.12) 0%, rgba(148, 163, 184, 0.04) 50%, rgba(148, 163, 184, 0.12) 100%);
      --rank3-bg: linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(217, 119, 6, 0.04) 50%, rgba(217, 119, 6, 0.12) 100%);
      --rank1-shadow: 0 0 20px rgba(245, 158, 11, 0.15), inset 0 0 12px rgba(245, 158, 11, 0.05);
      --rank2-shadow: 0 0 20px rgba(148, 163, 184, 0.15), inset 0 0 12px rgba(148, 163, 184, 0.05);
      --rank3-shadow: 0 0 20px rgba(217, 119, 6, 0.15), inset 0 0 12px rgba(217, 119, 6, 0.05);
    }


    [data-theme="mono"] {
      --bg-primary: #1c1c1c;
      --bg-secondary: #242424;
      --bg-tertiary: #2e2e2e;
      --bg-card: #242424;
      --bg-card-hover: #2e2e2e;
      --bg-nav: rgba(28, 28, 28, 0.94);
      --text-primary: #ffffff;
      --text-secondary: #a0a0a0;
      --text-muted: #606060;
      --border-primary: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(255, 255, 255, 0.25);
      --accent-indigo: #c0c0c0;
      --accent-cyan: #808080;
      --accent-gradient: linear-gradient(135deg, #e0e0e0, #707070);
      --color-green: #9a9a9a;
      --color-red: #c0c0c0;
      --color-gold: #b0b0b0;
      --color-silver: #787878;
      --color-bronze: #909090;
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.5);
      --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.3);
      --blob-opacity: 0.06;
      --noise-opacity: 0.2;
      --ticker-bg: rgba(255, 255, 255, 0.03);
      --ticker-border: rgba(255, 255, 255, 0.08);
      --tag-bg: rgba(255, 255, 255, 0.08);
      --tag-color: #b0b0b0;
      --tag-border: rgba(255, 255, 255, 0.12);
      --modal-overlay: rgba(0, 0, 0, 0.7);
      --rank1-bg: rgba(255, 255, 255, 0.04);
      --rank2-bg: rgba(255, 255, 255, 0.03);
      --rank3-bg: rgba(255, 255, 255, 0.02);
    }

    [data-theme="pure"] {
      --bg-primary: #fcfcfc;
      --bg-secondary: #f4f4f4;
      --bg-tertiary: #eeeeee;
      --bg-card: #ffffff;
      --bg-card-hover: #fafafa;
      --bg-nav: rgba(252, 252, 252, 0.95);
      --text-primary: #000000;
      --text-secondary: #444444;
      --text-muted: #888888;
      --border-primary: #e5e5e5;
      --border-hover: #000000;
      --accent-indigo: #000000;
      --accent-cyan: #333333;
      --accent-gradient: linear-gradient(135deg, #000000, #444444);
      --color-green: #000000;
      --color-red: #000000;
      --color-gold: #000000;
      --color-silver: #888888;
      --color-bronze: #444444;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.1);
      --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
      --blob-opacity: 0.02;
      --noise-opacity: 0.01;
      --ticker-bg: #f4f4f4;
      --ticker-border: #e5e5e5;
      --tag-bg: #f0f0f0;
      --tag-color: #000000;
      --tag-border: #dddddd;
      --modal-overlay: rgba(0, 0, 0, 0.5);
      --rank1-bg: #ffffff;
      --rank2-bg: #ffffff;
      --rank3-bg: #ffffff;
      --rank1-shadow: 0 0 0 2px #000;
      --rank2-shadow: 0 0 0 1px #888;
      --rank3-shadow: 0 0 0 1px #aaa;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; overflow-x: clip; position: relative;
    }
    body {
      font-family: var(--font-main);
      font-size: 16px;
      font-weight: 500;
      letter-spacing: -0.01em;
      line-height: 1.65;
      background: var(--bg-primary);
      color: var(--text-primary);
      transition: background 0.35s ease, color 0.35s ease;
    }

    /* ── 네비게이션 ── */
    .navbar-header {
      position: sticky; top: 0; z-index: 100;
      border-bottom: 1px solid var(--border-primary);
      backdrop-filter: blur(16px);
      background: var(--bg-nav);
      display: flex; flex-direction: column;
    }
    .navbar-top-row {
      display: flex; align-items: center; justify-content: space-between;
      height: 64px; padding: 0 1.5rem; width: 100%;
    }
    .navbar-actions { display: flex; align-items: center; gap: 10px; }
    
    .navbar-login-btn {
      padding: 7px 16px; border-radius: var(--r-xs); border: 1px solid var(--border-primary);
      background: var(--bg-secondary); color: var(--text-primary); font-size: 0.82rem;
      font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px;
      white-space: nowrap; transition: all 0.2s ease; box-shadow: var(--shadow-sm);
    }

    .navbar-nav {
      display: flex; gap: 0.25rem; align-items: center; justify-content: center;
      transition: all 0.3s ease;
    }
    @media (min-width: 851px) {
      .navbar-nav { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
    }
    @media (max-width: 850px) {
      .navbar-nav {
        width: 100%; padding: 8px 1rem; border-top: 1px solid var(--border-primary);
        justify-content: flex-start; overflow-x: auto; white-space: nowrap; scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .navbar-nav::-webkit-scrollbar { display: none; }
      .navbar-top-row { height: 60px; padding: 0 1rem; }
    }

    .nav-link {
      padding: 6px 14px; border-radius: var(--r-xs); text-decoration: none;
      color: var(--text-secondary); font-size: 0.82rem; transition: all 0.2s ease; white-space: nowrap;
      font-family: var(--font-main);
    }
    .nav-link.active { background: var(--accent-gradient); color: #fff !important; font-weight: 600; }

    /* ── 모바일 뉴스 박스 ── */
    .mobile-news-box {
      display: none;
      background: var(--bg-card);
      border: 1px solid var(--border-primary);
      border-radius: var(--r-sm);
      padding: 1.2rem;
      margin-top: 24px;
      margin-bottom: 40px;
      box-shadow: var(--shadow-card);
    }
    .mobile-news-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .mobile-news-list { display: flex; flex-direction: column; gap: 10px; }
    .mobile-news-item {
      display: flex; gap: 8px; text-decoration: none; color: var(--text-primary);
      font-size: 0.85rem; line-height: 1.4; padding: 4px 0;
    }
    .mobile-news-item .dot { color: var(--accent-indigo); font-weight: bold; }
    .mobile-news-item:hover .title { text-decoration: underline; }

    @media (max-width: 1100px) {
      .mobile-news-box { display: block; }
    }

    /* ── 정렬 및 그리드 ── */
    .sort-container {
      display: flex; justify-content: flex-end; gap: 4px; margin-bottom: 8px;
      overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
    }
    .sort-container::-webkit-scrollbar { display: none; }
    @media (max-width: 768px) { .sort-container { justify-content: flex-start !important; } }

    /* FilterBar 행 - PC 3열: 중앙 정렬 / 태블릿·모바일: 좌측 스크롤 */
    .filter-row { justify-content: center; }
    @media (max-width: 1279px) { .filter-row { justify-content: flex-start; } }

    /* sort-middle-col: grid row 2, 첫 컬럼 (main content) 고정 */
    .sort-middle-col { grid-column: 1; grid-row: 2; min-width: 0; }

    /* 사이드바·main을 row 3에 고정 → sort 버튼 높이만큼 시작점 맞춤 */
    .main-grid > main,
    .main-grid > .sidebar-right { grid-row: 3; }

    /* grid item 우측 잘림 방지 */
    .main-grid > * { min-width: 0; }
    .tools-grid > * { min-width: 0; overflow: hidden; }

    .sort-btn {
      padding: 6px 12px; border-radius: var(--r-xs); border: none; background: transparent;
      color: var(--text-muted); font-size: 0.75rem; cursor: pointer; white-space: nowrap;
      font-family: var(--font-main);
    }
    .sort-btn.active { background: var(--bg-tertiary); color: var(--text-primary); font-weight: 600; }

    .main-grid {
      display: grid; grid-template-columns: 1fr 380px; column-gap: 24px; row-gap: 8px;
      max-width: 1400px; margin: 0 auto; padding: 0 1.5rem; width: 100%;
      align-items: start;
    }
    .tools-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; width: 100%; }

    @media (max-width: 1279px) {
      .main-grid { grid-template-columns: 1fr 300px; }
    }
    @media (max-width: 900px) {
      .main-grid { grid-template-columns: 1fr !important; padding: 0 1.25rem; }
      .sidebar-right { display: none !important; }
    }
    @media (max-width: 768px) {
      .main-grid { padding: 0 1rem; }
    }
    @media (max-width: 480px) {
      .tools-grid { grid-template-columns: 1fr !important; gap: 6px; }
    }

    /* 드롭다운 등 기타 스타일 유지 */
    .navbar-dropdown {
      position: absolute; top: calc(100% + 10px); right: 0;
      background: var(--bg-card); border: 1px solid var(--border-primary);
      border-radius: var(--r-xs); padding: 8px; min-width: 240px; z-index: 200;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      max-height: calc(100vh - 80px); overflow-y: auto;
    }
    .dropdown-item { display: block; width: 100%; padding: 6px 8px; border-radius: var(--r-xs); color: var(--text-primary); font-size: 0.82rem; text-decoration: none; text-align: left; background: transparent; border: none; cursor: pointer; }
    .dropdown-item:hover { background: var(--bg-tertiary); }
    .dropdown-divider { height: 1px; background: var(--border-primary); margin: 6px 0; }
    .dropdown-label { font-size: 0.65rem; font-weight: 600; color: var(--text-muted); padding: 4px 8px 6px; }

    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-dot { 0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.2); } 50% { box-shadow: 0 0 0 5px rgba(34,197,94,0.08); } }
    @keyframes glowPulseGold {
      0%, 100% { box-shadow: 0 0 8px rgba(245,158,11,0.35); }
      50% { box-shadow: 0 0 22px rgba(245,158,11,0.75), 0 0 44px rgba(245,158,11,0.25); }
    }
    @keyframes glowPulseSilver {
      0%, 100% { box-shadow: 0 0 6px rgba(148,163,184,0.28); }
      50% { box-shadow: 0 0 18px rgba(148,163,184,0.65), 0 0 36px rgba(148,163,184,0.2); }
    }
    @keyframes rankSparkGold {
      0%   { text-shadow: 0 0 4px #f59e0b, 0 0 8px #f59e0b66; }
      12%  { text-shadow: 0 0 22px #fde68a, 0 0 42px #f59e0bcc, 0 0 72px #f59e0b55, 0 0 5px #fffae0; }
      25%  { text-shadow: 0 0 4px #f59e0b, 0 0 8px #f59e0b44; }
      45%  { text-shadow: 0 0 16px #fbbf24, 0 0 30px #f59e0baa, 0 0 52px #f59e0b44; }
      65%  { text-shadow: 0 0 4px #f59e0b, 0 0 8px #f59e0b44; }
      80%  { text-shadow: 0 0 30px #fff4b0, 0 0 58px #fbbf24ee, 0 0 95px #f59e0b66, 0 0 8px #fffde0; }
      100% { text-shadow: 0 0 4px #f59e0b, 0 0 8px #f59e0b66; }
    }
    @keyframes rankSparkSilver {
      0%   { text-shadow: 0 0 4px #a8b8cc, 0 0 8px #94a3b866; }
      12%  { text-shadow: 0 0 24px #f0f5ff, 0 0 44px #dde6f0cc, 0 0 75px #94a3b855, 0 0 6px #ffffff; }
      25%  { text-shadow: 0 0 4px #94a3b8, 0 0 8px #94a3b844; }
      45%  { text-shadow: 0 0 18px #e2eaf4, 0 0 34px #c0d0e0aa, 0 0 56px #94a3b844; }
      65%  { text-shadow: 0 0 4px #94a3b8, 0 0 8px #94a3b844; }
      80%  { text-shadow: 0 0 32px #f8faff, 0 0 62px #e8eef8ee, 0 0 100px #94a3b866, 0 0 10px #ffffff; }
      100% { text-shadow: 0 0 4px #a8b8cc, 0 0 8px #94a3b866; }
    }
    @keyframes rankSparkBronze {
      0%   { text-shadow: 0 0 4px #c77d3a, 0 0 8px #c77d3a66; }
      12%  { text-shadow: 0 0 20px #f5c580, 0 0 38px #d4954ecc, 0 0 65px #c77d3a55, 0 0 4px #ffe8b8; }
      25%  { text-shadow: 0 0 4px #c77d3a, 0 0 8px #c77d3a44; }
      45%  { text-shadow: 0 0 14px #dea060, 0 0 28px #c77d3aaa, 0 0 48px #c77d3a44; }
      65%  { text-shadow: 0 0 4px #c77d3a, 0 0 8px #c77d3a44; }
      80%  { text-shadow: 0 0 26px #ffd090, 0 0 50px #e8975aee, 0 0 82px #c77d3a66, 0 0 7px #fff0d0; }
      100% { text-shadow: 0 0 4px #c77d3a, 0 0 8px #c77d3a66; }
    }
    @keyframes scoreGrow { from { width: 0; } }
    @keyframes sparkDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes sparkFade { from { fill-opacity: 0; } to { fill-opacity: 0.12; } }
    @keyframes sparkDot { from { opacity: 0; } to { opacity: 1; } }
    .rank-card-glow { position: relative; overflow: hidden; }
    .rank-card-glow::after {
      content: ''; position: absolute; inset: 0; border-radius: inherit;
      background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
      background-size: 200% 100%; animation: shine 3s infinite linear; pointer-events: none;
    }
    @keyframes shine { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  `}</style>
);

export default GlobalStyles;
