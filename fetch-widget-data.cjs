const https = require('https');
const fs = require('fs');

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
          resolve(parsed);
        } else {
          reject(new Error('No access token'));
        }
      } catch (e) {
        reject(new Error('Login failed'));
      }
    });
  });

  req.on('error', reject);
  req.write(postData);
  req.end();
});

const makeRequest = (path, method = 'GET', body = null) => new Promise((resolve, reject) => {
  const options = {
    hostname: 'tsophiea.ddns.net',
    port: 443,
    path: '/management' + path,
    method: method,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    rejectUnauthorized: false
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      } catch (e) {
        resolve({ status: res.statusCode, data: data });
      }
    });
  });

  req.on('error', reject);
  if (body) {
    req.write(JSON.stringify(body));
  }
  req.end();
});

const PROD_SITE_ID = 'c7395471-aa5c-46dc-9211-3ed24c5789bd';

(async () => {
  console.log('=== Fetching Widget Data from Campus Controller ===\n');

  await login();
  console.log('✓ Logged in\n');

  // Widgets to fetch
  const widgets = [
    'rfQuality',
    'topAppGroupsByThroughputReport',
    'topAppGroupsByClientCountReport',
    'topAppGroupsByUsage',
    'topAccessPointsByThroughput',
    'throughputReport',
    'byteUtilization'
  ];

  // Test different endpoint patterns
  const endpointPatterns = [
    (w) => `/v1/sites/${PROD_SITE_ID}/report/${w}`,
    (w) => `/v1/report/sites/${PROD_SITE_ID}/${w}`,
    (w) => `/v1/sites/report/${w}?siteId=${PROD_SITE_ID}`,
    (w) => `/v1/widgets/${w}?siteId=${PROD_SITE_ID}`
  ];

  for (const widget of widgets) {
    console.log(`Testing widget: ${widget}`);
    let found = false;

    for (let i = 0; i < endpointPatterns.length; i++) {
      const endpoint = endpointPatterns[i](widget);
      const result = await makeRequest(endpoint);

      if (result.status === 200 && result.data) {
        console.log(`  ✓ Pattern ${i + 1} works: ${endpoint}`);
        console.log(`    Status: ${result.status}`);

        if (typeof result.data === 'object') {
          const keys = Object.keys(result.data);
          console.log(`    Keys: ${keys.join(', ')}`);

          if (keys.length > 0) {
            // Show sample data structure
            const firstKey = keys[0];
            if (Array.isArray(result.data[firstKey])) {
              console.log(`    ${firstKey} is array with ${result.data[firstKey].length} items`);
              if (result.data[firstKey].length > 0) {
                console.log(`    Sample item keys: ${Object.keys(result.data[firstKey][0]).join(', ')}`);
              }
            } else if (typeof result.data[firstKey] === 'object') {
              console.log(`    ${firstKey} is object with keys: ${Object.keys(result.data[firstKey]).join(', ')}`);
            } else {
              console.log(`    ${firstKey} value: ${result.data[firstKey]}`);
            }
          }

          fs.writeFileSync(`campus-${widget}.json`, JSON.stringify(result.data, null, 2));
          console.log(`    ✓ Saved to campus-${widget}.json`);
        }

        found = true;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!found) {
      console.log(`  ✗ Widget not found with any pattern`);
    }

    console.log();
  }

})().catch(console.error);
