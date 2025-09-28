#!/usr/bin/env node

/**
 * 📊 Usage Audit Report Generator
 * 
 * Analyzes usage data collected during audit sessions
 * and generates cleanup recommendations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read usage data from AsyncStorage export
async function readUsageData() {
  // This would typically read from AsyncStorage export
  // For now, we'll simulate with a file-based approach
  
  const usageFiles = [];
  try {
    const reportDir = 'reports';
    if (fs.existsSync(reportDir)) {
      const files = fs.readdirSync(reportDir);
      files.forEach(file => {
        if (file.startsWith('usage_audit_') && file.endsWith('.json')) {
          const data = JSON.parse(fs.readFileSync(path.join(reportDir, file), 'utf8'));
          usageFiles.push(...data);
        }
      });
    }
  } catch (error) {
    console.warn('Error reading usage files:', error);
  }
  
  return usageFiles;
}

// Scan repository for all files
function scanRepository() {
  const services = execSync('find services -name "*.ts" -type f', { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  
  const components = execSync('find components -name "*.tsx" -type f', { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  
  const screens = execSync('find app -name "*.tsx" -type f', { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  
  return { services, components, screens };
}

// Analyze usage patterns
function analyzeUsage(events, repository) {
  const usedServices = new Set();
  const usedComponents = new Set();
  const usedScreens = new Set();
  const networkEndpoints = new Set();
  
  events.forEach(event => {
    switch (event.t) {
      case 'svc_call':
        // Extract service file from ID (svc:/path/to/service#function)
        const servicePath = event.id.replace('svc:', '').split('#')[0];
        usedServices.add(servicePath);
        break;
        
      case 'component_mount':
        if (event.file) {
          // Normalize file path
          const normalizedPath = event.file.replace(process.cwd(), '').replace(/^\//, '');
          if (normalizedPath.startsWith('components/')) {
            usedComponents.add(normalizedPath);
          }
        }
        break;
        
      case 'screen_view':
        usedScreens.add(event.screen);
        break;
        
      case 'network':
        const endpoint = `${event.method} ${event.url}`;
        networkEndpoints.add(endpoint);
        break;
    }
  });
  
  // Find unused files
  const unusedServices = repository.services.filter(service => 
    !usedServices.has(service) && !usedServices.has(`/${service}`)
  );
  
  const unusedComponents = repository.components.filter(component => 
    !usedComponents.has(component) && !usedComponents.has(`/${component}`)
  );
  
  return {
    used: {
      services: Array.from(usedServices),
      components: Array.from(usedComponents),
      screens: Array.from(usedScreens),
      endpoints: Array.from(networkEndpoints)
    },
    unused: {
      services: unusedServices,
      components: unusedComponents
    },
    stats: {
      totalEvents: events.length,
      serviceCallCount: events.filter(e => e.t === 'svc_call').length,
      componentMountCount: events.filter(e => e.t === 'component_mount').length,
      screenViewCount: events.filter(e => e.t === 'screen_view').length,
      networkCallCount: events.filter(e => e.t === 'network').length
    }
  };
}

// Generate report
async function generateReport() {
  console.log('📊 Usage Audit Report Generator');
  console.log('================================\n');
  
  console.log('🔍 Reading usage data...');
  const events = await readUsageData();
  
  if (events.length === 0) {
    console.log('❌ No usage data found!');
    console.log('💡 Make sure to run the app with EXPO_PUBLIC_USAGE_AUDIT=true');
    console.log('💡 And perform real user interactions to collect data');
    return;
  }
  
  console.log(`📈 Found ${events.length} usage events`);
  
  console.log('🔍 Scanning repository...');
  const repository = scanRepository();
  
  console.log('🔍 Analyzing usage patterns...');
  const analysis = analyzeUsage(events, repository);
  
  // Display results
  console.log('\n📊 USAGE AUDIT RESULTS');
  console.log('=======================');
  console.log(`📈 Total Events: ${analysis.stats.totalEvents}`);
  console.log(`🔧 Service Calls: ${analysis.stats.serviceCallCount}`);
  console.log(`⚛️  Component Mounts: ${analysis.stats.componentMountCount}`);
  console.log(`📱 Screen Views: ${analysis.stats.screenViewCount}`);
  console.log(`🌐 Network Calls: ${analysis.stats.networkCallCount}`);
  
  console.log('\n🟢 USED IN REAL SCENARIOS:');
  console.log(`📁 Services: ${analysis.used.services.length}/${repository.services.length}`);
  console.log(`🧩 Components: ${analysis.used.components.length}/${repository.components.length}`);
  console.log(`📱 Screens: ${analysis.used.screens.length}`);
  
  if (analysis.unused.services.length > 0) {
    console.log('\n🔴 UNUSED SERVICES (Real Usage):');
    analysis.unused.services.forEach(service => {
      console.log(`  ❌ ${service} - NOT CALLED in audit session`);
    });
  } else {
    console.log('\n✅ ALL SERVICES USED during audit session');
  }
  
  if (analysis.unused.components.length > 0) {
    console.log('\n🔴 UNUSED COMPONENTS (Real Usage):');
    analysis.unused.components.forEach(component => {
      console.log(`  ❌ ${component} - NOT RENDERED in audit session`);
    });
  } else {
    console.log('\n✅ ALL COMPONENTS RENDERED during audit session');
  }
  
  console.log('\n📱 SCREENS VISITED:');
  analysis.used.screens.forEach(screen => {
    console.log(`  📱 ${screen}`);
  });
  
  console.log('\n🌐 NETWORK ENDPOINTS CALLED:');
  analysis.used.endpoints.slice(0, 10).forEach(endpoint => {
    console.log(`  🌐 ${endpoint}`);
  });
  if (analysis.used.endpoints.length > 10) {
    console.log(`  ... and ${analysis.used.endpoints.length - 10} more`);
  }
  
  // Save detailed report
  const report = {
    sessionInfo: {
      timestamp: new Date().toISOString(),
      totalEvents: analysis.stats.totalEvents,
      duration: 'unknown' // Would calculate from first/last event
    },
    repository: {
      totalServices: repository.services.length,
      totalComponents: repository.components.length
    },
    usage: analysis.used,
    unused: analysis.unused,
    stats: analysis.stats
  };
  
  fs.writeFileSync('reports/usage-audit-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n📄 Detailed report saved to: reports/usage-audit-report.json');
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Review unused services/components listed above');
  console.log('2. Perform more comprehensive user flows');
  console.log('3. Run multiple audit sessions to get complete coverage');
  console.log('4. Create cleanup PR for confirmed unused items');
}

// Helper to export AsyncStorage data (for React Native)
function generateExportScript() {
  const exportScript = `
// Add this to a debug screen or console in your React Native app:
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionInfo, exportUsageData } from '@/src/infra/usage';

const exportUsageAudit = async () => {
  try {
    const data = await exportUsageData();
    const sessionInfo = getSessionInfo();
    
    console.log('📊 Usage Audit Export:');
    console.log('Session:', sessionInfo.sessionId);
    console.log('Events:', data.length);
    
    // Save to reports directory (you'll need react-native-fs for this)
    // Or copy-paste the JSON from console
    console.log('📄 Usage Data (copy this JSON):');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Export failed:', error);
  }
};

// Call this function from your debug screen
exportUsageAudit();
`;
  
  fs.writeFileSync('scripts/export-usage-data.js', exportScript);
  console.log('📄 Export script saved to: scripts/export-usage-data.js');
}

if (require.main === module) {
  generateReport().catch(console.error);
  generateExportScript();
}
