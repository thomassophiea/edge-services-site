const https = require('https');

let accessToken = null;

const login = () => new Promise((resolve, reject) => {
  const postData = JSON.stringify({
    userId: 'admin',
    password: 'AHah1232!!*7',
    grantType: 'password'
  });

  const options = {
    hostname: 'tsophiea.ddns.net',
    port: 443,
    path: '/management/v1/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    },
    rejectUnauthorized: false
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.access_token) {
          accessToken = parsed.access_token;
          console.log('✓ Login successful, got access token');
          resolve(parsed);
        } else {
          reject(new Error('No access token in response: ' + data));
        }
      } catch (e) {
        reject(new Error('Login failed: ' + data));
      }
    });
  });

  req.on('error', reject);
  req.write(postData);
  req.end();
});

const makeRequest = (path) => new Promise((resolve, reject) => {
  const options = {
    hostname: 'tsophiea.ddns.net',
    port: 443,
    path: '/management' + path,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    rejectUnauthorized: false
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      } catch (e) {
        resolve({ status: res.statusCode, data: data });
      }
    });
  }).on('error', reject);
});

(async () => {
  console.log('Testing Campus Controller Endpoints...\n');

  // Step 0: Login
  console.log('0. Logging in...');
  try {
    await login();
  } catch (e) {
    console.error('Login failed:', e.message);
    return;
  }
  console.log();

  // Test 1: Get sites list
  console.log('1. Testing /v3/sites...');
  const sites = await makeRequest('/v3/sites');
  console.log('Status:', sites.status);
  if (sites.data && Array.isArray(sites.data)) {
    console.log('Found', sites.data.length, 'sites');
    sites.data.forEach(s => console.log('  -', s.name || s.siteName, '(ID:', s.id, ')'));
  } else if (sites.data && sites.data.error) {
    console.log('Error:', sites.data.error);
  } else {
    console.log('Response:', JSON.stringify(sites.data).slice(0, 300));
  }
  console.log();

  // Test 2: Get Production Site ID
  const prodSite = sites.data && Array.isArray(sites.data) ?
    sites.data.find(s => (s.name || s.siteName || '').includes('Production')) : null;

  if (prodSite) {
    console.log('2. Found Production Site - ID:', prodSite.id);
    console.log();

    // Test 3: Get site report endpoints
    const endpoints = [
      `/v1/sites/${prodSite.id}/report`,
      `/v3/sites/${prodSite.id}/report`,
      `/v1/sites/report/widgets`,
      `/v3/sites/report/widgets`,
      `/v1/reports/widgets`,
      `/v1/applications`,
      `/v1/analytics/applications`,
      `/v1/sites/${prodSite.id}/applications`,
      `/v3/sites/${prodSite.id}/analytics`
    ];

    for (const endpoint of endpoints) {
      console.log(`Testing ${endpoint}...`);
      const result = await makeRequest(endpoint);
      console.log('  Status:', result.status);
      if (result.status === 200) {
        if (typeof result.data === 'object' && result.data !== null) {
          if (Array.isArray(result.data)) {
            console.log('  ✓ Array with', result.data.length, 'items');
            if (result.data.length > 0) {
              console.log('  Sample:', JSON.stringify(result.data[0]).slice(0, 150));
            }
          } else {
            console.log('  ✓ Object with keys:', Object.keys(result.data).slice(0, 10).join(', '));
          }
        } else {
          console.log('  Data:', String(result.data).slice(0, 150));
        }
      } else if (result.data && result.data.error) {
        console.log('  ✗ Error:', result.data.error || result.data.errorMessage);
      }
      console.log();

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } else {
    console.log('2. Production Site not found. Available sites:');
    if (sites.data && Array.isArray(sites.data)) {
      sites.data.forEach(s => console.log('  -', s.name || s.siteName || s.id));
    }
  }
})().catch(console.error);
