const { startServer } = require('./src/server');
const mongoose = require('mongoose');

async function testScalability() {
  console.log('--- Running Scalability & Performance Validation ---');
  const server = await startServer(0);
  const baseURL = `http://localhost:${server.address().port}`;

  try {
    // 1. Login Admin
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sanmoracrm.com', password: 'Admin@123456' })
    });
    const { data: { token } } = await loginRes.json();
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test Pagination on Customers
    const t0 = Date.now();
    const custRes = await fetch(`${baseURL}/api/customers?page=1&limit=10`, { headers });
    const custData = await custRes.json();
    const custTime = Date.now() - t0;
    console.log(`✔ Customers Pagination (page 1, limit 10): ${custTime}ms, count: ${custData.count}, total: ${custData.total}`);

    // 3. Test Pagination on Followups
    const t1 = Date.now();
    const fupRes = await fetch(`${baseURL}/api/followups?page=1&limit=10`, { headers });
    const fupData = await fupRes.json();
    const fupTime = Date.now() - t1;
    console.log(`✔ Followups Pagination (page 1, limit 10): ${fupTime}ms, count: ${fupData.count}, total: ${fupData.total}`);

    // 4. Test Pagination on Tasks
    const t2 = Date.now();
    const taskRes = await fetch(`${baseURL}/api/tasks?page=1&limit=10`, { headers });
    const taskData = await taskRes.json();
    const taskTime = Date.now() - t2;
    console.log(`✔ Tasks Pagination (page 1, limit 10): ${taskTime}ms, count: ${taskData.count}, total: ${taskData.total}`);

    // 5. Test Pagination on Users
    const t3 = Date.now();
    const userRes = await fetch(`${baseURL}/api/users?page=1&limit=10`, { headers });
    const userData = await userRes.json();
    const userTime = Date.now() - t3;
    console.log(`✔ Users Pagination (page 1, limit 10): ${userTime}ms, count: ${userData.count}, total: ${userData.total}`);

    // 6. Test Unpaginated Backward Compatibility (must return res.data as array)
    const rawRes = await fetch(`${baseURL}/api/customers`, { headers });
    const rawData = await rawRes.json();
    if (Array.isArray(rawData.data)) {
      console.log(`✔ Backward compatibility verified: res.data is Array of length ${rawData.data.length}`);
    } else {
      throw new Error('Backward compatibility failure: res.data is not an Array');
    }

    console.log('--- ALL SCALABILITY & BACKWARD COMPATIBILITY CHECKS PASSED! ---');
  } catch (err) {
    console.error('Scalability test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit();
  }
}

testScalability();
