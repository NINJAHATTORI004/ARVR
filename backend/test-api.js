/**
 * Test Script for ARVA Backend API
 * Run with: node test-api.js
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';

// Test data
const VALID_IDS = [
    'DEGREE-MIT-2024-001',
    'LUXURY-ROLEX-SUB-2024-ABC123',
    'CERT-AWS-SAA-2024-XYZ789',
    'ART-PICASSO-AUTH-2024-P001'
];

const INVALID_IDS = [
    'FAKE-DEGREE-2024-XXX',
    'COUNTERFEIT-WATCH-123',
    'INVALID-CERT-000'
];

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
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
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ARVA API Test Suite');
    console.log('═══════════════════════════════════════════════════════\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    try {
        const result = await makeRequest('GET', '/api/health');
        if (result.status === 200 && result.data.status === 'healthy') {
            console.log('   ✅ PASSED - Server is healthy\n');
            passed++;
        } else {
            console.log('   ❌ FAILED - Unexpected response\n');
            failed++;
        }
    } catch (e) {
        console.log(`   ❌ FAILED - ${e.message}\n`);
        failed++;
    }

    // Test 2: Verify Valid Assets
    console.log('📋 Test 2: Verify Valid Assets');
    for (const id of VALID_IDS) {
        try {
            const result = await makeRequest('POST', '/api/verify', { uniqueId: id });
            if (result.status === 200 && result.data.isVerified === true) {
                console.log(`   ✅ ${id} - Verified`);
                passed++;
            } else {
                console.log(`   ❌ ${id} - Expected verified, got: ${JSON.stringify(result.data)}`);
                failed++;
            }
        } catch (e) {
            console.log(`   ❌ ${id} - Error: ${e.message}`);
            failed++;
        }
    }
    console.log('');

    // Test 3: Verify Invalid Assets
    console.log('📋 Test 3: Verify Invalid Assets (Should Fail)');
    for (const id of INVALID_IDS) {
        try {
            const result = await makeRequest('POST', '/api/verify', { uniqueId: id });
            if (result.status === 200 && result.data.isVerified === false) {
                console.log(`   ✅ ${id} - Correctly rejected`);
                passed++;
            } else {
                console.log(`   ❌ ${id} - Expected not verified, got: ${JSON.stringify(result.data)}`);
                failed++;
            }
        } catch (e) {
            console.log(`   ❌ ${id} - Error: ${e.message}`);
            failed++;
        }
    }
    console.log('');

    // Test 4: Missing uniqueId
    console.log('📋 Test 4: Missing uniqueId (Should Error)');
    try {
        const result = await makeRequest('POST', '/api/verify', {});
        if (result.status === 400) {
            console.log('   ✅ PASSED - Correctly returned 400 error\n');
            passed++;
        } else {
            console.log(`   ❌ FAILED - Expected 400, got ${result.status}\n`);
            failed++;
        }
    } catch (e) {
        console.log(`   ❌ FAILED - ${e.message}\n`);
        failed++;
    }

    // Test 5: Demo Assets Endpoint
    console.log('📋 Test 5: Demo Assets Endpoint');
    try {
        const result = await makeRequest('GET', '/api/demo/assets');
        if (result.status === 200 && result.data.validAssets) {
            console.log(`   ✅ PASSED - Found ${result.data.validAssets.length} valid demo assets\n`);
            passed++;
        } else {
            console.log('   ❌ FAILED - Unexpected response\n');
            failed++;
        }
    } catch (e) {
        console.log(`   ❌ FAILED - ${e.message}\n`);
        failed++;
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
