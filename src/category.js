const xlsx = require("xlsx");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");

const API_CATEGORY_URL = "http://localhost:3000/api/category";
const API_MEDIA_URL = "http://localhost:3000/api/media";
const EXCEL_PATH = path.join(__dirname, "../public/excel/format_data.xlsx");
const IMAGE_DIR = path.join(__dirname, "../public/images/Category");

// Load Excel
const workbook = xlsx.readFile(EXCEL_PATH);
const worksheet = workbook.Sheets["category"];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log("📄 Rows loaded from Excel:", data.length);
console.log("🧾 First row preview:", data[0]);

// 🔁 Cache
let mediaMap = new Map();
let categorySet = new Set();

// ✅ ดึง media ทั้งหมด
async function fetchExistingMedia() {
  try {
    const res = await axios.get(`${API_MEDIA_URL}?limit=1000`);
    const medias = res.data?.docs || [];
    for (const media of medias) {
      const filename = media.filename?.trim().toLowerCase();
      if (filename) mediaMap.set(filename, media.id);
    }
    console.log(`📦 Media loaded: ${mediaMap.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch media:", err.response?.data || err.message);
  }
}

// ✅ ดึง category ทั้งหมด
async function fetchExistingCategories() {
  try {
    const res = await axios.get(`${API_CATEGORY_URL}?limit=1000`);
    const cats = res.data?.docs || res.data?.data || [];
    for (const cat of cats) {
      const key = `${cat.nameTh?.trim().toLowerCase()}|${cat.nameEn?.trim().toLowerCase()}`;
      categorySet.add(key);
    }
    console.log(`📁 Categories loaded: ${categorySet.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch categories:", err.response?.data || err.message);
  }
}

// 📤 Upload รูปภาพ (ถ้าไม่เคยอัป)
async function uploadImageIfNotExists(imageName) {
  if (!imageName) return null;
  const key = imageName.trim().toLowerCase();

  if (mediaMap.has(key)) {
    console.log(`🟡 Found existing media in DB: ${imageName}`);
    return mediaMap.get(key);
  }

  const imagePath = path.join(IMAGE_DIR, imageName);
  console.log(`🧪 Checking image path: ${imagePath}`);
  if (!fs.existsSync(imagePath)) {
    console.warn(`❌ Image not found on disk: ${imageName}`);
    return null;
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));

  try {
    const res = await axios.post(API_MEDIA_URL, form, {
      headers: form.getHeaders()
    });

    const uploadedId = res.data?.doc?.id || res.data?.id || null;
    if (uploadedId) {
      console.log(`✅ Uploaded new image: ${imageName}`);
      mediaMap.set(key, uploadedId);
      return uploadedId;
    } else {
      console.error(`❌ Upload succeeded but no ID returned: ${imageName}`);
      return null;
    }
  } catch (err) {
    console.error(`❌ Error uploading image: ${imageName}`);
    console.error(err.response?.data || err.message);
    return null;
  }
}

// ✅ Create Category (ถ้ายังไม่มี)
async function createCategoryIfNotExists(nameTh, nameEn, imageId, imageNavbarId, status = "ACTIVE") {
  const key = `${nameTh.toLowerCase()}|${nameEn.toLowerCase()}`;
  if (categorySet.has(key)) {
    console.log(`🟡 Skipping existing category: ${nameTh} / ${nameEn}`);
    return;
  }

  try {
    const body = {
      nameTh,
      nameEn,
      image: imageId,
      imageNavbar: imageNavbarId,
      status: status.toUpperCase()
    };

    await axios.post(API_CATEGORY_URL, body);
    console.log(`✅ Created category: ${nameTh} / ${nameEn}`);
    categorySet.add(key); // 🧠 เพิ่มเข้า cache
  } catch (err) {
    console.error(`❌ Error creating category: ${nameTh} / ${nameEn}`);
    console.error(err.response?.data || err.message);
  }
}

// 🌀 Main processor
async function processCategories() {
  await fetchExistingMedia();
  await fetchExistingCategories();

  for (const row of data) {
    const nameTh = row["nameTh"]?.trim();
    const nameEn = row["nameEn"]?.trim();
    const imageName = row["imageName"]?.trim();
    const imageNavbarName = row["imageNavbar"]?.trim() || imageName;
    const status = row["Status"]?.trim() || "ACTIVE";

    if (!nameTh || !nameEn || !imageName) {
      console.log("⚠️ Missing data in row:", row);
      continue;
    }

    const imageId = await uploadImageIfNotExists(imageName);
    const imageNavbarId = await uploadImageIfNotExists(imageNavbarName);

    if (!imageId || !imageNavbarId) {
      console.warn(`⚠️ Skipping category: ${nameTh} / ${nameEn} due to image issue`);
      continue;
    }

    await createCategoryIfNotExists(nameTh, nameEn, imageId, imageNavbarId, status);
  }
}

module.exports = { processCategories };

