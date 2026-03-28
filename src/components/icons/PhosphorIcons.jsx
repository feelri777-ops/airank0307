import React from 'react';

// Common SVG Wrapper
const IconWrapper = ({ children, size = 20, color = "currentColor", weight = "bold", ...props }) => {
  const strokeWidth = {
    thin: 8,
    light: 12,
    regular: 16,
    bold: 24,
    fill: 16
  }[weight] || 16;

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 256 256" 
      width={size} 
      height={size} 
      fill={weight === 'fill' ? color : 'none'}
      stroke={weight === 'fill' ? 'none' : color}
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={strokeWidth}
      {...props}
    >
      <rect width="256" height="256" fill="none" stroke="none"/>
      {children}
    </svg>
  );
};

export const TrendUp = (p) => <IconWrapper {...p}><polyline points="232 56 136 152 96 112 24 184"/><polyline points="232 120 232 56 168 56"/></IconWrapper>;
export const Cpu = (p) => <IconWrapper {...p}><rect x="104" y="104" width="48" height="48" rx="8"/><rect x="48" y="48" width="160" height="160" rx="8"/><line x1="208" y1="104" x2="232" y2="104"/><line x1="208" y1="152" x2="232" y2="152"/><line x1="24" y1="104" x2="48" y2="104"/><line x1="24" y1="152" x2="48" y2="152"/><line x1="152" y1="208" x2="152" y2="232"/><line x1="104" y1="208" x2="104" y2="232"/><line x1="152" y1="24" x2="152" y2="48"/><line x1="104" y1="24" x2="104" y2="48"/></IconWrapper>;
export const Megaphone = (p) => <IconWrapper {...p}><path d="M160,80V200.67a8,8,0,0,0,3.56,6.65l11,7.33a8,8,0,0,0,12.2-4.72L200,160"/><path d="M40,200a8,8,0,0,0,13.15,6.12C105.55,162.16,160,160,160,160h40a40,40,0,0,0,0-80H160S105.55,77.84,53.15,33.89A8,8,0,0,0,40,40Z"/></IconWrapper>;
export const Lightning = (p) => <IconWrapper {...p}><polygon points="160 16 144 96 208 120 96 240 112 160 48 136 160 16"/></IconWrapper>;
export const Lightbulb = (p) => <IconWrapper {...p}><line x1="88" y1="232" x2="168" y2="232"/><path d="M78.7,167A79.87,79.87,0,0,1,48,104.45C47.76,61.09,82.72,25,126.07,24a80,80,0,0,1,51.34,142.9A24.3,24.3,0,0,0,168,186v6a8,8,0,0,1-8,8H96a8,8,0,0,1-8-8v-6A24.11,24.11,0,0,0,78.7,167Z"/><path d="M136,56c20,3.37,36.61,20,40,40"/></IconWrapper>;
export const Quotes = (p) => <IconWrapper {...p}><path d="M108,144H40a8,8,0,0,1-8-8V72a8,8,0,0,1,8-8h60a8,8,0,0,1,8,8v88a40,40,0,0,1-40,40"/><path d="M224,144H156a8,8,0,0,1-8-8V72a8,8,0,0,1,8-8h60a8,8,0,0,1,8,8v88a40,40,0,0,1-40,40"/></IconWrapper>;
export const VideoCamera = (p) => <IconWrapper {...p}><rect x="24" y="64" width="176" height="128" rx="8"/><polyline points="200 112 248 80 248 176 200 144"/></IconWrapper>;
export const GraduationCap = (p) => <IconWrapper {...p}><polygon points="8 96 128 32 248 96 128 160 8 96"/><polyline points="128 96 184 125.87 184 240"/><path d="M216,113.07v53.22a8,8,0,0,1-2,5.31c-11.3,12.59-38.9,36.4-86,36.4s-74.68-23.81-86-36.4a8,8,0,0,1-2-5.31V113.07"/></IconWrapper>;
export const MusicNotes = (p) => <IconWrapper {...p}><circle cx="180" cy="164" r="28"/><circle cx="52" cy="196" r="28"/><line x1="208" y1="72" x2="80" y2="104"/><polyline points="80 196 80 56 208 24 208 164"/></IconWrapper>;
export const Rocket = (p) => <IconWrapper {...p}><line x1="144" y1="224" x2="112" y2="224"/><circle cx="128" cy="100" r="12"/><path d="M94.81,192C37.52,95.32,103.87,32.53,123.09,17.68a8,8,0,0,1,9.82,0C152.13,32.53,218.48,95.32,161.19,192Z"/><path d="M183.84,110.88l30.31,36.36a8,8,0,0,1,1.66,6.86l-12.36,55.63a8,8,0,0,1-12.81,4.51L161.19,192"/><path d="M72.16,110.88,41.85,147.24a8,8,0,0,0-1.66,6.86l12.36,55.63a8,8,0,0,0,12.81,4.51L94.81,192"/></IconWrapper>;
export const Briefcase = (p) => <IconWrapper {...p}><rect x="32" y="64" width="192" height="144" rx="8"/><path d="M168,64V48a16,16,0,0,0-16-16H104A16,16,0,0,0,88,48V64"/><path d="M224,118.31A191.09,191.09,0,0,1,128,144a191.14,191.14,0,0,1-96-25.68"/><line x1="112" y1="112" x2="144" y2="112"/></IconWrapper>;
export const Robot = (p) => <IconWrapper {...p}><rect x="32" y="56" width="192" height="160" rx="24"/><rect x="72" y="144" width="112" height="40" rx="20"/><line x1="148" y1="144" x2="148" y2="184"/><line x1="108" y1="144" x2="108" y2="184"/><line x1="128" y1="56" x2="128" y2="16"/><circle cx="84" cy="108" r="12"/><circle cx="172" cy="108" r="12"/></IconWrapper>;
export const Star = (p) => <IconWrapper {...p}><path d="M128,189.09l54.72,33.65a8.4,8.4,0,0,0,12.52-9.17l-14.88-62.79,48.7-42A8.46,8.46,0,0,0,224.27,94L160.36,88.8,135.74,29.2a8.36,8.36,0,0,0-15.48,0L95.64,88.8,31.73,94a8.46,8.46,0,0,0-4.79,14.83l48.7,42L60.76,213.57a8.4,8.4,0,0,0,12.52,9.17Z"/></IconWrapper>;

