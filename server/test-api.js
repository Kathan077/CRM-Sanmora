const { startServer, app } = require('./src/server');
const mongoose = require('mongoose');

// Colors for terminal output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

const logStep = (step, msg) => console.log(`\n${CYAN}${BOLD}[TEST STEP ${step}] ${msg}${RESET}`);
const logSuccess = (msg) => console.log(`${GREEN}✔ SUCCESS: ${msg}${RESET}`);
const logFail = (msg) => console.log(`${RED}✘ FAILURE: ${msg}${RESET}`);

async function runTests() {
  console.log(`${BOLD}=======================================================${RESET}`);
  console.log(`${BOLD}      CRM SANMORA - BACKEND & RBAC AUTOMATED TEST      ${RESET}`);
  console.log(`${BOLD}=======================================================${RESET}`);

  let server;
  try {
    server = await startServer();
    const baseURL = `http://localhost:${server.address().port}`;

    // 1. Test Healthcheck Endpoint
    logStep(1, 'Testing API Health check (/api/health)');
    const healthRes = await fetch(`${baseURL}/api/health`);
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.status === 'online') {
      logSuccess(`Backend is online! Version: ${healthData.version}`);
    } else {
      throw new Error(`Healthcheck failed: ${JSON.stringify(healthData)}`);
    }

    // 2. Test Super Admin Login
    logStep(2, 'Authenticating Super Admin (admin@sanmoracrm.com)');
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@sanmoracrm.com',
        password: 'Admin@123456'
      })
    });
    const loginData = await loginRes.json();

    if (!loginRes.ok || !loginData.success) {
      throw new Error(`Super Admin Login failed: ${loginData.message}`);
    }

    const adminToken = loginData.data.token;
    logSuccess(`Admin logged in successfully! Role: ${loginData.data.user.role.name}`);

    // 3. Test Fetch Available Permissions
    logStep(3, 'Fetching System Permissions Catalog (/api/roles/permissions)');
    const permRes = await fetch(`${baseURL}/api/roles/permissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const permData = await permRes.json();
    if (permRes.ok && permData.data.allPermissions.length > 0) {
      logSuccess(`Found ${permData.data.allPermissions.length} total granular permissions in ${permData.data.permissionGroups.length} modules!`);
    } else {
      throw new Error('Failed to fetch permissions catalog');
    }

    // 4. Test Create Custom Role
    logStep(4, 'Admin creating a new Custom Role: "Senior Sales Representative"');
    const createRoleRes = await fetch(`${baseURL}/api/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Senior Sales Representative',
        description: 'Handles high value lead assignments and client followups',
        permissions: ['leads:view_assigned', 'leads:create', 'leads:update', 'leads:change_status', 'followups:view', 'followups:create']
      })
    });
    const createRoleData = await createRoleRes.json();
    if (!createRoleRes.ok) {
      throw new Error(`Create role failed: ${createRoleData.message}`);
    }
    const newRoleId = createRoleData.data._id;
    logSuccess(`Custom Role created with ID: ${newRoleId}`);

    // 5. Test Create New Employee User
    logStep(5, 'Admin creating a new Employee User: "Rahul Sharma"');
    const newEmployeeEmail = `rahul.sales.${Date.now()}@sanmoracrm.com`;
    const createUserRes = await fetch(`${baseURL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Rahul Sharma',
        email: newEmployeeEmail,
        password: 'Employee@123456',
        roleId: newRoleId,
        phone: '+91 99999 88888',
        department: 'Sales',
        designation: 'Senior Sales Rep'
      })
    });
    const createUserData = await createUserRes.json();
    if (!createUserRes.ok) {
      throw new Error(`Create user failed: ${createUserData.message}`);
    }
    const newUserId = createUserData.data._id;
    logSuccess(`Employee created! ID: ${newUserId}, Email: ${newEmployeeEmail}`);

    // 6. Test Employee Login
    logStep(6, 'Authenticating Employee ("Rahul Sharma")');
    const empLoginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmployeeEmail,
        password: 'Employee@123456'
      })
    });
    const empLoginData = await empLoginRes.json();
    if (!empLoginRes.ok) {
      throw new Error(`Employee Login failed: ${empLoginData.message}`);
    }
    const empToken = empLoginData.data.token;
    logSuccess(`Employee logged in! Effective Permissions Count: ${empLoginData.data.user.effectivePermissions.length}`);

    // 7. Test RBAC Enforcement: Restricted Route (Employee attempting to view roles)
    logStep(7, 'Testing RBAC Restriction: Employee trying to access Admin Roles route (/api/roles)');
    const empRolesRes = await fetch(`${baseURL}/api/roles`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const empRolesData = await empRolesRes.json();
    if (empRolesRes.status === 403) {
      logSuccess(`RBAC Middleware BLOCKED unauthorized employee as expected! Status 403: "${empRolesData.message}"`);
    } else {
      throw new Error(`RBAC Security breached! Expected 403 Forbidden, but received ${empRolesRes.status}`);
    }

    // 8. Test Granting Custom User Permission Override
    logStep(8, 'Admin granting custom permission override ("roles:view") to Rahul Sharma');
    const updateUserRes = await fetch(`${baseURL}/api/users/${newUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        customPermissions: ['roles:view']
      })
    });
    if (!updateUserRes.ok) {
      throw new Error('Failed to update user custom permissions');
    }
    logSuccess(`Granted custom permission "roles:view" to Rahul Sharma!`);

    // 9. Re-verify access with updated permissions
    logStep(9, 'Rahul Sharma re-attempting access to (/api/roles) with updated custom permission');
    const reAccessRes = await fetch(`${baseURL}/api/roles`, {
      headers: { Authorization: `Bearer ${empToken}` } // Token identifies Rahul, whose permission matrix is dynamic
    });
    const reAccessData = await reAccessRes.json();
    if (reAccessRes.status === 200) {
      logSuccess(`Access GRANTED after custom permission override! Returned ${reAccessData.count} roles.`);
    } else {
      throw new Error(`Access failed: ${reAccessData.message}`);
    }

    console.log(`\n${GREEN}${BOLD}=======================================================${RESET}`);
    console.log(`${GREEN}${BOLD}   🎉 ALL 9 BACKEND & RBAC TESTS PASSED SUCCESSFULLY!   ${RESET}`);
    console.log(`${GREEN}${BOLD}=======================================================${RESET}\n`);

  } catch (err) {
    logFail(err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
    process.exit();
  }
}

runTests();
