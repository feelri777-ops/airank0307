import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read the tools data from the live JSON file
const liveDataPath = path.join(__dirname, '../data/top20_live.json');
if (!fs.existsSync(liveDataPath)) {
    console.error('Could not find data/top20_live.json. Run get_live_top20.js first.');
    process.exit(1);
}

const top20 = JSON.parse(fs.readFileSync(liveDataPath, 'utf-8'));

// 2. Download function with redirect handling
const downloadFile = (url, targetPath, toolName, rank) => {
    https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
            downloadFile(response.headers.location, targetPath, toolName, rank);
            return;
        }

        if (response.statusCode !== 200) {
            console.error(`Failed to download for ${toolName}: ${response.statusCode}`);
            return;
        }

        const file = fs.createWriteStream(targetPath);
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded: ${toolName} (${rank})`);
        });
    }).on('error', (err) => {
        if (fs.existsSync(targetPath)) fs.unlink(targetPath, () => {});
        console.error(`Error downloading for ${toolName}: ${err.message}`);
    });
};

const downloadLogo = (tool, rank) => {
    let hostname;
    try {
        hostname = new URL(tool.url).hostname;
    } catch (e) {
        console.error(`Invalid URL for ${tool.name}: ${tool.url}`);
        return;
    }

    const logoUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    const targetPath = path.join(__dirname, '../extracted_logos', `${rank.toString().padStart(2, '0')}_${tool.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
    
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    downloadFile(logoUrl, targetPath, tool.name, rank);
};

// 3. Execute downloads
console.log(`Starting download for top ${top20.length} live tools...`);
top20.forEach((tool, index) => {
    downloadLogo(tool, index + 1);
});