// --- Original Icons (MUST BE PRESERVED) ---
export const YoutubeLogoFill = (p) => <IconWrapper {...p} weight="fill"><path d="M234.33,69.52a24,24,0,0,0-14.49-16.4C185.56,39.88,131,40,128,40s-57.56-.12-91.84,13.12a24,24,0,0,0-14.49,16.4C19.08,79.5,16,97.74,16,128s3.08,48.5,5.67,58.48a24,24,0,0,0,14.49,16.41C69,215.56,120.4,216,127.34,216h1.32c6.94,0,58.37-.44,91.18-13.11a24,24,0,0,0,14.49-16.41c2.59-10,5.67-28.22,5.67-58.48S236.92,79.5,234.33,69.52Zm-73.74,65-40,28A8,8,0,0,1,108,156V100a8,8,0,0,1,12.59-6.55l40,28a8,8,0,0,1,0,13.1Z"/></IconWrapper>;
export const BookmarkSimple = (p) => <IconWrapper {...p}><path d="M192,224l-64-40L64,224V48a8,8,0,0,1,8-8H184a8,8,0,0,1,8,8Z"/></IconWrapper>;
export const BookmarkSimpleFill = (p) => <IconWrapper {...p} weight="fill"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"/></IconWrapper>;
export const PencilSimple = (p) => <IconWrapper {...p}><path d="M92.69,216H48a8,8,0,0,1-8-8V163.31a8,8,0,0,1,2.34-5.65L165.66,34.34a8,8,0,0,1,11.31,0L221.66,79a8,8,0,0,1,0,11.31L98.34,213.66A8,8,0,0,1,92.69,216Z"/><line x1="136" y1="64" x2="192" y2="120"/></IconWrapper>;
export const TrashSimple = (p) => <IconWrapper {...p}><line x1="216" y1="56" x2="40" y2="56"/><line x1="88" y1="24" x2="168" y2="24"/><path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56"/></IconWrapper>;
export const ThumbsUp = (p) => <IconWrapper {...p}><path d="M32,104H80a0,0,0,0,1,0,0V208a0,0,0,0,1,0,0H32a8,8,0,0,1-8-8V112A8,8,0,0,1,32,104Z"/><path d="M80,104l40-80a32,32,0,0,1,32,32V80h64a16,16,0,0,1,15.87,18l-12,96A16,16,0,0,1,204,208H80"/></IconWrapper>;
export const ThumbsUpFill = (p) => <IconWrapper {...p} weight="fill"><path d="M234,80.12A24,24,0,0,0,216,72H160V56a40,40,0,0,0-40-40,8,8,0,0,0-7.16,4.42L75.06,96H32a16,16,0,0,0-16,16v88a16,16,0,0,0,16,16H204a24,24,0,0,0,23.82-21l12-96A24,24,0,0,0,234,80.12ZM32,112H72v88H32Z"/></IconWrapper>;
export const ThumbsDown = (p) => <IconWrapper {...p}><path d="M32,48H80a0,0,0,0,1,0,0V152a0,0,0,0,1,0,0H32a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8Z"/><path d="M80,152l40,80a32,32,0,0,0,32-32V176h64a16,16,0,0,0,15.87-18l-12-96A16,16,0,0,0,204,48H80"/></IconWrapper>;
export const ThumbsDownFill = (p) => <IconWrapper {...p} weight="fill"><path d="M239.82,157l-12-96A24,24,0,0,0,204,40H32A16,16,0,0,0,16,56v88a16,16,0,0,0,16,16H75.06l37.78,75.58A8,8,0,0,0,120,240a40,40,0,0,0,40-40V184h56a24,24,0,0,0,23.82-27ZM72,144H32V56H72Z"/></IconWrapper>;
export const Siren = (p) => <IconWrapper {...p}><line x1="128" y1="16" x2="128" y2="8"/><path d="M48,168V128a80,80,0,0,1,80.61-80c44.11.33,79.39,36.89,79.39,81v39"/><rect x="32" y="168" width="192" height="40" rx="8"/></IconWrapper>;
export const ArrowLeft = (p) => <IconWrapper {...p}><line x1="216" y1="128" x2="40" y2="128"/><polyline points="112 56 40 128 112 200"/></IconWrapper>;
export const ArrowRight = (p) => <IconWrapper {...p}><line x1="40" y1="128" x2="216" y2="128"/><polyline points="144 56 216 128 144 200"/></IconWrapper>;
export const ArrowUUpLeft = (p) => <IconWrapper {...p}><polyline points="80 120 40 80 80 40"/><path d="M40,80h88a72,72,0,0,1,0,144H80"/></IconWrapper>;
export const PaperPlaneRight = (p) => <IconWrapper {...p}><line x1="216" y1="128" x2="128" y2="128"/><polygon points="216 128 40 216 72 128 40 40 216 128"/></IconWrapper>;
export const Sparkle = (p) => <IconWrapper {...p}><path d="M128,40,152,96l56,24-56,24-24,56-24-56-56-24,56-24Z"/></IconWrapper>;
export const ChatCircleText = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/><line x1="96" y1="112" x2="160" y2="112"/><line x1="96" y1="144" x2="160" y2="144"/></IconWrapper>;
export const Image = (p) => <IconWrapper {...p}><rect x="32" y="48" width="192" height="160" rx="8"/><circle cx="85" cy="95" r="12"/><path d="M224,152,183.08,111.08a8,8,0,0,0-11.31,0L128,154.67,111.31,138a8,8,0,0,0-11.31,0L32,205.33"/></IconWrapper>;

