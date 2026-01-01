#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Get git commit count (acts as version number)
  const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();

  // Get short commit hash
  const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

  // Get current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

  // Get commit date
  const commitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf-8' }).trim();

  // Format version string
  const version = `v${commitCount}.${commitHash}`;

  // Create env content
  const envContent = `# Auto-generated version info - DO NOT EDIT MANUALLY
# Generated at build time from git repository
VITE_APP_VERSION=${version}
VITE_APP_COMMIT_HASH=${commitHash}
VITE_APP_COMMIT_COUNT=${commitCount}
VITE_APP_BRANCH=${branch}
VITE_APP_BUILD_DATE=${new Date().toISOString()}
VITE_APP_COMMIT_DATE=${commitDate}
`;

  // Write to .env.production (for builds)
  const rootDir = join(__dirname, '..');
  writeFileSync(join(rootDir, '.env.production'), envContent);

  // Also write version.json for deployment verification
  const versionJson = {
    version: version,
    commit: commitHash,
    commitFull: execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(),
    commitCount: commitCount,
    branch: branch,
    buildDate: new Date().toISOString(),
    commitDate: commitDate,
    message: 'Campus Controller Integration: RFQI & Application Analytics',
    features: [
      'Data Normalization Layer (P0-002)',
      'Universal FilterBar Component (P0-003)',
      'Operational Health Summary Widget (P1-001)',
      'Column Customization Hook (P1-002)',
      'Tab Visibility Polling Hook (P1-003)',
      'Aggressive Caching (P1-004)',
      'Anomaly Detector Widget (P1-005)',
      'RF Quality Index (RFQI) Widget',
      'Application Analytics Widget',
      'Campus Controller Widget API Integration'
    ]
  };

  writeFileSync(
    join(rootDir, 'public', 'version.json'),
    JSON.stringify(versionJson, null, 2)
  );

  // Also write to build directory if it exists (for postbuild)
  const buildDir = join(rootDir, 'build');
  if (existsSync(buildDir)) {
    writeFileSync(
      join(buildDir, 'version.json'),
      JSON.stringify(versionJson, null, 2)
    );
    console.log('   version.json also written to build/');
  }

  console.log('✅ Version generated:', version);
  console.log('   Commit:', commitHash);
  console.log('   Count:', commitCount);
  console.log('   Branch:', branch);
  console.log('   version.json created in public/');

} catch (error) {
  console.error('❌ Failed to generate version:', error.message);

  // Fallback for non-git environments (Railway, etc.)
  const buildDate = new Date().toISOString();

  // Use environment variables from Railway if available
  const railwayCommit = process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown';
  const railwayBranch = process.env.RAILWAY_GIT_BRANCH || 'unknown';
  const commitShort = railwayCommit !== 'unknown' ? railwayCommit.substring(0, 7) : 'unknown';

  const fallbackContent = `VITE_APP_VERSION=v0.${commitShort}
VITE_APP_COMMIT_HASH=${commitShort}
VITE_APP_COMMIT_COUNT=0
VITE_APP_BRANCH=${railwayBranch}
VITE_APP_BUILD_DATE=${buildDate}
VITE_APP_COMMIT_DATE=unknown
`;

  const rootDir = join(__dirname, '..');
  writeFileSync(join(rootDir, '.env.production'), fallbackContent);

  // Also create fallback version.json
  const fallbackVersionJson = {
    version: `v0.${commitShort}`,
    commit: commitShort,
    commitFull: railwayCommit,
    commitCount: '0',
    branch: railwayBranch,
    buildDate: buildDate,
    commitDate: 'unknown',
    message: 'Site Selector Fix & Campus Controller Integration',
    features: [
      'Fixed site selector to display names instead of IDs',
      'Data Normalization Layer (P0-002)',
      'Universal FilterBar Component (P0-003)',
      'Operational Health Summary Widget (P1-001)',
      'Column Customization Hook (P1-002)',
      'Tab Visibility Polling Hook (P1-003)',
      'Aggressive Caching (P1-004)',
      'Anomaly Detector Widget (P1-005)',
      'RF Quality Index (RFQI) Widget',
      'Application Analytics Widget',
      'Campus Controller Widget API Integration'
    ]
  };

  writeFileSync(
    join(rootDir, 'public', 'version.json'),
    JSON.stringify(fallbackVersionJson, null, 2)
  );

  const buildDir = join(rootDir, 'build');
  if (existsSync(buildDir)) {
    writeFileSync(
      join(buildDir, 'version.json'),
      JSON.stringify(fallbackVersionJson, null, 2)
    );
  }

  console.log('⚠️  Using fallback version (not a git repository)');
  console.log('   Version:', `v0.${commitShort}`);
  console.log('   Railway Commit:', railwayCommit);
  console.log('   Railway Branch:', railwayBranch);
  console.log('   version.json created in public/');
}
