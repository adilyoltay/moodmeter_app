#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Services klasöründeki tüm dosyaları al
function getServiceFiles() {
  const output = execSync('find services -name "*.ts" -type f', { encoding: 'utf8' });
  return output.trim().split('\n').filter(Boolean);
}

// Bir dosyanın export'larını analiz et
function analyzeExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = [];
    
    // Default export
    if (content.includes('export default')) {
      exports.push('default');
    }
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    // Export { ... } patterns
    const exportBlockRegex = /export\s*{\s*([^}]+)\s*}/g;
    while ((match = exportBlockRegex.exec(content)) !== null) {
      const exportNames = match[1].split(',').map(name => name.trim().split(' as ')[0]);
      exports.push(...exportNames);
    }
    
    return exports;
  } catch (error) {
    return [];
  }
}

// Bir service'in kullanımını kontrol et
function checkServiceUsage(servicePath) {
  const fileName = path.basename(servicePath, '.ts');
  const exports = analyzeExports(servicePath);
  
  const results = {
    file: servicePath,
    exports: exports,
    usage: {
      directImports: 0,
      namedImports: 0,
      defaultImports: 0
    },
    importedBy: []
  };
  
  try {
    // Direct file import check
    const directImportCmd = `rg -l "from ['\"]@?/?${servicePath.replace('.ts', '')}['\"]" --glob "**/*.{ts,tsx}" --glob "!${servicePath}"`;
    try {
      const directImports = execSync(directImportCmd, { encoding: 'utf8' }).trim();
      if (directImports) {
        results.usage.directImports = directImports.split('\n').length;
        results.importedBy.push(...directImports.split('\n'));
      }
    } catch (e) {
      // No direct imports found
    }
    
    // Check for each named export
    exports.forEach(exportName => {
      if (exportName && exportName !== 'default') {
        try {
          const namedImportCmd = `rg -l "\\b${exportName}\\b" --glob "**/*.{ts,tsx}" --glob "!${servicePath}"`;
          const namedImports = execSync(namedImportCmd, { encoding: 'utf8' }).trim();
          if (namedImports) {
            results.usage.namedImports += namedImports.split('\n').length;
          }
        } catch (e) {
          // No named imports found
        }
      }
    });
    
  } catch (error) {
    console.error(`Error analyzing ${servicePath}:`, error.message);
  }
  
  return results;
}

// Ana analiz
function main() {
  console.log('🔍 Detailed Services Usage Analysis');
  console.log('=====================================\n');
  
  const serviceFiles = getServiceFiles();
  const results = [];
  
  console.log(`Analyzing ${serviceFiles.length} service files...\n`);
  
  for (const serviceFile of serviceFiles) {
    const analysis = checkServiceUsage(serviceFile);
    results.push(analysis);
    
    const totalUsage = analysis.usage.directImports + analysis.usage.namedImports;
    const status = totalUsage === 0 ? '🔴 UNUSED' : totalUsage < 3 ? '🟡 LOW USAGE' : '🟢 ACTIVE';
    
    console.log(`${status} ${serviceFile}`);
    console.log(`  Exports: [${analysis.exports.join(', ')}]`);
    console.log(`  Usage: ${totalUsage} total (${analysis.usage.directImports} direct, ${analysis.usage.namedImports} named)`);
    if (analysis.importedBy.length > 0) {
      console.log(`  Imported by: ${analysis.importedBy.slice(0, 3).join(', ')}${analysis.importedBy.length > 3 ? '...' : ''}`);
    }
    console.log('');
  }
  
  // Özet
  const unused = results.filter(r => (r.usage.directImports + r.usage.namedImports) === 0);
  const lowUsage = results.filter(r => {
    const total = r.usage.directImports + r.usage.namedImports;
    return total > 0 && total < 3;
  });
  
  console.log('\n📊 SUMMARY');
  console.log('===========');
  console.log(`Total services: ${results.length}`);
  console.log(`🔴 Unused (0 refs): ${unused.length}`);
  console.log(`🟡 Low usage (1-2 refs): ${lowUsage.length}`);
  console.log(`🟢 Active (3+ refs): ${results.length - unused.length - lowUsage.length}`);
  
  if (unused.length > 0) {
    console.log('\n🔴 HIGH PRIORITY CLEANUP CANDIDATES:');
    unused.forEach(u => console.log(`  - ${u.file}`));
  }
  
  if (lowUsage.length > 0) {
    console.log('\n🟡 MEDIUM PRIORITY REVIEW CANDIDATES:');
    lowUsage.forEach(u => console.log(`  - ${u.file} (${u.usage.directImports + u.usage.namedImports} refs)`));
  }
  
  // JSON rapor kaydet
  fs.writeFileSync('reports/services-usage-analysis.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed JSON report saved to: reports/services-usage-analysis.json');
}

main();
