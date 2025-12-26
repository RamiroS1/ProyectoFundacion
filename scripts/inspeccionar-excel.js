// Script rápido para inspeccionar estructura de Excel
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '..', 'plantillas', 'FORMATO DE CARACTERIZACION- DISTRIBUCION DE AREAS.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Hojas:', workbook.SheetNames);
console.log('\n');

const sheet = workbook.Sheets['FORMATO'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`Total filas: ${data.length}`);
console.log(`Primeras 10 filas:\n`);

data.slice(0, 10).forEach((row, i) => {
  console.log(`Fila ${i + 1}:`, row.slice(0, 5));
});

