import React from 'react';

export const YoutubeLogoFill = ({ size = 18, color = "currentColor", ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 256 256" 
    width={size} 
    height={size} 
    fill={color} 
    {...props}
  >
    <rect width="256" height="256" fill="none"/>
    <path d="M234.33,69.52a24,24,0,0,0-14.49-16.4C185.56,39.88,131,40,128,40s-57.56-.12-91.84,13.12a24,24,0,0,0-14.49,16.4C19.08,79.5,16,97.74,16,128s3.08,48.5,5.67,58.48a24,24,0,0,0,14.49,16.41C69,215.56,120.4,216,127.34,216h1.32c6.94,0,58.37-.44,91.18-13.11a24,24,0,0,0,14.49-16.41c2.59-10,5.67-28.22,5.67-58.48S236.92,79.5,234.33,69.52Zm-73.74,65-40,28A8,8,0,0,1,108,156V100a8,8,0,0,1,12.59-6.55l40,28a8,8,0,0,1,0,13.1Z"/>
  </svg>
);

export const BookmarkSimple = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M192,224l-64-40L64,224V48a8,8,0,0,1,8-8H184a8,8,0,0,1,8,8Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const BookmarkSimpleFill = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} fill={color} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"/>
  </svg>
);

export const PencilSimple = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M92.69,216H48a8,8,0,0,1-8-8V163.31a8,8,0,0,1,2.34-5.65L165.66,34.34a8,8,0,0,1,11.31,0L221.66,79a8,8,0,0,1,0,11.31L98.34,213.66A8,8,0,0,1,92.69,216Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="136" y1="64" x2="192" y2="120" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const TrashSimple = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <line x1="216" y1="56" x2="40" y2="56" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="88" y1="24" x2="168" y2="24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const ThumbsUp = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M32,104H80a0,0,0,0,1,0,0V208a0,0,0,0,1,0,0H32a8,8,0,0,1-8-8V112A8,8,0,0,1,32,104Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M80,104l40-80a32,32,0,0,1,32,32V80h64a16,16,0,0,1,15.87,18l-12,96A16,16,0,0,1,204,208H80" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const ThumbsUpFill = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} fill={color} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M234,80.12A24,24,0,0,0,216,72H160V56a40,40,0,0,0-40-40,8,8,0,0,0-7.16,4.42L75.06,96H32a16,16,0,0,0-16,16v88a16,16,0,0,0,16,16H204a24,24,0,0,0,23.82-21l12-96A24,24,0,0,0,234,80.12ZM32,112H72v88H32Z"/>
  </svg>
);

export const ThumbsDown = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M32,48H80a0,0,0,0,1,0,0V152a0,0,0,0,1,0,0H32a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M80,152l40,80a32,32,0,0,0,32-32V176h64a16,16,0,0,0,15.87-18l-12-96A16,16,0,0,0,204,48H80" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const ThumbsDownFill = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} fill={color} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M239.82,157l-12-96A24,24,0,0,0,204,40H32A16,16,0,0,0,16,56v88a16,16,0,0,0,16,16H75.06l37.78,75.58A8,8,0,0,0,120,240a40,40,0,0,0,40-40V184h56a24,24,0,0,0,23.82-27ZM72,144H32V56H72Z"/>
  </svg>
);

export const Siren = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <line x1="128" y1="16" x2="128" y2="8" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="200" y1="40" x2="208" y2="32" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="56" y1="40" x2="48" y2="32" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M48,168V128a80,80,0,0,1,80.61-80c44.11.33,79.39,36.89,79.39,81v39" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M136,80c22.7,3.81,40,24.22,40,48" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <rect x="32" y="168" width="192" height="40" rx="8" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const ArrowLeft = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <line x1="216" y1="128" x2="40" y2="128" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <polyline points="112 56 40 128 112 200" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const ArrowRight = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <line x1="40" y1="128" x2="216" y2="128" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <polyline points="144 56 216 128 144 200" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const ArrowUUpLeft = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <polyline points="80 136 32 88 80 40" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M80,200h88a56,56,0,0,0,56-56h0a56,56,0,0,0-56-56H32" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const CaretLeft = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <polyline points="160 208 80 128 160 48" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const CaretRight = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <polyline points="96 48 176 128 96 208" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const PaperPlaneRight = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M228.44,121.24,52.47,41.22a8,8,0,0,0-10.93,10l29,76.78-29,76.78a8,8,0,0,0,10.93,10L228.44,134.76a8,8,0,0,0,0-13.52Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="70.52" y1="128" x2="116" y2="128" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const Sparkle = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <path d="M128,24V64" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M128,192v40" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M64,128H24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M232,128H192" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M173.25,82.75,201.54,54.46" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M54.46,201.54,82.75,173.25" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M82.75,82.75,54.46,54.46" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M201.54,201.54,173.25,173.25" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const ChatCircleText = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <circle cx="128" cy="128" r="96" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="96" y1="112" x2="160" y2="112" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <line x1="96" y1="144" x2="160" y2="144" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);

export const Image = ({ size = 20, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} {...props}>
    <rect width="256" height="256" fill="none"/>
    <rect x="32" y="48" width="192" height="160" rx="8" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <circle cx="85" cy="95" r="12" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
    <path d="M224,152,183.08,111.08a8,8,0,0,0-11.31,0L128,154.67,111.31,138a8,8,0,0,0-11.31,0L32,205.33" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
  </svg>
);
