const Jimp = require('jimp');
const path = require('path');

async function removeBackground() {
  console.log("Reading image...");
  // Use the generated artifact path
  const imagePath = "C:\\Users\\barat\\.gemini\\antigravity\\brain\\32ae0d10-7190-4161-a251-4bc6f44f1de2\\supercar_1784988438983.jpg";
  const image = await Jimp.read(imagePath);
  
  console.log("Removing background...");
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // If pixel is very close to white, make it transparent
    if (r > 230 && g > 230 && b > 230) {
      this.bitmap.data[idx + 3] = 0; // Alpha = 0
    }
  });
  
  console.log("Saving image...");
  await image.writeAsync(path.join(__dirname, '../public/supercar.png'));
  console.log("Done!");
}

removeBackground().catch(console.error);
