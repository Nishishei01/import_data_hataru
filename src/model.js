const xlsx = require("xlsx");
const axios = require("axios");
const path = require("path");

const API_MODEL_URL = "http://localhost:3000/api/productModel";
const API_TYPE_URL = "http://localhost:3000/api/type";
const EXCEL_PATH = path.join(__dirname, "../public/excel/format_data.xlsx");

// Load Excel
const workbook = xlsx.readFile(EXCEL_PATH);
const worksheet = workbook.Sheets["product_model"];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log("📄 Rows loaded from Excel:", data.length);
console.log("🧾 First row preview:", data[0]);

let typeMap = new Map();
let modelSet = new Set();

async function fetchExistingTypes() {
  try {
    const res = await axios.get(`${API_TYPE_URL}?limit=1000`);
    const types = res.data?.docs || res.data?.data || [];
    for (const t of types) {
      const key = `${t.nameEn?.trim().toLowerCase()}|${t.nameTh?.trim().toLowerCase()}`;
      typeMap.set(key, t.id);
    }
    console.log(`📁 ProductTypes loaded: ${typeMap.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch types:", err.response?.data || err.message);
  }
}

async function fetchExistingModels() {
  try {
    const res = await axios.get(`${API_MODEL_URL}?limit=1000`);
    const models = res.data?.docs || res.data?.data || [];
    for (const m of models) {
      const key = `${m.nameTh?.trim().toLowerCase()}|${m.nameEn?.trim().toLowerCase()}`;
      modelSet.add(key);
    }
    console.log(`🔢 ProductModels loaded: ${modelSet.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch product models:", err.response?.data || err.message);
  }
}

async function createModelIfNotExists(row) {
  const nameTh = row["nameTh"]?.trim();
  const nameEn = row["nameEn"]?.trim();
  const typeEn = row["typeEn"]?.trim();
  const typeTh = row["typeTh"]?.trim();

  if (!nameTh || !nameEn || !typeTh || !typeEn) {
    console.log("⚠️ Missing required data:", row);
    return;
  }

  const modelKey = `${nameTh.toLowerCase()}|${nameEn.toLowerCase()}`;
  if (modelSet.has(modelKey)) {
    console.log(`🟡 Model already exists: ${nameTh} / ${nameEn}`);
    return;
  }

  const typeKey = `${typeTh.toLowerCase()}|${typeEn.toLowerCase()}`;
  const typeId = typeMap.get(typeKey);

  if (!typeId) {
    console.warn(`❌ Type not found: ${typeTh} / ${typeEn}`);
    return;
  }
  
  const body = {
    nameTh,
    nameEn,
    type: typeId,
  };

  try {
    await axios.post(API_MODEL_URL, body);
    console.log(`✅ Created model: ${nameTh} / ${nameEn}`);
    modelSet.add(modelKey);
  } catch (err) {
    console.error(`❌ Error creating model: ${nameTh} / ${nameEn}`);
    console.error(err.response?.data || err.message);
  }
}

async function processProductModels() {
  await fetchExistingTypes();
  await fetchExistingModels();

  for (const row of data) {
    await createModelIfNotExists(row);
  }
}

module.exports = { processProductModels };
