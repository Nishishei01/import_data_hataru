const xlsx = require("xlsx");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");

const API_VARIANT_URL = "http://localhost:3000/api/variant";
const EXCEL_PATH = path.join(__dirname, "../public/excel/format_data.xlsx");

const workbook = xlsx.readFile(EXCEL_PATH);
const worksheet = workbook.Sheets["variant"];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log("📄 Rows loaded from Excel:", data.length);
console.log("🧾 First row preview:", data[0]);

let variantSet = new Set();

async function fetchExistingVariants() {
  try {
    const res = await axios.get(`${API_VARIANT_URL}?limit=1000`);
    const varaints = res.data?.docs || res.data?.data || [];
    for (const m of varaints) {
      const key = `${m.nameTh?.trim().toLowerCase()}|${m.nameEn?.trim().toLowerCase()}`;
      variantSet.add(key);
    }
    console.log(`🔢 Variant loaded: ${variantSet.size}`);
  } catch (err) {
    console.error("❌ Failed to fetch variants:", err.response?.data || err.message);
  }
}

async function createVariantIfNotExists(row) {
  const nameTh = row["nameTh"]?.trim();
  const nameEn = row["nameEn"]?.trim();
  const value = row["value"]?.trim();
  const type = row["type"]?.trim();
  const status = row["status"]?.trim();

  if (!nameTh || !nameEn || !status || !value || !type) {
    console.log("⚠️ Missing required data:", row);
    return;
  }

  const variantKey = `${nameTh.toLowerCase()}|${nameEn.toLowerCase()}`;
  if (variantSet.has(variantKey)) {
    console.log(`🟡 Variant already exists: ${nameTh} / ${nameEn}`);
    return;
  }

  const body = {
    nameTh,
    nameEn,
    status,
    value,
    type
  };

  try {
    await axios.post(API_VARIANT_URL, body);
    console.log(`✅ Created variant: ${nameTh} / ${nameEn}`);
    variantSet.add(variantKey);
  } catch (err) {
    console.error(`❌ Error creating variant: ${nameTh} / ${nameEn}`);
    console.error(err.response?.data || err.message);
  }
}

async function processProductVariants() {
  await fetchExistingVariants();

  for (const row of data) {
    await createVariantIfNotExists(row);
  }
}

module.exports = { processProductVariants };