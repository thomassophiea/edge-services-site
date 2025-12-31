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

const makePostRequest = (path, body) => new Promise((resolve, reject) => {
  const postData = JSON.stringify(body);

  const options = {
    hostname: 'tsophiea.ddns.net',
    port: 443,
    path: '/management' + path,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
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
  req.write(postData);
  req.end();
});

const PROD_SITE_ID = 'c7395471-aa5c-46dc-9211-3ed24c5789bd';

(async () => {
  console.log('=== Fetching Widget Data via POST ===\n');

  await login();
  console.log('✓ Logged in\n');

  // Try different POST endpoints and payloads
  const tests = [
    {
      endpoint: '/v1/reports/widgets',
      payload: {
        siteId: PROD_SITE_ID,
        widgetIds: ['rfQuality', 'topAppGroupsByThroughputReport']
      }
    },
    {
      endpoint: '/v1/sites/' + PROD_SITE_ID + '/report/widgets',
      payload: {
        widgetIds: ['rfQuality', 'topAppGroupsByThroughputReport']
      }
    },
    {
      endpoint: '/v1/reports/data',
      payload: {
        siteId: PROD_SITE_ID,
        widgets: [
          { id: 'rfQuality' },
          { id: 'topAppGroupsByThroughputReport' }
        ]
      }
    },
    {
      endpoint: '/v1/widgets/data',
      payload: {
        siteId: PROD_SITE_ID,
        duration: 'last24Hours',
        widgets: ['rfQuality', 'topAppGroupsByThroughputReport']
      }
    }
  ];

  for (const test of tests) {
    console.log(`Testing: POST ${test.endpoint}`);
    console.log(`Payload:`, JSON.stringify(test.payload));

    const result = await makePostRequest(test.endpoint, test.payload);
    console.log(`Status: ${result.status}`);

    if (result.status === 200 && result.data) {
      console.log('✓ SUCCESS!');
      if (typeof result.data === 'object') {
        console.log('Keys:', Object.keys(result.data).slice(0, 10).join(', '));
      }
      fs.writeFileSync('campus-widgets-post-data.json', JSON.stringify(result.data, null, 2));
      console.log('✓ Saved to campus-widgets-post-data.json');
      break;
    } else if (typeof result.data === 'object' && result.data.error) {
      console.log('Error:', result.data.error || result.data.errorMessage);
    } else {
      console.log('Response:', String(result.data).slice(0, 200));
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 200));
  }

})().catch(console.error);
