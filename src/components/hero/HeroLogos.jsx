import { useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useTools } from "../../context/ToolContext";

const LOGO_OVERRIDES = {
  "notebooklm.google.com": "https://www.google.com/s2/favicons?domain=notebooklm.google&sz=64",
};

const getFaviconUrl = (url) => {
  try {
    const hostname = new URL(url).hostname;
    if (LOGO_OVERRIDES[hostname]) return LOGO_OVERRIDES[hostname];
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch { return null; }
};

const LEFT_SLOTS = [
  { offset: 10,  top: "5%",  size: 70, delay: 0,   dur: 10.2, rot: -8  },
  { offset: 280, top: "18%", size: 62, delay: 1.2, dur: 12.0, rot: 6   },
  { offset: 60,  top: "38%", size: 58, delay: 2.0, dur: 8.8, rot: -4  },
  { offset: 380, top: "8%",  size: 50, delay: 0.6, dur: 10.6, rot: 10  },
  { offset: 20,  top: "62%", size: 64, delay: 3.0, dur: 12.4, rot: -12 },
  { offset: 340, top: "45%", size: 54, delay: 1.8, dur: 10.0, rot: 5   },
  { offset: 130, top: "80%", size: 48, delay: 2.6, dur: 8.6, rot: -6  },
  { offset: 420, top: "28%", size: 56, delay: 0.9, dur: 11.8, rot: 8   },
  { offset: 80,  top: "92%", size: 44, delay: 3.4, dur: 12.2, rot: -10 },
  { offset: 310, top: "68%", size: 60, delay: 1.5, dur: 10.4, rot: 14  },
  { offset: 190, top: "52%", size: 46, delay: 2.2, dur: 8.4, rot: -7  },
  { offset: 460, top: "14%", size: 52, delay: 0.3, dur: 12.6, rot: 9   },
  { offset: 40,  top: "74%", size: 42, delay: 3.8, dur: 9.0, rot: -3  },
  { offset: 360, top: "85%", size: 48, delay: 1.1, dur: 10.6, rot: 11  },
  { offset: 160, top: "32%", size: 58, delay: 2.8, dur: 8.8, rot: -9  },
  { offset: 490, top: "55%", size: 44, delay: 0.4, dur: 12.0, rot: 6   },
  { offset: 100, top: "48%", size: 50, delay: 3.1, dur: 9.2, rot: -13 },
  { offset: 430, top: "72%", size: 46, delay: 1.7, dur: 12.4, rot: 4   },
  { offset: 230, top: "22%", size: 62, delay: 2.5, dur: 8.6, rot: -5  },
  { offset: 390, top: "95%", size: 40, delay: 0.7, dur: 11.8, rot: 12  },
];

const RIGHT_SLOTS = [
  { offset: 30,  top: "12%", size: 64, delay: 0.7, dur: 11.1, rot: 9   },
  { offset: 350, top: "28%", size: 54, delay: 0.2, dur: 9.3, rot: -6  },
  { offset: 90,  top: "55%", size: 60, delay: 2.9, dur: 12.8, rot: 14  },
  { offset: 440, top: "6%",  size: 46, delay: 1.4, dur: 8.6, rot: -11 },
  { offset: 15,  top: "78%", size: 70, delay: 3.5, dur: 10.7, rot: 5   },
  { offset: 300, top: "40%", size: 50, delay: 0.9, dur: 12.3, rot: -13 },
  { offset: 170, top: "88%", size: 44, delay: 2.3, dur: 8.9, rot: 8   },
  { offset: 480, top: "22%", size: 58, delay: 1.1, dur: 10.5, rot: -3  },
  { offset: 55,  top: "96%", size: 48, delay: 3.8, dur: 12.0, rot: 11  },
  { offset: 370, top: "62%", size: 56, delay: 0.4, dur: 10.8, rot: -8  },
  { offset: 220, top: "35%", size: 42, delay: 2.6, dur: 8.5, rot: 6   },
  { offset: 500, top: "48%", size: 62, delay: 1.8, dur: 12.5, rot: -15 },
  { offset: 110, top: "70%", size: 50, delay: 0.6, dur: 10.1, rot: 10  },
  { offset: 410, top: "82%", size: 46, delay: 3.2, dur: 11.9, rot: -7  },
  { offset: 260, top: "15%", size: 66, delay: 1.5, dur: 12.2, rot: 3   },
  { offset: 470, top: "58%", size: 40, delay: 2.0, dur: 8.7, rot: -12 },
  { offset: 140, top: "44%", size: 54, delay: 3.6, dur: 10.4, rot: 7   },
  { offset: 320, top: "90%", size: 48, delay: 0.8, dur: 12.7, rot: -4  },
  { offset: 75,  top: "25%", size: 58, delay: 2.4, dur: 9.0, rot: 13  },
  { offset: 450, top: "76%", size: 44, delay: 1.2, dur: 12.4, rot: -9  },
];

const HeroLogos = () => {
  const { theme } = useTheme();
  const { tools } = useTools();
  const isLight = theme === "light";
  const topCount = isLight ? 20 : 40; 

  const topN = useMemo(() => {
    if (!tools?.length) return [];
    return [...tools]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, topCount);
  }, [tools, topCount]);

  const leftTools  = topN.slice(0, Math.ceil(topCount / 2));
  const rightTools = topN.slice(Math.ceil(topCount / 2), topCount);

  const keyframes = useMemo(() => {
    const allSlots = [...LEFT_SLOTS, ...RIGHT_SLOTS];
    return Array.from({ length: 40 }, (_, i) => {
      const slot = allSlots[i];
      // 대표님 요청: 벽에 부딪히는 '바운스' 효과 구현 (0% -> 45% -> 55% -> 100%)
      // dy를 키우고 y축 이동이 한계점에 도달했을 때 튕기는 느낌을 줌
      const dy = 40 + (i % 6) * 15;     
      const dx = (i % 2 === 0 ? 1 : -1) * (15 + (i % 5) * 8); 
      const dr = (i % 2 === 0 ? 15 : -15);

      return `@keyframes hlbf${i} {
        0%   { transform: translate3d(0, 0, 0) rotate(${slot.rot}deg); transition-timing-function: cubic-bezier(.11,.77,.41,.96); }
        45%  { transform: translate3d(${dx*0.5}px, ${-dy}px, 0) rotate(${slot.rot + dr}deg); transition-timing-function: cubic-bezier(.61,.01,.88,.49); }
        55%  { transform: translate3d(${dx*0.5}px, ${-dy}px, 0) rotate(${slot.rot + dr}deg); transition-timing-function: cubic-bezier(.11,.77,.41,.96); }
        100% { transform: translate3d(0, 0, 0) rotate(${slot.rot}deg); }
      }`;
    }).join("\n");
  }, []);

  const renderBadge = (tool, slot, idx, side) => {
    const faviconUrl = getFaviconUrl(tool.url);
    if (!faviconUrl) return null;
    const animIdx = side === "left" ? idx : idx + 20;

    const upsized = slot.size * 1.5;
    
    // 대표님 요청: 중앙으로 좀 더 모으기 (기본 오프셋에 +100px 추가하여 안쪽으로 배치)
    const centeredOffset = slot.offset + 100;
    
    return (
      <div
        key={`${side}-${tool.id || tool.name}`}
        className="hlb"
        style={{
          position: "absolute",
          [side]: `${centeredOffset}px`,
          top: slot.top,
          width: `${upsized}px`,
          height: `${upsized}px`,
          flexShrink: 0,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: isLight ? "1px solid rgba(255,182,193,0.4)" : "1.5px solid rgba(255,255,255,0.6)",
          boxShadow: isLight ? "0 8px 24px rgba(255,182,193,0.25)" : "0 8px 20px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px", 
          boxSizing: "border-box",
          overflow: "hidden",
          opacity: 0.95,
          pointerEvents: "none",
          zIndex: 0,
          animation: `hlbf${animIdx} ${slot.dur * 1.6}s ease-in-out ${slot.delay}s infinite`,
          willChange: "transform",
        }}
      >
        <img
          src={faviconUrl}
          alt={tool.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.15))",
          }}
        />
      </div>
    );
  };

  if (!topN.length) return null;

  return (
    <>
      <style>{`
        ${keyframes}
        .hlb::after {
          content: "";
          position: absolute;
          top: 8%; left: 12%;
          width: 40%; height: 35%;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%);
          pointer-events: none;
        }
        @media (max-width: 1000px) { .hlb { display: none !important; } }
      `}</style>

      {leftTools.map((tool, i)  => renderBadge(tool, LEFT_SLOTS[i],  i, "left"))}
      {rightTools.map((tool, i) => renderBadge(tool, RIGHT_SLOTS[i], i, "right"))}
    </>
  );
};

export default HeroLogos;
