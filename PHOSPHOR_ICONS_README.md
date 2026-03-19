# Phosphor Icons Extraction and Analysis

This directory contains the phosphor-icons.zip file and tools to extract and analyze it.

## Files in This Directory

1. **phosphor-icons.zip** - The original Phosphor Icons archive
2. **simple_extract.py** - Python script to extract and analyze the zip file
3. **PHOSPHOR_ICONS_COMPREHENSIVE_GUIDE.md** - Complete guide with 1,240+ icon names organized by category
4. **PHOSPHOR_ICONS_README.md** - This file (instructions)

## How to Extract the Zip File

### Option 1: Using the Python Script (Recommended)

Run the extraction script from the command line:

```bash
cd "c:\Users\400041460038\Desktop\code main\airank0307-main (1)"
python simple_extract.py
```

This will:
- Extract all files to `phosphor-icons-extracted/` directory
- Display directory structure and icon names in the console
- Create a detailed report in `phosphor-icons-analysis.txt`

### Option 2: Manual Extraction

1. Right-click on `phosphor-icons.zip`
2. Select "Extract All..."
3. Choose destination folder
4. Click "Extract"

### Option 3: Using Command Line

#### Windows PowerShell:
```powershell
Expand-Archive -Path ".\phosphor-icons.zip" -DestinationPath ".\phosphor-icons-extracted"
```

#### Windows Command Prompt with 7-Zip:
```cmd
7z x phosphor-icons.zip -o"phosphor-icons-extracted"
```

#### Git Bash or WSL:
```bash
unzip phosphor-icons.zip -d phosphor-icons-extracted
```

## What's Inside

The Phosphor Icons library contains:

- **1,240+ unique icons** across 57 categories
- **6 different weights/styles** per icon (Regular, Thin, Light, Bold, Fill, Duotone)
- **~7,440+ total icon variations** (icons × weights)
- **SVG format** - scalable and lightweight
- **Consistent naming** - kebab-case format

## Icon Categories Preview

The library includes icons for:

- Arrows & Navigation (50+ icons)
- Communication & Social (40+ icons)
- Media & Controls (60+ icons)
- User & People (30+ icons)
- Interface & UI Elements (80+ icons)
- Files & Folders (40+ icons)
- Weather (25+ icons)
- Commerce & Shopping (25+ icons)
- Maps & Location (30+ icons)
- Devices & Technology (50+ icons)
- Editing & Design (60+ icons)
- Brands & Logos (60+ icons)
- Business & Office (40+ icons)
- Science & Education (35+ icons)
- Nature & Animals (30+ icons)
- Food & Drink (25+ icons)
- Sports & Games (25+ icons)
- Warnings & Alerts (20+ icons)
- Time & Calendar (20+ icons)
- Miscellaneous (100+ icons)

See **PHOSPHOR_ICONS_COMPREHENSIVE_GUIDE.md** for the complete list of icon names!

## Common Icons for UI Development

### Essential Navigation Icons
```
arrow-left          arrow-right         arrow-up            arrow-down
caret-left          caret-right         caret-up            caret-down
hamburger-menu      x                   list                dots-three
```

### Common Action Icons
```
plus                plus-circle         minus               minus-circle
check               check-circle        x-circle            pencil
trash               trash-simple        share               download
upload              copy                link                link-simple
```

### Social & Communication
```
heart               heart-straight      star                bookmark
chat                chat-circle         envelope            phone
bell                bell-ringing        share-network       paper-plane
```

### Media Controls
```
play                pause               stop                skip-forward
skip-back           volume-high         volume-low          volume-x
image               camera              video-camera        music-note
```

### User & Settings
```
user                user-circle         users               gear
gear-six            lock                lock-open           eye
eye-slash           key                 shield              info
```

### Search & Filters
```
magnifying-glass    funnel              sliders             calendar
clock               list-bullets        grid-four           squares-four
```

## Usage Example

After extraction, you can use the icons in your project:

### HTML
```html
<img src="phosphor-icons-extracted/regular/heart.svg" alt="Heart">
```

### CSS
```css
.icon {
  background-image: url('phosphor-icons-extracted/regular/heart.svg');
  width: 24px;
  height: 24px;
}
```

### React (with npm package)
```jsx
import { Heart, Star, ArrowLeft } from "@phosphor-icons/react";

<Heart size={32} weight="fill" color="red" />
```

## Resources

- Official Website: https://phosphoricons.com/
- GitHub Repository: https://github.com/phosphor-icons
- NPM Package: `@phosphor-icons/core`
- React Package: `@phosphor-icons/react`
- Vue Package: `@phosphor-icons/vue`

## License

Phosphor Icons are released under the MIT License, making them free for both personal and commercial use.

## Support

For issues or questions about Phosphor Icons:
- Visit: https://github.com/phosphor-icons/core/issues
- Documentation: https://phosphoricons.com/

---

**Note**: If you encounter any issues running the extraction script, make sure you have Python 3 installed. Check with `python --version` or `python3 --version`.
