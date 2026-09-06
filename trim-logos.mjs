import sharp from "sharp";
import { writeFileSync } from "fs";

// sample background color from a corner pixel
async function cornerColor(input) {
  const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  return { r: data[0], g: data[1], b: data[2] };
}

const bg = await cornerColor("public/SitterBookLogo.png");
console.log("bg color", bg);

// Wordmark: trim tight, keep transparent-free background as-is
const wordmarkTrimmed = sharp("public/SitterBookLogo.png").trim({ threshold: 10 });
const wordmarkBuf = await wordmarkTrimmed.toBuffer({ resolveWithObject: true });
writeFileSync("public/SitterBookLogo.png", wordmarkBuf.data);
console.log("wordmark", wordmarkBuf.info.width, wordmarkBuf.info.height);

// Square icon: trim tight, then pad to a perfect square with matching background
const iconTrimmed = sharp("public/SitterBookLogoSquare.png").trim({ threshold: 10 });
const iconBuf = await iconTrimmed.toBuffer({ resolveWithObject: true });
const side = Math.max(iconBuf.info.width, iconBuf.info.height);
const padded = await sharp(iconBuf.data, { raw: { width: iconBuf.info.width, height: iconBuf.info.height, channels: iconBuf.info.channels } })
  .extend({
    top: Math.floor((side - iconBuf.info.height) / 2),
    bottom: Math.ceil((side - iconBuf.info.height) / 2),
    left: Math.floor((side - iconBuf.info.width) / 2),
    right: Math.ceil((side - iconBuf.info.width) / 2),
    background: bg,
  })
  .png()
  .toBuffer();
writeFileSync("public/SitterBookLogoSquare.png", padded);
console.log("icon square side", side);
