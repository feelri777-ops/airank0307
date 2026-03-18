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
  { offset: 10,  top: "5%",  size: 70, delay: 0,   dur: 4.2, rot: -8  },
  { offset: 280, top: "18%", size: 62, delay: 1.2, dur: 5.0, rot: 6   },
  { offset: 60,  top: "38%", size: 58, delay: 2.0, dur: 3.8, rot: -4  },
  { offset: 380, top: "8%",  size: 50, delay: 0.6, dur: 4.6, rot: 10  },
  { offset: 20,  top: "62%", size: 64, delay: 3.0, dur: 5.4, rot: -12 },
  { offset: 340, top: "45%", size: 54, delay: 1.8, dur: 4.0, rot: 5   },
  { offset: 130, top: "80%", size: 48, delay: 2.6, dur: 3.6, rot: -6  },
  { offset: 420, top: "28%", size: 56, delay: 0.9, dur: 4.8, rot: 8   },
  { offset: 80,  top: "92%", size: 44, delay: 3.4, dur: 5.2, rot: -10 },
  { offset: 310, top: "68%", size: 60, delay: 1.5, dur: 4.4, rot: 14  },
  { offset: 190, top: "52%", size: 46, delay: 2.2, dur: 3.4, rot: -7  },
  { offset: 460, top: "14%", size: 52, delay: 0.3, dur: 5.6, rot: 9   },
  { offset: 40,  top: "74%", size: 42, delay: 3.8, dur: 4.0, rot: -3  },
  { offset: 360, top: "85%", size: 48, delay: 1.1, dur: 4.6, rot: 11  },
  { offset: 160, top: "32%", size: 58, delay: 2.8, dur: 3.8, rot: -9  },
  { offset: 490, top: "55%", size: 44, delay: 0.4, dur: 5.0, rot: 6   },
  { offset: 100, top: "48%", size: 50, delay: 3.1, dur: 4.2, rot: -13 },
  { offset: 430, top: "72%", size: 46, delay: 1.7, dur: 5.4, rot: 4   },
  { offset: 230, top: "22%", size: 62, delay: 2.5, dur: 3.6, rot: -5  },
  { offset: 390, top: "95%", size: 40, delay: 0.7, dur: 4.8, rot: 12  },
];

const RIGHT_SLOTS = [
  { offset: 30,  top: "12%", size: 64, delay: 0.7, dur: 5.1, rot: 9   },
  { offset: 350, top: "28%", size: 54, delay: 0.2, dur: 4.3, rot: -6  },
  { offset: 90,  top: "55%", size: 60, delay: 2.9, dur: 5.8, rot: 14  },
  { offset: 440, top: "6%",  size: 46, delay: 1.4, dur: 3.6, rot: -11 },
  { offset: 15,  top: "78%", size: 70, delay: 3.5, dur: 4.7, rot: 5   },
  { offset: 300, top: "40%", size: 50, delay: 0.9, dur: 5.3, rot: -13 },
  { offset: 170, top: "88%", size: 44, delay: 2.3, dur: 3.9, rot: 8   },
  { offset: 480, top: "22%", size: 58, delay: 1.1, dur: 4.5, rot: -3  },
  { offset: 55,  top: "96%", size: 48, delay: 3.8, dur: 5.0, rot: 11  },
  { offset: 370, top: "62%", size: 56, delay: 0.4, dur: 4.8, rot: -8  },
  { offset: 220, top: "35%", size: 42, delay: 2.6, dur: 3.5, rot: 6   },
  { offset: 500, top: "48%", size: 62, delay: 1.8, dur: 5.5, rot: -15 },
  { offset: 110, top: "70%", size: 50, delay: 0.6, dur: 4.1, rot: 10  },
  { offset: 410, top: "82%", size: 46, delay: 3.2, dur: 4.9, rot: -7  },
  { offset: 260, top: "15%", size: 66, delay: 1.5, dur: 5.2, rot: 3   },
  { offset: 470, top: "58%", size: 40, delay: 2.0, dur: 3.7, rot: -12 },
  { offset: 140, top: "44%", size: 54, delay: 3.6, dur: 4.4, rot: 7   },
  { offset: 320, top: "90%", size: 48, delay: 0.8, dur: 5.7, rot: -4  },
  { offset: 75,  top: "25%", size: 58, delay: 2.4, dur: 4.0, rot: 13  },
  { offset: 450, top: "76%", size: 44, delay: 1.2, dur: 5.4, rot: -9  },
];

