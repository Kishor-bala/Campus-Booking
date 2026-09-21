import app from '../src/app.js';
import { pool } from '../src/db/index.js';

let server;
const PORT = 4099;
const BASE_URL = `http://localhost:${PORT}`;

const runTests = async () => {
  console.log('Starting Phase 3 Authentication & Security Automated Verification Tests...\n');

  server = app.listen(PORT);

  try {
    // Helper to extract cookies and CSRF token
    let cookie = '';
    let csrfToken = '';

    const fetchCsrf = async () => {
      const res = await fetch(`${BASE_URL}/api/auth/csrf`, {
        headers: cookie ? { cookie } : {},
      });
      const setCookieHeader = res.headers.get('set-cookie');
      if (setCookieHeader) {
        cookie = setCookieHeader.split(';')[0];
      }
      const data = await res.json();
      csrfToken = data.data.csrfToken;
      return { res, csrfToken };
    };

    // 1. Fetch initial CSRF token
    await fetchCsrf();
    console.log('1. Fetch CSRF token: OK');

    // 2. CSRF Enforcement Test (Missing x-csrf-token header)
    const noCsrfRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({
        name: 'CSRF Test',
        email: 'csrftest@campus.edu',
        password: 'Password123!',
      }),
    });
    console.log(`2. Missing x-csrf-token header returns status: ${noCsrfRes.status} (Expected: 403)`);
    if (noCsrfRes.status !== 403) throw new Error('CSRF enforcement failed!');

    // 3. User Registration (Privilege escalation stripping test)
    const testEmail = `student_${Date.now()}@campus.edu`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie,
      },
      body: JSON.stringify({
        name: 'Test Student',
        email: testEmail,
        password: 'StudentPassword123!',
        role: 'ADMIN', // Privilege escalation attempt
      }),
    });
    const regData = await regRes.json();
    console.log(`3. Registration status: ${regRes.status} (Expected: 201)`);
    console.log(`   Assigned role: ${regData.data?.role} (Expected: STUDENT - Privilege escalation stripped)`);
    if (regRes.status !== 201 || regData.data?.role !== 'STUDENT') {
      throw new Error('Registration role enforcement failed!');
    }

    // 4. Invalid Password Login Test
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie,
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!',
      }),
    });
    console.log(`4. Invalid password status: ${badLoginRes.status} (Expected: 401)`);
    if (badLoginRes.status !== 401) throw new Error('Invalid login test failed!');

    // 5. Valid Student Login Test & Session Rotation
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie,
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'StudentPassword123!',
      }),
    });
    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (setCookieHeader) {
      cookie = setCookieHeader.split(';')[0];
    }
    const loginData = await loginRes.json();
    console.log(`5. Valid student login status: ${loginRes.status} (Expected: 200)`);
    console.log(`   New CSRF token rotated: ${loginData.data?.csrfToken ? 'Yes' : 'No'}`);
    csrfToken = loginData.data?.csrfToken;
    if (loginRes.status !== 200 || !cookie) throw new Error('Student login failed!');

    // 6. Current User Identity Test (GET /api/auth/me)
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { cookie },
    });
    const meData = await meRes.json();
    console.log(`6. GET /api/auth/me status: ${meRes.status} (Expected: 200)`);
    console.log(`   Logged in user: ${meData.data?.email} (${meData.data?.role})`);
    if (meRes.status !== 200 || meData.data?.email !== testEmail) {
      throw new Error('GET /api/auth/me failed!');
    }

    // 7. Role Privilege Blocking Test (STUDENT calling ADMIN route)
    const studentAdminRes = await fetch(`${BASE_URL}/api/admin/test-protection`, {
      headers: { cookie },
    });
    console.log(`7. Student accessing admin route status: ${studentAdminRes.status} (Expected: 403)`);
    if (studentAdminRes.status !== 403) throw new Error('Role privilege blocking failed!');

    // 8. Admin Login & Access Test
    await fetchCsrf();
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'kishorbala003@gmail.com';
    const adminPass = process.env.SEED_ADMIN_PASSWORD || 'login123';

    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie,
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPass,
      }),
    });
    const adminSetCookie = adminLoginRes.headers.get('set-cookie');
    if (adminSetCookie) {
      cookie = adminSetCookie.split(';')[0];
    }
    const adminLoginData = await adminLoginRes.json();
    csrfToken = adminLoginData.data?.csrfToken;
    console.log(`8. Admin login status: ${adminLoginRes.status} (Expected: 200)`);

    const adminAccessRes = await fetch(`${BASE_URL}/api/admin/test-protection`, {
      headers: { cookie },
    });
    console.log(`   Admin accessing admin route status: ${adminAccessRes.status} (Expected: 200)`);
    if (adminAccessRes.status !== 200) throw new Error('Admin RBAC access failed!');

    // 9. Logout and Session Destruction Test
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'x-csrf-token': csrfToken,
        cookie,
      },
    });
    console.log(`9. Logout status: ${logoutRes.status} (Expected: 200)`);

    const postLogoutMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { cookie },
    });
    console.log(`   Post-logout GET /api/auth/me status: ${postLogoutMeRes.status} (Expected: 401)`);
    if (postLogoutMeRes.status !== 401) throw new Error('Logout session destruction failed!');

    console.log('\nALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('\nPHASE 3 VERIFICATION ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
};

runTests();
