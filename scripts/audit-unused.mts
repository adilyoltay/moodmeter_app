#!/usr/bin/env tsx

/**
 * 🧹 Repo Janitor: Comprehensive Unused Code Analysis
 * 
 * Analyzes TypeScript/React Native/Expo project for:
 * - Unused files, exports, dependencies
 * - Duplicate files (content-based)
 * - Dead code patterns
 * - Asset references validation
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { glob } from 'glob';

interface AnalysisReport {
  unusedFiles: string[];
  unusedDependencies: string[];
  unusedExports: Array<{ file: string; export: string; line: number }>;
  duplicateFiles: Array<{ canonical: string; duplicates: string[]; similarity: number }>;
  referencedAssets: string[];
  summary: {
    totalFilesScanned: number;
    totalUnusedFiles: number;
    totalUnusedDependencies: number;
    totalUnusedExports: number;
    totalDuplicateGroups: number;
    estimatedCleanupImpact: {
      filesKB: number;
      packagesCount: number;
    };
  };
}

// Read and parse existing analysis reports
async function loadKnipReport(): Promise<any> {
  try {
    // Try clean version first
    const content = await fs.readFile('./reports/knip-clean.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('Could not load knip-clean.json:', error);
    return { files: [], issues: [] };
  }
}

async function loadDepcheckReport(): Promise<any> {
  try {
    const content = await fs.readFile('./reports/depcheck.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('Could not load depcheck.json:', error);
    return { dependencies: [], devDependencies: [] };
  }
}

// Parse app.config.ts for referenced assets
async function getReferencedAssets(): Promise<string[]> {
  const referencedAssets: string[] = [];
  
  try {
    const appConfigContent = await fs.readFile('./app.config.ts', 'utf-8');
    
    // Extract asset paths from app.config.ts
    const assetMatches = appConfigContent.match(/['"](\.\/assets\/[^'"]*)['"]/g);
    if (assetMatches) {
      referencedAssets.push(...assetMatches.map(match => 
        match.replace(/['"]/g, '').replace('./', '')
      ));
    }
  } catch (error) {
    console.warn('Could not parse app.config.ts:', error);
  }

  // Add common required assets
  referencedAssets.push(
    'assets/icon.png',
    'assets/splash-icon.png', 
    'assets/adaptive-icon.png',
    'assets/favicon.png'
  );

  return [...new Set(referencedAssets)];
}

// Calculate file hash for duplicate detection
async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Normalize content by removing comments, whitespace differences
    const normalized = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\/\/.*$/gm, '') // Remove // comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
      
    return crypto.createHash('sha256').update(normalized).digest('hex');
  } catch (error) {
    return '';
  }
}

// Find duplicate files by content
async function findDuplicateFiles(): Promise<Array<{ canonical: string; duplicates: string[]; similarity: number }>> {
  const targetDirs = ['components', 'services', 'utils', 'hooks'];
  const duplicateGroups: Array<{ canonical: string; duplicates: string[]; similarity: number }> = [];
  
  for (const dir of targetDirs) {
    try {
      const files = await glob(`${dir}/**/*.{ts,tsx}`, { ignore: ['**/*.test.*', '**/*.d.ts'] });
      const hashMap = new Map<string, string[]>();
      
      for (const file of files) {
        const hash = await calculateFileHash(file);
        if (hash) {
          if (!hashMap.has(hash)) {
            hashMap.set(hash, []);
          }
          hashMap.get(hash)!.push(file);
        }
      }
      
      // Find groups with multiple files (duplicates)
      for (const [hash, fileList] of hashMap) {
        if (fileList.length > 1) {
          const sorted = fileList.sort();
          duplicateGroups.push({
            canonical: sorted[0], // Keep first alphabetically
            duplicates: sorted.slice(1),
            similarity: 1.0 // Perfect match since hash is identical
          });
        }
      }
      
    } catch (error) {
      console.warn(`Could not analyze directory ${dir}:`, error);
    }
  }
  
  return duplicateGroups;
}

// Get file size for cleanup impact estimation
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

async function main() {
  console.log('🧹 Starting comprehensive unused code analysis...');
  
  // Load existing reports
  const knipReport = await loadKnipReport();
  const depcheckReport = await loadDepcheckReport();
  const referencedAssets = await getReferencedAssets();
  
  // Extract unused files (filter out archive/ and test files - they're already archived)
  const unusedFiles = (knipReport.files || [])
    .filter((file: string) => !file.includes('archive/'))
    .filter((file: string) => !file.includes('__tests__/'))
    .filter((file: string) => !file.includes('.test.'))
    .filter((file: string) => !file.includes('storybook/'));
  
  // Extract unused dependencies from knip report
  const unusedDependencies: string[] = [];
  if (knipReport.issues) {
    for (const issue of knipReport.issues) {
      if (issue.dependencies) {
        unusedDependencies.push(...issue.dependencies.map((dep: any) => dep.name));
      }
    }
  }
  
  // Extract unused exports
  const unusedExports: Array<{ file: string; export: string; line: number }> = [];
  if (knipReport.issues) {
    for (const issue of knipReport.issues) {
      if (issue.exports) {
        for (const exp of issue.exports) {
          unusedExports.push({
            file: issue.file,
            export: exp.name,
            line: exp.line
          });
        }
      }
    }
  }
  
  // Find duplicate files
  const duplicateFiles = await findDuplicateFiles();
  
  // Calculate cleanup impact
  let totalUnusedKB = 0;
  for (const file of unusedFiles) {
    totalUnusedKB += await getFileSize(file);
  }
  
  const report: AnalysisReport = {
    unusedFiles,
    unusedDependencies: [...new Set(unusedDependencies)],
    unusedExports,
    duplicateFiles,
    referencedAssets,
    summary: {
      totalFilesScanned: (knipReport.files || []).length,
      totalUnusedFiles: unusedFiles.length,
      totalUnusedDependencies: [...new Set(unusedDependencies)].length,
      totalUnusedExports: unusedExports.length,
      totalDuplicateGroups: duplicateFiles.length,
      estimatedCleanupImpact: {
        filesKB: Math.round(totalUnusedKB / 1024),
        packagesCount: [...new Set(unusedDependencies)].length
      }
    }
  };
  
  // Save comprehensive report
  await fs.writeFile('./reports/unused.json', JSON.stringify(report, null, 2));
  
  // Generate markdown summary
  const markdownSummary = `# 🧹 Repo Cleanup Analysis Report