const HeroLogos = () => {
  const { theme } = useTheme();
  const { tools } = useTools();

  const top40 = useMemo(() => {
    if (!tools?.length) return [];
    return [...tools]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 40);
  }, [tools]);

  const leftTools  = top40.slice(0, 20);
  const rightTools = top40.slice(20, 40);

  const keyframes = useMemo(() => {
    const allSlots = [...LEFT_SLOTS, ...RIGHT_SLOTS];
    return Array.from({ length: 40 }, (_, i) => {
      const slot = allSlots[i];
      const dy = 28 + (i % 7) * 6;                               // 28~64px 수직
      const dx = (i % 2 === 0 ? 1 : -1) * (18 + (i % 6) * 8);  // ±18~58px 수평
      const dr = slot.rot + (i % 2 === 0 ? 8 : -8);
      return `@keyframes hlbf${i} {
        0%   { transform: translate(0,0) rotate(${slot.rot}deg); }
        25%  { transform: translate(${dx * 0.7}px,${-dy * 0.5}px) rotate(${dr}deg); }
        50%  { transform: translate(${dx}px,${-dy}px) rotate(${slot.rot}deg); }
        75%  { transform: translate(${-dx * 0.4}px,${-dy * 0.7}px) rotate(${slot.rot - 5}deg); }
        100% { transform: translate(0,0) rotate(${slot.rot}deg); }
      }`;
    }).join("\n");
  }, []);

  const renderBadge = (tool, slot, idx, side) => {
    const faviconUrl = getFaviconUrl(tool.url);
    if (!faviconUrl) return null;
    const animIdx = side === "left" ? idx : idx + 20;
    return (
      <div
        key={`${side}-${tool.id || tool.name}`}
        className="hlb"
        style={{
          position: "absolute",
          [side]: `${slot.offset}px`,
          top: slot.top,
          width: `${slot.size}px`,
          height: `${slot.size}px`,
          flexShrink: 0,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1.5px solid rgba(255,255,255,0.75)",
          boxShadow: [
            "0 8px 24px rgba(0,0,0,0.14)",
            "0 2px 6px rgba(0,0,0,0.08)",
            "inset 0 1.5px 3px rgba(255,255,255,0.9)",
            "inset 0 -2px 4px rgba(0,0,0,0.06)",
          ].join(", "),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px",
          boxSizing: "border-box",
          overflow: "hidden",
          opacity: 0.95,
          pointerEvents: "none",
          zIndex: 0,
          animation: `hlbf${animIdx} ${slot.dur}s ease-in-out ${slot.delay}s infinite`,
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
            filter: [
              "drop-shadow(0 3px 5px rgba(0,0,0,0.28))",
              "drop-shadow(0 1px 2px rgba(0,0,0,0.18))",
              "drop-shadow(0 -1px 2px rgba(255,255,255,0.5))",
            ].join(" "),
          }}
        />
      </div>
    );
  };

  if (!top40.length) return null;

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
        @media (max-width: 700px) { .hlb { display: none !important; } }
      `}</style>

      {leftTools.map((tool, i)  => renderBadge(tool, LEFT_SLOTS[i],  i, "left"))}
      {rightTools.map((tool, i) => renderBadge(tool, RIGHT_SLOTS[i], i, "right"))}
    </>
  );
};

export default HeroLogos;
