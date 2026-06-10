import http from 'http';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function test() {
  try {
    console.log('Hitting /api/cars with location TP. Hồ Chí Minh...');
    const res1 = await makeRequest('http://localhost:5173/api/cars?location=TP.%20H%E1%BB%93%20Ch%C3%AD%20Minh');
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Body: ${res1.body.substring(0, 200)}...`);

    console.log('\nHitting /api/cars with location Hà Nội...');
    const res2 = await makeRequest('http://localhost:5173/api/cars?location=H%C3%A0%20N%E1%BB%99i');
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Body: ${res2.body.substring(0, 200)}...`);

    console.log('\nHitting /api/cars with location Đà Nẵng...');
    const res3 = await makeRequest('http://localhost:5173/api/cars?location=%C4%90%C3%A0%20N%E1%BA%B5ng');
    console.log(`Status: ${res3.statusCode}`);
    console.log(`Body: ${res3.body.substring(0, 200)}...`);

  } catch (e) {
    console.error('Server request failed:', e.message);
  }
}

test();