// --- Admin Enhanced Icons (New) ---
export const X = (p) => <IconWrapper {...p}><line x1="200" y1="56" x2="56" y2="200"/><line x1="200" y1="200" x2="56" y2="56"/></IconWrapper>;
export const Plus = (p) => <IconWrapper {...p}><line x1="40" y1="128" x2="216" y2="128"/><line x1="128" y1="40" x2="128" y2="216"/></IconWrapper>;
export const Minus = (p) => <IconWrapper {...p}><line x1="40" y1="128" x2="216" y2="128"/></IconWrapper>;
export const MagnifyingGlass = (p) => <IconWrapper {...p}><circle cx="116" cy="116" r="84"/><line x1="175.4" y1="175.4" x2="224" y2="224"/></IconWrapper>;
export const ArrowClockwise = (p) => <IconWrapper {...p}><polyline points="176 80 224 80 224 32"/><path d="M190.2,190.2a88,88,0,1,1,0-124.4L224,80"/></IconWrapper>;
export const Users = (p) => <IconWrapper {...p}><circle cx="88" cy="72" r="40"/><path d="M160,80a40,40,0,1,0-40-40A40,40,0,0,0,160,80Z"/><path d="M40,216a80,80,0,0,1,160,0"/></IconWrapper>;
export const Eye = (p) => <IconWrapper {...p}><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Z"/><circle cx="128" cy="128" r="40"/></IconWrapper>;
export const EyeSlash = (p) => <IconWrapper {...p}><path d="M84,48c8.3-2.1,19.3-4,44-4,80,0,112,72,112,72a118,118,0,0,1-32.9,43.1"/><path d="M165.4,188.4A117.8,117.8,0,0,1,128,204c-80,0-112-72-112-72a117.5,117.5,0,0,1,34-44.4"/><path d="M112,82.1a40,40,0,0,1,55.9,55.9"/><path d="M140.7,163.7a40,40,0,0,1-48.4-48.4"/><line x1="48" y1="40" x2="208" y2="216"/></IconWrapper>;
export const ChartBar = (p) => <IconWrapper {...p}><rect x="40" y="152" width="40" height="56" rx="4"/><rect x="108" y="88" width="40" height="120" rx="4"/><rect x="176" y="120" width="40" height="88" rx="4"/></IconWrapper>;
export const Wrench = (p) => <IconWrapper {...p}><path d="M211.3,75.1l-14.7-14.7a16.1,16.1,0,0,0-22.6,0l-15.1,15.1,37.7,37.7,15.1-15.1A16.1,16.1,0,0,0,211.3,75.1Z" style={{fill: p.weight === 'fill' ? p.color : 'none' }}/><path d="M84.1,139.9,35.2,188.8a24,24,0,0,0,33.9,34l48.9-48.9Z"/><path d="M158.9,75.5,121.2,113.2l59.6,59.6,37.7-37.7Z"/></IconWrapper>;
export const ChartLineUp = (p) => <IconWrapper {...p}><polyline points="224 88 152 160 104 112 32 184"/><polyline points="168 88 224 88 224 144"/></IconWrapper>;
export const ShieldCheck = (p) => <IconWrapper {...p}><path d="M208,40,128,16,48,40V128c0,57.1,38,103.2,80,112,42-8.8,80-54.9,80-112V40Z"/><polyline points="88 128 112 152 168 96"/></IconWrapper>;
export const Sun = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="48"/><line x1="128" y1="32" x2="128" y2="16"/><line x1="128" y1="240" x2="128" y2="224"/><line x1="224" y1="128" x2="240" y2="128"/><line x1="16" y1="128" x2="32" y2="128"/></IconWrapper>;
export const Moon = (p) => <IconWrapper {...p}><path d="M216.7,152.6a88,88,0,1,1-113.3-113.3,88,88,0,1,0,113.3,113.3Z"/></IconWrapper>;
export const WarningCircle = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/><line x1="128" y1="80" x2="128" y2="136"/><circle cx="128" cy="172" r="12" style={{fill: p.color || 'currentColor'}} /></IconWrapper>;
export const ArrowsOut = (p) => <IconWrapper {...p}><polyline points="168 40 216 40 216 88"/><line x1="152" y1="104" x2="216" y2="40"/><polyline points="88 216 40 216 40 168"/><line x1="104" y1="152" x2="40" y2="216"/></IconWrapper>;
export const Heart = (p) => <IconWrapper {...p}><path d="M176,32a60,60,0,0,0-48,24,60,60,0,0,0-108,36c0,72,108,132,108,132s108-60,108-132A60,60,0,0,0,176,32Z"/></IconWrapper>;
export const Code = (p) => <IconWrapper {...p}><polyline points="160 80 208 128 160 176"/><polyline points="96 176 48 128 96 80"/></IconWrapper>;
export const UserPlus = (p) => <IconWrapper {...p}><circle cx="104" cy="72" r="40"/><path d="M40,216a64,64,0,0,1,128,0"/><line x1="200" y1="88" x2="248" y2="88"/><line x1="224" y1="64" x2="224" y2="112"/></IconWrapper>;
export const UserMinus = (p) => <IconWrapper {...p}><circle cx="104" cy="72" r="40"/><path d="M40,216a64,64,0,0,1,128,0"/><line x1="192" y1="88" x2="248" y2="88"/></IconWrapper>;
export const ChatCircle = (p) => <IconWrapper {...p}><path d="M45.4,177A95.9,95.9,0,1,1,79,210.6L40,216Z"/></IconWrapper>;
export const Images = (p) => <IconWrapper {...p}><path d="M192,112l-40,40-16-16-32,32"/><rect x="32" y="72" width="160" height="128" rx="8"/><path d="M64,40H200a16,16,0,0,1,16,16V160"/><circle cx="80" cy="112" r="12" style={{fill: p.color || 'currentColor'}} /></IconWrapper>;
export const Circle = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/></IconWrapper>;
export const ShieldWarning = (p) => <IconWrapper {...p}><path d="M208,40,128,16,48,40V128c0,57.1,38,103.2,80,112,42-8.8,80-54.9,80-112V40Z"/><line x1="128" y1="80" x2="128" y2="136"/><circle cx="128" cy="172" r="12" style={{fill: p.color || "currentColor"}} /></IconWrapper>;
export const Bell = (p) => <IconWrapper {...p}><path d="M208,184H48c0-32,16-56,48-56,0,0,0-40,32-40s32,40,32,40C192,128,208,152,208,184Z"/><path d="M128,216a24,24,0,0,1-24-24h48A24,24,0,0,1,128,216Z"/></IconWrapper>;
export const CheckCircle = (p) => <IconWrapper {...p} weight="fill"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></IconWrapper>;
export const Trash = (p) => <IconWrapper {...p}><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a24,24,0,0,0,24,24H184a24,24,0,0,0,24-24V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168a8,8,0,0,1-8,8H72a8,8,0,0,1-8-8V64H192Z"/></IconWrapper>;
export const Info = (p) => <IconWrapper {...p} weight={p.weight || "fill"}><circle cx="128" cy="128" r="96" fill="none" strokeWidth={16} /><line x1="128" y1="80" x2="128" y2="136" fill="none" strokeWidth={16} /><circle cx="128" cy="172" r="12" fill="currentColor" stroke="none" /></IconWrapper>;
export const Target = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/><circle cx="128" cy="128" r="48"/><circle cx="128" cy="128" r="12" fill="currentColor" stroke="none"/></IconWrapper>;
export const Check = (p) => <IconWrapper {...p}><polyline points="172 104 113.33 162.67 84 133.33"/></IconWrapper>;
export const NotePencil = (p) => <IconWrapper {...p}><path d="M92.69,216H48a8,8,0,0,1-8-8V163.31a8,8,0,0,1,2.34-5.65L165.66,34.34a8,8,0,0,1-11.31,0L221.66,79a8,8,0,0,1,0,11.31L98.34,213.66A8,8,0,0,1,92.69,216Z"/><line x1="136" y1="64" x2="192" y2="120"/></IconWrapper>;

