#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Tüm services dosyalarını al
function getAllServiceFiles() {
  const output = execSync('find services -name "*.ts" -type f', { encoding: 'utf8' });
  return output.trim().split('\n').filter(Boolean);
}

// Bir dosyanın gerçek kullanımını çok detaylı kontrol et
function checkFileUsage(servicePath) {
  const fileName = path.basename(servicePath, '.ts');
  const fileNameWithoutExt = fileName;
  
  console.log(`\n🔍 Checking: ${servicePath}`);
  
  // Tüm olası import pattern'leri
  const searchPatterns = [
    // Absolute imports
    `@/services/${servicePath.replace('services/', '').replace('.ts', '')}`,
    `@/${servicePath.replace('.ts', '')}`,
    
    // Relative imports  
    `./${fileNameWithoutExt}`,
    `../${fileNameWithoutExt}`,
    `./services/${fileNameWithoutExt}`,
    
    // Direct filename references
    fileNameWithoutExt,
    
    // Service path variations
    servicePath.replace('.ts', ''),
    servicePath.replace('services/', ''),
  ];
  
  let totalRefs = 0;
  const foundIn = new Set();
  
  // Her pattern için arama yap
  for (const pattern of searchPatterns) {
    try {
      // Import statements
      const importCmd = `grep -r "from.*['\"]${pattern}['\"]\\|import.*['\"]${pattern}['\"]" --include="*.ts" --include="*.tsx" . | grep -v "${servicePath}"`;
      const importResult = execSync(importCmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
      if (importResult) {
        const lines = importResult.split('\n');
        totalRefs += lines.length;
        lines.forEach(line => {
          const file = line.split(':')[0];
          foundIn.add(file);
        });
      }
    } catch (e) {
      // No matches
    }
  }
  
  // Dosya içeriğinden export'ları çıkar ve onları da ara
  try {
    const content = fs.readFileSync(servicePath, 'utf8');
    
    // Export'ları bul
    const exportMatches = [
      ...content.matchAll(/export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g),
      ...content.matchAll(/export\s*\{\s*([^}]+)\s*\}/g),
      ...content.matchAll(/export\s+default\s+(\w+)/g)
    ];
    
    const exports = new Set();
    exportMatches.forEach(match => {
      if (match[1]) {
        if (match[0].includes('{')) {
          // Export object
          const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
          names.forEach(name => exports.add(name));
        } else {
          exports.add(match[1]);
        }
      }
    });
    
    // Her export için kullanım ara
    for (const exportName of exports) {
      if (exportName && exportName.length > 2) {
        try {
          const exportCmd = `grep -r "\\b${exportName}\\b" --include="*.ts" --include="*.tsx" . | grep -v "${servicePath}" | grep -v "__tests__" | grep -v ".test." | grep -v ".spec."`;
          const exportResult = execSync(exportCmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
          if (exportResult) {
            const lines = exportResult.split('\n');
            totalRefs += lines.length;
            lines.forEach(line => {
              const file = line.split(':')[0];
              foundIn.add(file);
            });
          }
        } catch (e) {
          // No matches
        }
      }
    }
    
    console.log(`  📤 Exports found: [${Array.from(exports).join(', ')}]`);
    
  } catch (e) {
    console.log(`  ❌ Cannot read file: ${e.message}`);
  }
  
  const status = totalRefs === 0 ? '🔴 UNUSED' : totalRefs < 3 ? '🟡 LOW' : '🟢 ACTIVE';
  console.log(`  ${status} - ${totalRefs} references`);
  
  if (foundIn.size > 0) {
    console.log(`  📁 Found in: ${Array.from(foundIn).slice(0, 3).join(', ')}${foundIn.size > 3 ? '...' : ''}`);
  }
  
  return {
    file: servicePath,
    refs: totalRefs,
    status: totalRefs === 0 ? 'UNUSED' : totalRefs < 3 ? 'LOW' : 'ACTIVE',
    foundIn: Array.from(foundIn)
  };
}

// Ana kontrol
function main() {
  console.log('🔍 FINAL Unused Services Check');
  console.log('===============================\n');
  
  const serviceFiles = getAllServiceFiles();
  const results = [];
  
  console.log(`Checking ${serviceFiles.length} service files for actual usage...\n`);
  
  for (const serviceFile of serviceFiles) {
    const result = checkFileUsage(serviceFile);
    results.push(result);
  }
  
  // Sadece gerçekten unused olanları göster
  const unused = results.filter(r => r.status === 'UNUSED');
  const lowUsage = results.filter(r => r.status === 'LOW');
  
  console.log('\n📊 FINAL RESULTS');
  console.log('=================');
  console.log(`Total services: ${results.length}`);
  console.log(`🔴 Actually unused: ${unused.length}`);
  console.log(`🟡 Low usage (review): ${lowUsage.length}`);
  console.log(`🟢 Active: ${results.length - unused.length - lowUsage.length}`);
  
  if (unused.length > 0) {
    console.log('\n🔴 ACTUALLY UNUSED SERVICES:');
    unused.forEach(u => {
      console.log(`  ❌ ${u.file} - SAFE TO REMOVE`);
    });
  } else {
    console.log('\n✅ NO UNUSED SERVICES FOUND!');
    console.log('All services are being used somewhere in the codebase.');
  }
  
  if (lowUsage.length > 0) {
    console.log('\n🟡 LOW USAGE (REVIEW NEEDED):');
    lowUsage.forEach(u => {
      console.log(`  ⚠️  ${u.file} (${u.refs} refs) - Review if still needed`);
    });
  }
}

const path = require('path');
main();
