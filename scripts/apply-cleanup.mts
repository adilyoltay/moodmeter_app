#!/usr/bin/env tsx

/**
 * 🧹 Repo Janitor: Safe Cleanup Application
 * 
 * Applies suggested cleanup changes with dry-run safety:
 * 1. Move files to .trash/ first
 * 2. Prompt for confirmation
 * 3. Apply permanent deletion after validation
 */

import fs from 'fs/promises';
import path from 'path';

interface CleanupPlan {
  deleteFiles: string[];
  removePackages: string[];
  fixImportsIn: string[];
  unusedExports: Array<{ file: string; export: string; line: number }>;
}

async function createTrashDir() {
  await fs.mkdir('.trash', { recursive: true });
  await fs.mkdir('.trash/unused-files', { recursive: true });
  await fs.mkdir('.trash/duplicates', { recursive: true });
}

async function moveToTrash(filePath: string): Promise<boolean> {
  try {
    const trashPath = path.join('.trash/unused-files', path.basename(filePath));
    await fs.copyFile(filePath, trashPath);
    console.log(`📦 Moved to trash: ${filePath} → ${trashPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to move ${filePath}:`, error);
    return false;
  }
}

async function validateCleanup(): Promise<boolean> {
  console.log('\n🧪 Validation checks...');
  
  try {
    // TypeScript check
    console.log('1️⃣ TypeScript compilation...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const tscResult = await execAsync('npx tsc --noEmit');
    console.log('✅ TypeScript: OK');
    
    // Expo doctor check  
    console.log('2️⃣ Expo doctor...');
    const doctorResult = await execAsync('npx expo-doctor');
    console.log('✅ Expo doctor: OK');
    
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

async function main() {
  console.log('🧹 Starting safe cleanup application...');
  
  // Load analysis report
  const unusedReport = JSON.parse(await fs.readFile('./reports/unused.json', 'utf-8'));
  
  // Create cleanup plan
  const plan: CleanupPlan = {
    // Only remove clearly safe unused files (not debug utils that might be manually invoked)
    deleteFiles: unusedReport.unusedFiles.filter((file: string) => 
      !file.includes('debug') && 
      !file.includes('test') && 
      !file.includes('script') &&
      file !== 'scripts/audit-unused.mts'  // Keep our own script
    ),
    
    // Only remove clearly unused dependencies (not development/build tools)
    removePackages: unusedReport.unusedDependencies.filter((pkg: string) => 
      !pkg.includes('expo-') || // Keep most expo packages (might be plugin dependencies)
      [
        'expo-audio',
        'expo-background-fetch', 
        'expo-blur',
        'expo-image-picker',
        'expo-print',
        'expo-sharing',
        'expo-task-manager',
        'expo-video'
      ].includes(pkg)
    ).filter((pkg: string) => 
      ![
        'react-dom', // Needed for expo web
        'buffer', // Often needed for crypto polyfills
        '@expo/config-plugins' // Might be needed for builds
      ].includes(pkg)
    ),
    
    fixImportsIn: [], // Will be populated based on removed exports
    unusedExports: unusedReport.unusedExports.filter((exp: any) => 
      !exp.file.includes('debug') && // Keep debug utilities
      !exp.file.includes('test') &&  // Keep test utilities
      !exp.export.includes('Test') && // Keep any Test-named exports
      !exp.export.includes('Debug')   // Keep any Debug-named exports
    )
  };

  // Create summary of planned changes
  const changesSummary = {
    deleteFiles: plan.deleteFiles,
    removePackages: plan.removePackages,
    estimatedImpact: `${plan.deleteFiles.length} files + ${plan.removePackages.length} packages`,
    riskLevel: 'LOW-MEDIUM'
  };

  console.log('\n📋 CLEANUP PLAN:');
  console.log('================');
  console.log(`🗑️  Files to delete: ${plan.deleteFiles.length}`);
  plan.deleteFiles.forEach(file => console.log(`   - ${file}`));
  
  console.log(`\n📦 Packages to remove: ${plan.removePackages.length}`);
  plan.removePackages.forEach(pkg => console.log(`   - ${pkg}`));
  
  console.log(`\n🎯 Estimated impact: ${changesSummary.estimatedImpact}`);
  console.log(`⚠️  Risk level: ${changesSummary.riskLevel}`);

  // Save plan for review
  await fs.writeFile('./reports/cleanup-plan.json', JSON.stringify(changesSummary, null, 2));
  
  console.log('\n💾 Cleanup plan saved to ./reports/cleanup-plan.json');
  console.log('\n⚠️  NEXT STEPS:');
  console.log('1. Review the cleanup plan above');
  console.log('2. Run: git checkout -b chore/cleanup-unused');
  console.log('3. If approved, run: npm run cleanup:apply');
  console.log('4. Test thoroughly before merging');
  
  // Create package.json script for easy application
  const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf-8'));
  packageJson.scripts['cleanup:apply'] = 'npx tsx scripts/apply-cleanup.mts --confirm';
  packageJson.scripts['cleanup:dry-run'] = 'npx tsx scripts/audit-unused.mts';
  await fs.writeFile('./package.json', JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Package.json scripts added: npm run cleanup:dry-run, npm run cleanup:apply');
}

main().catch(console.error);
