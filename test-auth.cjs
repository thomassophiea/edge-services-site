// Test authentication with Campus Controller
const https = require('https');

const controller = 'tsophiea.ddns.net';
const username = 'admin';
const password = 'AHah1232!!*7';

console.log('Testing Campus Controller Authentication...\n');

// Step 1: Login to get Bearer token
const loginData = JSON.stringify({
  grantType: 'password',
  userId: username,
  password: password
});

const loginOptions = {
  hostname: controller,
  port: 443,
  path: '/management/v1/oauth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  },
  rejectUnauthorized: false
};

console.log('1. Attempting login...');
const loginReq = https.request(loginOptions, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`   Status: ${res.statusCode}`);

    if (res.statusCode === 200) {
      const authResponse = JSON.parse(data);
      const token = authResponse.access_token;
      console.log('   ✅ Login successful!');
      console.log(`   Token: ${token.substring(0, 20)}...`);

      // Step 2: Test RF Quality endpoint
      testRFQuality(token);

      // Step 3: Test Application Analytics
      setTimeout(() => testAppAnalytics(token), 2000);

      // Step 4: Test Venue Stats
      setTimeout(() => testVenueStats(token), 4000);
    } else {
      console.log('   ❌ Login failed');
      console.log('   Response:', data);
    }
  });
});

loginReq.on('error', (err) => {
  console.error('   ❌ Login error:', err.message);
});

loginReq.write(loginData);
loginReq.end();

function testRFQuality(token) {
  const siteId = 'c7395471-aa5c-46dc-9211-3ed24c5789bd';
  const endpoint = `/management/v1/report/sites/${encodeURIComponent(siteId)}?duration=24H&resolution=15&widgetList=rfQuality|all`;

  console.log('\n2. Testing RF Quality endpoint...');
  console.log(`   Endpoint: ${endpoint}`);

  const options = {
    hostname: controller,
    port: 443,
    path: endpoint,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    rejectUnauthorized: false
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);

      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log('   ✅ RF Quality data retrieved!');
          console.log('   Response keys:', Object.keys(json));
          if (json.rfQuality) {
            console.log('   Has rfQuality data:', Object.keys(json.rfQuality).length, 'fields');
          } else {
            console.log('   ⚠️  No rfQuality field in response');
          }
        } catch (e) {
          console.log('   Parse error:', e.message);
          console.log('   Raw response:', data.substring(0, 300));
        }
      } else {
        console.log('   ❌ Failed to get RF Quality data');
        console.log('   Response:', data);
      }
    });
  }).on('error', (err) => {
    console.error('   ❌ Request error:', err.message);
  });
}

function testAppAnalytics(token) {
  const siteId = 'c7395471-aa5c-46dc-9211-3ed24c5789bd';
  const widgetList = 'topAppGroupsByThroughputReport|all,topAppGroupsByClientCountReport|all,topAppGroupsByUsage|all';
  const endpoint = `/management/v1/report/sites/${encodeURIComponent(siteId)}?duration=24H&resolution=15&widgetList=${encodeURIComponent(widgetList)}`;

  console.log('\n3. Testing Application Analytics endpoint...');

  const options = {
    hostname: controller,
    port: 443,
    path: endpoint,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    rejectUnauthorized: false
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);

      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log('   ✅ Application Analytics data retrieved!');
          console.log('   Response keys:', Object.keys(json));
        } catch (e) {
          console.log('   Parse error:', e.message);
        }
      } else {
        console.log('   ❌ Failed');
        console.log('   Response:', data.substring(0, 200));
      }
    });
  }).on('error', (err) => {
    console.error('   ❌ Request error:', err.message);
  });
}

function testVenueStats(token) {
  const siteId = 'c7395471-aa5c-46dc-9211-3ed24c5789bd';
  const widgetList = 'ulDlUsageTimeseries,ulDlThroughputTimeseries,uniqueClientsTotalScorecard,uniqueClientsPeakScorecard';
  const endpoint = `/management/v3/sites/${encodeURIComponent(siteId)}/report/venue?duration=24H&resolution=15&statType=sites&widgetList=${encodeURIComponent(widgetList)}`;

  console.log('\n4. Testing Venue Stats endpoint...');

  const options = {
    hostname: controller,
    port: 443,
    path: endpoint,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    rejectUnauthorized: false
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);

      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log('   ✅ Venue Stats data retrieved!');
          console.log('   Response keys:', Object.keys(json));
        } catch (e) {
          console.log('   Parse error:', e.message);
        }
      } else {
        console.log('   ❌ Failed');
        console.log('   Response:', data.substring(0, 200));
      }
    });
  }).on('error', (err) => {
    console.error('   ❌ Request error:', err.message);
  });
}
