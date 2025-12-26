// Script para analizar las plantillas Excel y extraer estructura
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const plantillasDir = path.join(process.cwd(), 'plantillas');

const archivos = fs.readdirSync(plantillasDir).filter(f => f.endsWith('.xlsx'));

console.log(`\n📊 Analizando ${archivos.length} plantillas...\n`);

archivos.forEach((archivo, index) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${index + 1}. ${archivo}`);
  console.log('='.repeat(80));
  
  try {
    const filePath = path.join(plantillasDir, archivo);
    const workbook = XLSX.readFile(filePath);
    
    console.log(`\n📑 Hojas (${workbook.SheetNames.length}):`);
    workbook.SheetNames.forEach((sheetName, i) => {
      const sheet = workbook.Sheets[sheetName];
      const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { e: { r: 0, c: 0 } };
      console.log(`   ${i + 1}. "${sheetName}" (${range.e.r + 1} filas, ${range.e.c + 1} columnas)`);
      
      // Mostrar primeras filas como muestra
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      console.log(`\n   Primeras 5 filas de "${sheetName}":`);
      data.slice(0, 5).forEach((row, rowIdx) => {
        const rowData = Array.isArray(row) ? row.slice(0, 10).join(' | ') : JSON.stringify(row);
        console.log(`   Fila ${rowIdx + 1}: ${rowData.substring(0, 150)}${rowData.length > 150 ? '...' : ''}`);
      });
    });
    
  } catch (error) {
    console.error(`   ❌ Error leyendo archivo: ${error.message}`);
  }
});

console.log(`\n${'='.repeat(80)}\n`);