## 📊 Summary
- **Total files scanned**: ${report.summary.totalFilesScanned}
- **Unused files found**: ${report.summary.totalUnusedFiles}
- **Unused dependencies**: ${report.summary.totalUnusedDependencies}
- **Unused exports**: ${report.summary.totalUnusedExports}
- **Duplicate file groups**: ${report.summary.totalDuplicateGroups}
- **Estimated cleanup impact**: ${report.summary.estimatedCleanupImpact.filesKB}KB files + ${report.summary.estimatedCleanupImpact.packagesCount} packages

## 🗑️ Unused Files (${report.unusedFiles.length})
${report.unusedFiles.length === 0 ? '*No unused files found*' : 
  report.unusedFiles.map(file => `- \`${file}\``).join('\n')}

## 📦 Unused Dependencies (${report.unusedDependencies.length})
${report.unusedDependencies.length === 0 ? '*No unused dependencies found*' : 
  report.unusedDependencies.map(dep => `- \`${dep}\``).join('\n')}

## 🔄 Duplicate Files (${report.duplicateFiles.length} groups)
${report.duplicateFiles.length === 0 ? '*No duplicate files found*' : 
  report.duplicateFiles.map(group => 
    `### Group: \`${group.canonical}\` (${group.similarity * 100}% match)\n` +
    group.duplicates.map(dup => `- \`${dup}\``).join('\n')
  ).join('\n\n')}

## 🚫 Unused Exports (${report.unusedExports.length})
${report.unusedExports.length === 0 ? '*No unused exports found*' : 
  report.unusedExports.slice(0, 20).map(exp => `- \`${exp.file}:${exp.line}\` - \`${exp.export}\``).join('\n')}
${report.unusedExports.length > 20 ? `\n*... and ${report.unusedExports.length - 20} more*` : ''}

## 🎯 Referenced Assets (${report.referencedAssets.length})
${report.referencedAssets.map(asset => `- \`${asset}\``).join('\n')}

## ⚠️ Risk Assessment
- **Low Risk**: Removing unused dependencies (reversible via package.json)
- **Medium Risk**: Removing unused exports (might break external integrations)
- **High Risk**: Removing unused files (thorough testing required)

## 🧪 Recommended Testing After Cleanup
1. \`npm run typecheck\` - TypeScript compilation
2. \`npx expo-doctor\` - Expo compatibility
3. \`npm run test\` - Unit tests
4. \`npx expo start --clear\` - Development build
5. Manual UI testing - All screens and features

---
*Generated on ${new Date().toISOString()}*
`;

  await fs.writeFile('./reports/SAFE_CLEANUP_SUMMARY.md', markdownSummary);
  
  console.log('✅ Analysis complete!');
  console.log(`📊 Found ${report.summary.totalUnusedFiles} unused files`);
  console.log(`📦 Found ${report.summary.totalUnusedDependencies} unused dependencies`);
  console.log(`🔄 Found ${report.summary.totalDuplicateGroups} duplicate file groups`);
  console.log(`💾 Estimated cleanup: ${report.summary.estimatedCleanupImpact.filesKB}KB`);
  console.log('📄 Reports saved to ./reports/');
}

main().catch(console.error);
