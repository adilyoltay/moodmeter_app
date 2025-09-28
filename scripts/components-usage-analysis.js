#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Tüm component dosyalarını al
function getAllComponentFiles() {
  const output = execSync('find components -name "*.tsx" -type f', { encoding: 'utf8' });
  return output.trim().split('\n').filter(Boolean);
}

// Bir component'in export'larını analiz et
function analyzeExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = [];
    
    // Default export
    if (content.includes('export default')) {
      // Component adını dosya adından çıkar
      const fileName = path.basename(filePath, '.tsx');
      exports.push(fileName);
    }
    
    // Named exports - function components
    const namedFunctionRegex = /export\s+(?:const|function)\s+(\w+)/g;
    let match;
    while ((match = namedFunctionRegex.exec(content)) !== null) {
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

// Bir component'in kullanımını kontrol et
function checkComponentUsage(componentPath) {
  const fileName = path.basename(componentPath, '.tsx');
  const exports = analyzeExports(componentPath);
  
  console.log(`\n🔍 Analyzing: ${componentPath}`);
  console.log(`  📤 Exports: [${exports.join(', ')}]`);
  
  const results = {
    file: componentPath,
    exports: exports,
    usage: {
      imports: 0,
      jsxUsages: 0,
      bundleIncluded: false
    },
    foundIn: []
  };
  
  try {
    // 1. Import usage check
    const importPatterns = [
      `from.*['\"]@/components/${componentPath.replace('components/', '').replace('.tsx', '')}['\"]`,
      `from.*['\"]\\.\\.?/.*${fileName}['\"]`,
      `import.*${fileName}`,
    ];
    
    for (const pattern of importPatterns) {
      try {
        const importCmd = `grep -r "${pattern}" --include="*.ts" --include="*.tsx" . | grep -v "${componentPath}"`;
        const importResult = execSync(importCmd, { encoding: 'utf8' }).trim();
        if (importResult) {
          const lines = importResult.split('\n');
          results.usage.imports += lines.length;
          lines.forEach(line => {
            const file = line.split(':')[0];
            if (!results.foundIn.includes(file)) results.foundIn.push(file);
          });
        }
      } catch (e) {
        // No matches
      }
    }
    
    // 2. JSX usage check
    for (const exportName of exports) {
      if (exportName && exportName.length > 2) {
        try {
          // JSX usage: <ComponentName> or <ComponentName/>
          const jsxCmd = `grep -r "<${exportName}\\b" --include="*.tsx" . | grep -v "${componentPath}"`;
          const jsxResult = execSync(jsxCmd, { encoding: 'utf8' }).trim();
          if (jsxResult) {
            const lines = jsxResult.split('\n');
            results.usage.jsxUsages += lines.length;
            lines.forEach(line => {
              const file = line.split(':')[0];
              if (!results.foundIn.includes(file)) results.foundIn.push(file);
            });
          }
        } catch (e) {
          // No matches
        }
      }
    }
    
    // 3. Bundle check
    try {
      const bundleCmd = `grep -c "${componentPath}" reports/ios-components.bundle.map`;
      const bundleResult = execSync(bundleCmd, { encoding: 'utf8' }).trim();
      results.usage.bundleIncluded = parseInt(bundleResult) > 0;
    } catch (e) {
      results.usage.bundleIncluded = false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error analyzing ${componentPath}:`, error.message);
  }
  
  const totalUsage = results.usage.imports + results.usage.jsxUsages;
  let status = '🔴 UNUSED';
  if (totalUsage > 0 || results.usage.bundleIncluded) {
    status = totalUsage < 3 ? '🟡 LOW USAGE' : '🟢 ACTIVE';
  }
  
  console.log(`  ${status} - ${totalUsage} refs (${results.usage.imports} imports, ${results.usage.jsxUsages} JSX)`);
  console.log(`  📦 Bundle: ${results.usage.bundleIncluded ? '✅ Included' : '❌ Not included'}`);
  
  if (results.foundIn.length > 0) {
    console.log(`  📁 Found in: ${results.foundIn.slice(0, 3).join(', ')}${results.foundIn.length > 3 ? '...' : ''}`);
  }
  
  return {
    file: componentPath,
    exports: exports,
    totalUsage: totalUsage,
    bundleIncluded: results.usage.bundleIncluded,
    status: totalUsage === 0 && !results.usage.bundleIncluded ? 'UNUSED' : 
            totalUsage < 3 ? 'LOW' : 'ACTIVE',
    foundIn: results.foundIn,
    usage: results.usage
  };
}

// Ana analiz
function main() {
  console.log('🔍 Components Usage Analysis');
  console.log('=============================\n');
  
  const componentFiles = getAllComponentFiles();
  const results = [];
  
  console.log(`Analyzing ${componentFiles.length} component files...\n`);
  
  for (const componentFile of componentFiles) {
    const analysis = checkComponentUsage(componentFile);
    results.push(analysis);
  }
  
  // Özet
  const unused = results.filter(r => r.status === 'UNUSED');
  const lowUsage = results.filter(r => r.status === 'LOW');
  const active = results.filter(r => r.status === 'ACTIVE');
  
  console.log('\n📊 COMPONENTS ANALYSIS SUMMARY');
  console.log('===============================');
  console.log(`Total components: ${results.length}`);
  console.log(`🔴 Unused: ${unused.length}`);
  console.log(`🟡 Low usage: ${lowUsage.length}`);
  console.log(`🟢 Active: ${active.length}`);
  
  if (unused.length > 0) {
    console.log('\n🔴 UNUSED COMPONENTS:');
    unused.forEach(u => {
      console.log(`  ❌ ${u.file} - SAFE TO REMOVE`);
    });
  }
  
  if (lowUsage.length > 0) {
    console.log('\n🟡 LOW USAGE COMPONENTS:');
    lowUsage.forEach(u => {
      console.log(`  ⚠️  ${u.file} (${u.totalUsage} refs) - Review needed`);
    });
  }
  
  // Sadece test/story'lerde kullanılanları bul
  const testOnlyComponents = results.filter(r => {
    return r.foundIn.length > 0 && r.foundIn.every(file => 
      file.includes('__tests__') || 
      file.includes('.test.') || 
      file.includes('.spec.') ||
      file.includes('.stories.') ||
      file.includes('storybook')
    );
  });
  
  if (testOnlyComponents.length > 0) {
    console.log('\n📚 TEST/STORY ONLY COMPONENTS:');
    testOnlyComponents.forEach(c => {
      console.log(`  📖 ${c.file} - Consider @designOnly tag`);
    });
  }
  
  // JSON rapor kaydet
  fs.writeFileSync('reports/components-usage-analysis.json', JSON.stringify(results, null, 2));
  
  // Aday listesi kaydet
  const candidates = unused.concat(lowUsage);
  fs.writeFileSync('reports/components-candidates.json', JSON.stringify(candidates, null, 2));
  
  console.log('\n📄 Reports saved:');
  console.log('  - reports/components-usage-analysis.json');
  console.log('  - reports/components-candidates.json');
}

main();
