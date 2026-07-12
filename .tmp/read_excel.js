const XLSX = require('xlsx');
const file = process.argv[2];
const workbook = XLSX.readFile(file);
const sheetNames = workbook.SheetNames;
console.log('Sheets:', sheetNames);

for (const name of sheetNames) {
    console.log('\n--- Sheet:', name, '---');
    const sheet = workbook.Sheets[name];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Print first 8 rows to get a good sense of the layout
    for (let i = 0; i < Math.min(8, json.length); i++) {
        console.log(`Row ${i + 1}:`, JSON.stringify(json[i]));
    }
}
