const keytar = require('keytar');

async function testKeytar() {
  console.log('Testing keytar with Windows Credential Manager...\n');

  try {
    // Test 1: Store a credential
    console.log('1. Storing test credential...');
    await keytar.setPassword('toto-mcp-test', 'test-token', 'secret-value-123');
    console.log('   ✅ Credential stored successfully');

    // Test 2: Retrieve the credential
    console.log('\n2. Retrieving test credential...');
    const retrieved = await keytar.getPassword('toto-mcp-test', 'test-token');
    if (retrieved === 'secret-value-123') {
      console.log('   ✅ Credential retrieved successfully:', retrieved);
    } else {
      console.log('   ❌ Retrieved value does not match!');
      process.exit(1);
    }

    // Test 3: Delete the credential
    console.log('\n3. Deleting test credential...');
    const deleted = await keytar.deletePassword('toto-mcp-test', 'test-token');
    if (deleted) {
      console.log('   ✅ Credential deleted successfully');
    } else {
      console.log('   ⚠️  Credential deletion returned false (may not exist)');
    }

    // Test 4: Verify deletion
    console.log('\n4. Verifying deletion...');
    const shouldBeNull = await keytar.getPassword('toto-mcp-test', 'test-token');
    if (shouldBeNull === null) {
      console.log('   ✅ Credential properly deleted (returns null)');
    } else {
      console.log('   ❌ Credential still exists!');
      process.exit(1);
    }

    console.log('\n✅ All keytar tests passed!');
    console.log('Windows Credential Manager is working correctly.\n');

  } catch (error) {
    console.error('❌ Keytar test failed:', error.message);
    process.exit(1);
  }
}

testKeytar();
