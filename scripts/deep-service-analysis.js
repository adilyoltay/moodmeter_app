#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Tüm services dosyalarını al
function getAllServiceFiles() {
  const output = execSync('find services -name "*.ts" -type f', { encoding: 'utf8' });
  return output.trim().split('\n').filter(Boolean);
}

// Bir dosyanın gerçek kullanımını kontrol et
function analyzeServiceUsage(servicePath) {
  const fileName = path.basename(servicePath, '.ts');
  const relativePath = servicePath.replace('.ts', '');
  
  console.log(`\n🔍 Analyzing: ${servicePath}`);
  
  // 1. Direct file path imports
  const patterns = [
    `"@/services/${relativePath.replace('services/', '')}"`,
    `'@/services/${relativePath.replace('services/', '')}'`,
    `"@/${relativePath}"`,
    `'@/${relativePath}'`,
    `from.*${relativePath}`,
    `import.*${relativePath}`
  ];
  
  let totalRefs = 0;
  const foundIn = [];
  
  for (const pattern of patterns) {
    try {
      const cmd = `grep -r "${pattern}" --include="*.ts" --include="*.tsx" . | grep -v "${servicePath}"`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
      if (result) {
        const lines = result.split('\n');
        totalRefs += lines.length;
        lines.forEach(line => {
          const file = line.split(':')[0];
          if (!foundIn.includes(file)) foundIn.push(file);
        });
      }
    } catch (e) {
      // No matches
    }
  }
  
  // 2. Export names usage
  let content = '';
  try {
    content = fs.readFileSync(servicePath, 'utf8');
  } catch (e) {
    console.log(`  ❌ Cannot read file: ${e.message}`);
    return { file: servicePath, status: 'ERROR', refs: 0, foundIn: [] };
  }
  
  // Export'ları bul
  const exports = [];
  
  // Default export
  const defaultExportMatch = content.match(/export\s+default\s+(\w+)/);
  if (defaultExportMatch) exports.push(defaultExportMatch[1]);
  
  // Named exports
  const namedExports = content.match(/export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g);
  if (namedExports) {
    namedExports.forEach(match => {
      const name = match.match(/export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/)[1];
      exports.push(name);
    });
  }
  
  // Export object patterns
  const exportObjects = content.match(/export\s*\{\s*([^}]+)\s*\}/g);
  if (exportObjects) {
    exportObjects.forEach(match => {
      const names = match.match(/\{\s*([^}]+)\s*\}/)[1];
      names.split(',').forEach(name => {
        const cleanName = name.trim().split(' as ')[0].trim();
        if (cleanName) exports.push(cleanName);
      });
    });
  }
  
  // Her export için kullanım ara
  for (const exportName of exports) {
    if (exportName && exportName.length > 2) { // Çok kısa isimleri atla
      try {
        const cmd = `grep -r "\\b${exportName}\\b" --include="*.ts" --include="*.tsx" . | grep -v "${servicePath}" | grep -v "__tests__" | grep -v ".test." | grep -v ".spec."`;
        const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
        if (result) {
          const lines = result.split('\n');
          totalRefs += lines.length;
          lines.forEach(line => {
            const file = line.split(':')[0];
            if (!foundIn.includes(file)) foundIn.push(file);
          });
        }
      } catch (e) {
        // No matches
      }
    }
  }
  
  let status = '🔴 UNUSED';
  if (totalRefs > 0) {
    status = totalRefs < 3 ? '🟡 LOW' : '🟢 ACTIVE';
  }
  
  console.log(`  ${status} - ${totalRefs} references`);
  console.log(`  📤 Exports: [${exports.join(', ')}]`);
  if (foundIn.length > 0) {
    console.log(`  📁 Found in: ${foundIn.slice(0, 3).join(', ')}${foundIn.length > 3 ? '...' : ''}`);
  }
  
  return {
    file: servicePath,
    status: status.includes('UNUSED') ? 'UNUSED' : status.includes('LOW') ? 'LOW' : 'ACTIVE',
    refs: totalRefs,
    exports: exports,
    foundIn: foundIn
  };
}

// Ana analiz
function main() {
  console.log('🔍 DEEP Services Usage Analysis');
  console.log('================================\n');
  
  const serviceFiles = getAllServiceFiles();
  const results = [];
  
  console.log(`Analyzing ${serviceFiles.length} service files...\n`);
  
  for (const serviceFile of serviceFiles) {
    const analysis = analyzeServiceUsage(serviceFile);
    results.push(analysis);
  }
  
  // Özet
  const unused = results.filter(r => r.status === 'UNUSED');
  const lowUsage = results.filter(r => r.status === 'LOW');
  const active = results.filter(r => r.status === 'ACTIVE');
  
  console.log('\n📊 DEEP ANALYSIS SUMMARY');
  console.log('========================');
  console.log(`Total services: ${results.length}`);
  console.log(`🔴 Unused: ${unused.length}`);
  console.log(`🟡 Low usage: ${lowUsage.length}`);
  console.log(`🟢 Active: ${active.length}`);
  
  if (unused.length > 0) {
    console.log('\n🔴 UNUSED SERVICES:');
    unused.forEach(u => {
      console.log(`  - ${u.file} (${u.refs} refs)`);
    });
  }
  
  if (lowUsage.length > 0) {
    console.log('\n🟡 LOW USAGE SERVICES:');
    lowUsage.forEach(u => {
      console.log(`  - ${u.file} (${u.refs} refs)`);
    });
  }
  
  // JSON rapor kaydet
  fs.writeFileSync('reports/deep-services-analysis.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed report saved to: reports/deep-services-analysis.json');
}

main();
