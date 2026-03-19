import React from 'react';

// Common SVG Wrapper
const IconWrapper = ({ children, size = 20, color = "currentColor", weight = "bold", ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 256 256" 
    width={size} 
    height={size} 
    fill={weight === 'fill' ? color : 'none'}
    stroke={weight === 'fill' ? 'none' : color}
    strokeLinecap="round" 
    strokeLinejoin="round" 
    strokeWidth="16"
    {...props}
  >
    <rect width="256" height="256" fill="none" stroke="none"/>
    {children}
  </svg>
);

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
export const CaretLeft = (p) => <IconWrapper {...p}><polyline points="160 208 80 128 160 48"/></IconWrapper>;
export const CaretRight = (p) => <IconWrapper {...p}><polyline points="96 208 176 128 96 48"/></IconWrapper>;
export const PaperPlaneRight = (p) => <IconWrapper {...p}><line x1="216" y1="128" x2="128" y2="128"/><polygon points="216 128 40 216 72 128 40 40 216 128"/></IconWrapper>;
export const Sparkle = (p) => <IconWrapper {...p}><path d="M128,40,152,96l56,24-56,24-24,56-24-56-56-24,56-24Z"/></IconWrapper>;
export const ChatCircleText = (p) => <IconWrapper {...p}><circle cx="128" cy="128" r="96"/><line x1="96" y1="112" x2="160" y2="112"/><line x1="96" y1="144" x2="160" y2="144"/></IconWrapper>;
export const Image = (p) => <IconWrapper {...p}><rect x="32" y="48" width="192" height="160" rx="8"/><circle cx="85" cy="95" r="12"/><path d="M224,152,183.08,111.08a8,8,0,0,0-11.31,0L128,154.67,111.31,138a8,8,0,0,0-11.31,0L32,205.33"/></IconWrapper>;

// --- Admin Enhanced Icons (New) ---
export const X = (p) => <IconWrapper {...p}><line x1="200" y1="56" x2="56" y2="200"/><line x1="200" y1="200" x2="56" y2="56"/></IconWrapper>;
export const Plus = (p) => <IconWrapper {...p}><line x1="40" y1="128" x2="216" y2="128"/><line x1="128" y1="40" x2="128" y2="216"/></IconWrapper>;
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
export const ShieldWarning = (p) => <IconWrapper {...p}><path d="M208,40,128,16,48,40V128c0,57.1,38,103.2,80,112,42-8.8,80-54.9,80-112V40Z"/><line x1="128" y1="80" x2="128" y2="136"/><circle cx="128" cy="172" r="12" style={{fill: p.color || 'currentColor'}} /></IconWrapper>;
