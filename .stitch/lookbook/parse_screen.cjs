const fs = require('fs');
const html = fs.readFileSync('d:/E-kodak Final/.stitch/lookbook/screen_clean.html', 'utf8');

const matches = html.match(/src="https:\/\/lh3\.googleusercontent\.com\/[^"]+/g) || [];
console.log('Total Stitch image links found:', matches.length);
matches.forEach((m, i) => {
  console.log(`[${i}] ${m.slice(5)}`);
});
