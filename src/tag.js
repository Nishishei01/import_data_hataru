const xlsx = require("xlsx");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");

const API_TAG_URL = "http://localhost:3000/api/productTag";
const EXCEL_PATH = path.join(__dirname, "../public/excel/format_data.xlsx");

const workbook = xlsx.readFile(EXCEL_PATH);
const worksheet = workbook.Sheets["product_tag"];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log("📄 Rows loaded from Excel:", data.length);
console.log("🧾 First row preview:", data[0]);

let tagSet = new Set();

async function fetchExistingTags() {
  try {
    const res = await axios.get(`${API_TAG_URL}?limit=1000`);
    const tags = res.data?.docs || res.data?.data || [];
    for (const m of tags) {
      const key = `${m.nameTh?.trim().toLowerCase()}|${m.nameEn?.trim().toLowerCase()}`;
      tagSet.add(key);
    }
    console.log(`🔢 ProductTags loaded: ${tagSet.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch product tags:", err.response?.data || err.message);
  }
}

async function createTagIfNotExists(row) {
  const nameTh = row["nameTh"]?.trim();
  const nameEn = row["nameEn"]?.trim();
  const status = row["status"]?.trim();

  if (!nameTh || !nameEn || !status) {
    console.log("⚠️ Missing required data:", row);
    return;
  }

  const tagKey = `${nameTh.toLowerCase()}|${nameEn.toLowerCase()}`;
  if (tagSet.has(tagKey)) {
    console.log(`🟡 Tag already exists: ${nameTh} / ${nameEn}`);
    return;
  }

  const body = {
    nameTh,
    nameEn,
    status,
  };

  try {
    await axios.post(API_TAG_URL, body);
    console.log(`✅ Created tag: ${nameTh} / ${nameEn}`);
    tagSet.add(tagKey);
  } catch (err) {
    console.error(`❌ Error creating model: ${nameTh} / ${nameEn}`);
    console.error(err.response?.data || err.message);
  }
}

async function processProductTags() {
  await fetchExistingTags();

  for (const row of data) {
    await createTagIfNotExists(row);
  }
}

module.exports = { processProductTags };