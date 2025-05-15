const xlsx = require("xlsx");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");

const API_TYPE_URL = "http://localhost:3000/api/type";
const API_CATEGORY_URL = "http://localhost:3000/api/category";
const API_MEDIA_URL = "http://localhost:3000/api/media";
const EXCEL_PATH = path.join(__dirname, "../public/excel/format_data.xlsx");
const IMAGE_DIR = path.join(__dirname, "../public/images/Type");

const workbook = xlsx.readFile(EXCEL_PATH);
const worksheet = workbook.Sheets["type"];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log("📄 Rows loaded from Excel:", data.length);
console.log("🧾 First row preview:", data[0]);

let mediaMap = new Map();
let categoryMap = new Map();
let typeSet = new Set();

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

async function fetchExistingCategories() {
  try {
    const res = await axios.get(`${API_CATEGORY_URL}?limit=1000`);
    const categories = res.data?.docs || res.data?.data || [];
    for (const cat of categories) {
      const key = `${cat.nameTh?.trim().toLowerCase()}|${cat.nameEn?.trim().toLowerCase()}`;
      categoryMap.set(key, cat.id);
    }
    console.log(`📁 Categories loaded: ${categoryMap.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch categories:", err.response?.data || err.message);
  }
}

async function fetchExistingTypes() {
  try {
    const res = await axios.get(`${API_TYPE_URL}?limit=1000`);
    const types = res.data?.docs || res.data?.data || [];
    for (const t of types) {
      const key = `${t.nameTh?.trim().toLowerCase()}|${t.nameEn?.trim().toLowerCase()}`;
      typeSet.add(key);
    }
    console.log(`🧩 Types loaded: ${typeSet.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch product types:", err.response?.data || err.message);
  }
}

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

async function createTypeIfNotExists(row) {
  const nameTh = row["nameTH"]?.trim();
  const nameEn = row["nameEN"]?.trim();
  const imageName = row["image name"]?.trim();
  const status = row["status"]?.trim() || "ACTIVE";
  const categoryTh = row["categoryTh"]?.trim();
  const categoryEn = row["categoryEn"]?.trim();

  if (!nameTh || !nameEn || !categoryTh || !categoryEn || !imageName) {
    console.log("⚠️ Missing data in row:", row);
    return;
  }

  const typeKey = `${nameTh.toLowerCase()}|${nameEn.toLowerCase()}`;
  if (typeSet.has(typeKey)) {
    console.log(`🟡 ProductType already exists: ${nameTh} / ${nameEn}`);
    return;
  }

  const categoryKey = `${categoryTh.toLowerCase()}|${categoryEn.toLowerCase()}`;
  const categoryId = categoryMap.get(categoryKey);
  if (!categoryId) {
    console.warn(`❌ Category not found for: ${categoryTh} / ${categoryEn}`);
    return;
  }

  const imageId = await uploadImageIfNotExists(imageName);
  if (!imageId) {
    console.warn(`⚠️ Missing image for type: ${nameTh}`);
    return;
  }

  const body = {
    nameTh,
    nameEn,
    image: imageId,
    imageNavbar: imageId,
    status: status.toUpperCase(),
    category: categoryId
  };

  console.log("📤 Creating productType with body:", body);
  try {
    await axios.post(API_TYPE_URL, body);
    console.log(`✅ Created productType: ${nameTh} / ${nameEn}`);
    typeSet.add(typeKey);
  } catch (err) {
    console.error(`❌ Error creating product type: ${nameTh} / ${nameEn}`);
    console.error(err.response?.data || err.message);
  }
}

async function processProductTypes() {
  await fetchExistingMedia();
  await fetchExistingCategories();
  await fetchExistingTypes();

  for (const row of data) {
    await createTypeIfNotExists(row);
  }
}

module.exports = { processProductTypes };
