const fs = require('fs');
const path = require('path');

const searchString = 'https://git.new/pathToRegexpError';

function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      console.log(`ENCONTRADO en: ${filePath}`);
      
      // Mostrar contexto
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchString)) {
          console.log(`Línea ${i+1}: ${lines[i]}`);
        }
      }
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

function searchInDirectory(dir) {
  let found = false;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory() && file !== 'node_modules') {
      if (searchInDirectory(filePath)) {
        found = true;
      }
    } else if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.json'))) {
      if (searchInFile(filePath)) {
        found = true;
      }
    }
  }
  
  return found;
}

console.log("Buscando URL problemática en archivos...");
const projectRoot = path.join(__dirname, '..');
const found = searchInDirectory(projectRoot);

if (!found) {
  console.log("No se encontró la URL en ningún archivo.");
}