#!/usr/bin/env node

/**
 * 🧪 Feature Flags Test Script
 * FAZ 0: Güvenlik ve Stabilite Hazırlığı - Test Suite
 * 
 * Bu script, feature flag sisteminin doğru çalıştığını test eder
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Feature Flags Test Suite - FAZ 0');
console.log('=====================================\n');

// Test sonuçları
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🔍 Running: ${testName}`);
  
  try {
    testFunction();
    console.log(`✅ PASSED: ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    testResults.failed++;
  }
}

// Test 1: Environment Variables Kontrolü
runTest('Environment Variables Default Values', () => {
  // Production'da AI özelliklerinin kapalı olduğunu test et
  const env = process.env;
  
  // Development flag'leri test et
  const devFlags = [
    'EXPO_PUBLIC_ENABLE_AI_CHAT',
    'EXPO_PUBLIC_ENABLE_AI_ONBOARDING', 
    'EXPO_PUBLIC_ENABLE_AI_INSIGHTS',
    'EXPO_PUBLIC_ENABLE_AI_VOICE'
  ];
  
  devFlags.forEach(flag => {
    if (env[flag] === 'true' && process.env.NODE_ENV === 'production') {
      throw new Error(`${flag} should not be 'true' in production by default`);
    }
  });
  
  console.log('   ✓ All AI flags properly defaulted');
});

// Test 2: TypeScript Compilation
runTest('TypeScript Compilation', () => {
  try {
    execSync('npx tsc --noEmit --project ./', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✓ TypeScript compilation successful');
  } catch (error) {
    throw new Error('TypeScript compilation failed');
  }
});

// Test 3: Import Pattern Detection
runTest('Import Guard Pattern Detection', () => {
  const importGuardPath = path.join(__dirname, 'import-guard.js');
  
  try {
    // Test dosyası oluştur
    const testFile = path.join(__dirname, 'temp-test-file.ts');
    require('fs').writeFileSync(testFile, `
      // Bu import'lar yasak olmalı
      import { something } from '../../src/ai/types';
      import other from 'src/components/Test';
    `);
    
    // Import guard'ı çalıştır
    execSync(`node ${importGuardPath} ${testFile}`, { 
      stdio: 'pipe',
      timeout: 5000
    });
    
    // Eğer buraya geldiysek, import guard çalışmadı
    throw new Error('Import guard should have detected forbidden patterns');
  } catch (error) {
    if (error.status === 1) {
      // Exit code 1 beklenen sonuç (yasak pattern bulundu)
      console.log('   ✓ Import guard correctly detected forbidden patterns');
    } else {
      throw error;
    }
  } finally {
    // Test dosyasını temizle
    const testFile = path.join(__dirname, 'temp-test-file.ts');
    try {
      require('fs').unlinkSync(testFile);
    } catch (e) {
      // Dosya zaten silinmiş olabilir
    }
  }
});

// Test 4: Feature Flag Function Signatures
runTest('Feature Flag Function Signatures', () => {
  // Mock import için geçici dosya
  const testCode = `
    const { FEATURE_FLAGS } = require('../constants/featureFlags');
    
    // Test function signatures
    if (typeof FEATURE_FLAGS.isEnabled !== 'function') {
      throw new Error('isEnabled function missing');
    }
    
    if (typeof FEATURE_FLAGS.disableAll !== 'function') {
      throw new Error('disableAll function missing');
    }
    
    if (typeof FEATURE_FLAGS.setFlag !== 'function') {
      throw new Error('setFlag function missing');
    }
    
    if (typeof FEATURE_FLAGS.getUsageStats !== 'function') {
      throw new Error('getUsageStats function missing');
    }
    
    if (typeof FEATURE_FLAGS.reactivateAll !== 'function') {
      throw new Error('reactivateAll function missing');
    }
    
    console.log('All function signatures present');
  `;
  
  const testFile = path.join(__dirname, 'temp-feature-test.js');
  require('fs').writeFileSync(testFile, testCode);
  
  try {
    execSync(`node ${testFile}`, { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✓ All required functions present');
  } finally {
    require('fs').unlinkSync(testFile);
  }
});

// Test 5: Safe Point Script
runTest('Safe Point Script Exists', () => {
  const safePointPath = path.join(__dirname, 'create-safe-point.sh');
  const fs = require('fs');
  
  if (!fs.existsSync(safePointPath)) {
    throw new Error('create-safe-point.sh script missing');
  }
  
  const content = fs.readFileSync(safePointPath, 'utf8');
  
  // Kritik fonksiyonların varlığını kontrol et
  const requiredPatterns = [
    'git tag',
    'git stash',
    'npm install',
    'watchman'
  ];
  
  requiredPatterns.forEach(pattern => {
    if (!content.includes(pattern)) {
      throw new Error(`Safe point script missing: ${pattern}`);
    }
  });
  
  console.log('   ✓ Safe point script properly configured');
});

// Test 6: AI Manager Integration
runTest('AI Manager Feature Flag Integration', () => {
  const aiManagerPath = path.join(__dirname, '..', 'features', 'ai', 'config', 'aiManager.ts');
  const fs = require('fs');
  
  if (!fs.existsSync(aiManagerPath)) {
    throw new Error('AI Manager file missing');
  }
  
  const content = fs.readFileSync(aiManagerPath, 'utf8');
  
  // Feature flag kullanımını kontrol et
  if (!content.includes('FEATURE_FLAGS.isEnabled')) {
    throw new Error('AI Manager not using new feature flag system');
  }
  
  if (!content.includes('disableAll')) {
    throw new Error('AI Manager missing emergency shutdown');
  }
  
  console.log('   ✓ AI Manager properly integrated with feature flags');
});

// Test sonuçlarını göster
console.log('\n🏁 Test Results');
console.log('================');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📊 Total: ${testResults.total}`);

const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
console.log(`📈 Success Rate: ${successRate}%`);

if (testResults.failed > 0) {
  console.log('\n🚨 CRITICAL: Some tests failed!');
  console.log('FAZ 0 requirements not fully met.');
  console.log('Please fix issues before proceeding to FAZ 1.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  console.log('✅ FAZ 0: Güvenlik ve Stabilite Hazırlığı COMPLETED');
  console.log('🚀 Ready to proceed to FAZ 1: AI Infrastructure');
}