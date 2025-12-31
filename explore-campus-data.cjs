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
          console.log('✓ Logged in');
          resolve(parsed);
        } else {
          reject(new Error('No access token'));
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

const PROD_SITE_ID = 'c7395471-aa5c-46dc-9211-3ed24c5789bd';

(async () => {
  console.log('=== Exploring Campus Controller Data for Production Site ===\n');

  await login();

  // 1. Get site report
  console.log('1. Fetching site report...');
  const report = await makeRequest(`/v1/sites/${PROD_SITE_ID}/report`);
  console.log('  Status:', report.status);
  if (report.status === 200 && report.data) {
    console.log('  Keys:', Object.keys(report.data));
    fs.writeFileSync('campus-site-report.json', JSON.stringify(report.data, null, 2));
    console.log('  ✓ Saved to campus-site-report.json');
  }
  console.log();

  // 2. Get widgets list
  console.log('2. Fetching widgets list...');
  const widgets = await makeRequest('/v1/sites/report/widgets');
  console.log('  Status:', widgets.status);
  if (widgets.status === 200 && Array.isArray(widgets.data)) {
    console.log('  Total widgets:', widgets.data.length);

    // Find RFQI and application related widgets
    const rfqiWidgets = widgets.data.filter(w =>
      (w.id || '').toLowerCase().includes('rfqi') ||
      (w.id || '').toLowerCase().includes('quality')
    );
    const appWidgets = widgets.data.filter(w =>
      (w.id || '').toLowerCase().includes('app') ||
      (w.id || '').toLowerCase().includes('application')
    );

    console.log('  RFQI/Quality widgets:', rfqiWidgets.length);
    if (rfqiWidgets.length > 0) {
      rfqiWidgets.forEach(w => console.log('    -', w.id));
    }

    console.log('  Application widgets:', appWidgets.length);
    if (appWidgets.length > 0) {
      appWidgets.forEach(w => console.log('    -', w.id));
    }

    // Show all widget IDs
    console.log('\n  All widget IDs:');
    widgets.data.forEach(w => console.log('    -', w.id));

    fs.writeFileSync('campus-widgets.json', JSON.stringify(widgets.data, null, 2));
    console.log('\n  ✓ Saved to campus-widgets.json');
  }
  console.log();

  // 3. Try to fetch specific interesting widgets
  console.log('3. Testing specific widget data...');

  const testWidgets = [
    'topApplicationsBySiteWidget',
    'topApplicationsWidget',
    'applicationsWidget',
    'rfqiWidget',
    'siteHealthWidget',
    'sitePerformanceWidget'
  ];

  for (const widgetId of testWidgets) {
    const result = await makeRequest(`/v1/sites/${PROD_SITE_ID}/report/${widgetId}`);
    if (result.status === 200) {
      console.log('  ✓', widgetId, '- Found!');
      console.log('    Keys:', Object.keys(result.data || {}));
      fs.writeFileSync(`campus-widget-${widgetId}.json`, JSON.stringify(result.data, null, 2));
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

})().catch(console.error);