// --- Editor Icons ---
export const Undo = (p) => <IconWrapper {...p}><polyline points="80 120 40 80 80 40"/><path d="M40,80h88a72,72,0,0,1,0,144H80"/></IconWrapper>;
export const Redo = (p) => <IconWrapper {...p}><polyline points="176 120 216 80 176 40"/><path d="M216,80H128a72,72,0,0,0,0,144h48"/></IconWrapper>;
export const TextT = (p) => <IconWrapper {...p}><line x1="128" y1="56" x2="128" y2="200"/><line x1="40" y1="56" x2="216" y2="56"/></IconWrapper>;
export const TextB = (p) => <IconWrapper {...p} weight="bold"><path d="M64,56H144a40,40,0,0,1,0,80H64ZM64,136h88a44,44,0,0,1,0,88H64Z"/></IconWrapper>;
export const TextItalic = (p) => <IconWrapper {...p}><line x1="96" y1="200" x2="160" y2="200"/><line x1="160" y1="56" x2="96" y2="200"/><line x1="128" y1="56" x2="192" y2="56"/></IconWrapper>;
export const TextUnderline = (p) => <IconWrapper {...p}><path d="M64,56v64a64,64,0,0,0,128,0V56"/><line x1="40" y1="200" x2="216" y2="200"/></IconWrapper>;
export const TextStrikethrough = (p) => <IconWrapper {...p}><line x1="40" y1="128" x2="216" y2="128"/><path d="M187.9,85.1A64,64,0,0,0,80,96m0,64a64,64,0,0,0,107.9,10.9"/></IconWrapper>;
export const TextAlignLeft = (p) => <IconWrapper {...p}><line x1="40" y1="64" x2="216" y2="64"/><line x1="40" y1="104" x2="152" y2="104"/><line x1="40" y1="144" x2="216" y2="144"/><line x1="40" y1="184" x2="152" y2="184"/></IconWrapper>;
export const TextAlignCenter = (p) => <IconWrapper {...p}><line x1="40" y1="64" x2="216" y2="64"/><line x1="64" y1="104" x2="192" y2="104"/><line x1="40" y1="144" x2="216" y2="144"/><line x1="64" y1="184" x2="192" y2="184"/></IconWrapper>;
export const TextAlignRight = (p) => <IconWrapper {...p}><line x1="40" y1="64" x2="216" y2="64"/><line x1="104" y1="104" x2="216" y2="104"/><line x1="40" y1="144" x2="216" y2="144"/><line x1="104" y1="184" x2="216" y2="184"/></IconWrapper>;
export const ListBullets = (p) => <IconWrapper {...p}><line x1="88" y1="64" x2="216" y2="64"/><line x1="88" y1="128" x2="216" y2="128"/><line x1="88" y1="192" x2="216" y2="192"/><circle cx="44" cy="64" r="12"/><circle cx="44" cy="128" r="12"/><circle cx="44" cy="192" r="12"/></IconWrapper>;
export const Smiley = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/><circle cx="92" cy="108" r="12"/><circle cx="164" cy="108" r="12"/><path d="M169.6,152a48,48,0,0,1-83.2,0"/></IconWrapper>;
export const PlusCircle = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/><line x1="128" y1="88" x2="128" y2="168"/><line x1="88" y1="128" x2="168" y2="128"/></IconWrapper>;
export const Palette = (p) => <IconWrapper {...p}><path d="M128,24A104,104,0,1,0,232,128c0-30.4-12.8-44.8-24-44.8H184V44c0-11.2-13.6-20-24-20Z"/><circle cx="140" cy="76" r="12"/><circle cx="180" cy="112" r="12"/><circle cx="128" cy="128" r="12"/></IconWrapper>;
export const Link = (p) => <IconWrapper {...p}><path d="M122.3,133.7l33.2-33.2a32,32,0,0,1,45.2,45.2l-33.2,33.2a32,32,0,0,1-45.2,0"/><path d="M133.7,122.3l-33.2,33.2a32,32,0,0,1-45.2-45.2l33.2-33.2a32,32,0,0,1,45.2,0"/></IconWrapper>;
export const Globe = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/><line x1="128" y1="32" x2="128" y2="224"/><path d="M128,32a128.1,128.1,0,0,1,0,192"/><path d="M128,32a128.1,128.1,0,0,0,0,192"/><line x1="37.6" y1="88" x2="218.4" y2="88"/><line x1="37.6" y1="168" x2="218.4" y2="168"/></IconWrapper>;
export const Tag = (p) => <IconWrapper {...p}><path d="M226.3,109.7l-96-96a8.1,8.1,0,0,0-5.6-2.4H40a8,8,0,0,0-8,8V92.7a8.1,8.1,0,0,0,2.4,5.6l96,96a8,8,0,0,0,11.3,0l96-96a8,8,0,0,0,0-11.3ZM128,183,48,103V48h55l80,80-12,12Z"/><circle cx="84" cy="84" r="12"/></IconWrapper>;
export const ArrowUpRight = (p) => <IconWrapper {...p}><line x1="64" y1="192" x2="192" y2="64"/><polyline points="192 160 192 64 96 64"/></IconWrapper>;
export const FileArrowUp = (p) => <IconWrapper {...p}><path d="M48,208V40a8,8,0,0,1,8-8h96l56,56V208a8,8,0,0,1-8,8H56A8,8,0,0,1,48,208Z"/><polyline points="152 32 152 88 208 88"/><polyline points="96 152 128 120 160 152"/><line x1="128" y1="120" x2="128" y2="184"/></IconWrapper>;
export const CaretDown = (p) => <IconWrapper {...p}><polyline points="208 96 128 176 48 96"/></IconWrapper>;
export const CaretUp = (p) => <IconWrapper {...p}><polyline points="48 160 128 80 208 160"/></IconWrapper>;
export const Trophy = (p) => <IconWrapper {...p}><path d="M56,40H200a8,8,0,0,1,8,8V88a48,48,0,0,1-48,48H96A48,48,0,0,1,48,88V48A8,8,0,0,1,56,40Z"/><line x1="88" y1="192" x2="168" y2="192"/><line x1="128" y1="136" x2="128" y2="192"/><polygon points="232 80 208 80 208 48 232 48 232 80"/><polygon points="24 80 48 80 48 48 24 48 24 80"/><line x1="56" y1="216" x2="200" y2="216"/></IconWrapper>;
export const Table = (p) => <IconWrapper {...p}><rect x="32" y="48" width="192" height="160" rx="8"/><line x1="32" y1="96" x2="224" y2="96"/><line x1="32" y1="144" x2="224" y2="144"/><line x1="96" y1="48" x2="96" y2="208"/><line x1="160" y1="48" x2="160" y2="208"/></IconWrapper>;
export const Calendar = (p) => <IconWrapper {...p}><rect x="40" y="40" width="176" height="176" rx="8"/><line x1="176" y1="24" x2="176" y2="56"/><line x1="80" y1="24" x2="80" y2="56"/><line x1="40" y1="88" x2="216" y2="88"/></IconWrapper>;
export const Spinner = (p) => (
  <IconWrapper {...p}>
    <line x1="128" y1="32" x2="128" y2="64" opacity="0.3"/>
    <line x1="195.9" y1="60.1" x2="173.3" y2="82.7" opacity="0.4"/>
    <line x1="224" y1="128" x2="192" y2="128" opacity="0.5"/>
    <line x1="195.9" y1="195.9" x2="173.3" y2="173.3" opacity="0.6"/>
    <line x1="128" y1="224" x2="128" y2="192" opacity="0.7"/>
    <line x1="60.1" y1="195.9" x2="82.7" y2="173.3" opacity="0.8"/>
    <line x1="32" y1="128" x2="64" y2="128" opacity="0.9"/>
    <line x1="60.1" y1="60.1" x2="82.7" y2="82.7" opacity="1.0"/>
    <animateTransform attributeName="transform" type="rotate" from="0 128 128" to="360 128 128" dur="1s" repeatCount="indefinite" />
  </IconWrapper>
);

