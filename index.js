const fs = require("fs");
const express = require("express");
const formidable = require("formidable");
const { imageToWebp } = require("image-to-webp");
const { processCategories } = require('./src/category');
const { processProductTypes, uploadImageIfNotExists } = require("./src/type");
const { processProductModels } = require("./src/model")
const { processProductTags } = require("./src/tag")
const { processProductVariants} = require("./src/variant")
const app = express();

// app.post("/upload", async (req, res) => {
//     const form = formidable({ multiples: false });
//     form.parse(req, async (err, fields, files) => {
//         if (err) {
//           next(err);
//           return;
//         }


//         const image = files.image.filepath;
//         console.log(image);

//         const webpImage = await imageToWebp(image, 30);
//         console.log(webpImage);

//         // now you can copy this file to public directory or simply upload to your cloud storage provider like AWS S3 / Cloudinary / Google Cloud Storage
//         fs.copyFileSync(webpImage, "./public/images/myimg.webp");

//         res.json({ image, webpImage });
//     });
// });

(async () => {
  console.log('🚀 Starting category creation...');
  await processCategories(); 

  console.log('🚀 Starting product type creation...');
  await processProductTypes(); 

  console.log('🚀 Starting product model creation...');
  await processProductModels();

  console.log('🚀 Starting variant creation...');
  await processProductVariants(); 

  console.log('🚀 Starting product tag creation...');
  await processProductTags(); 
})();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on the ${PORT}`);
});
