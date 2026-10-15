'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { authService, ROLES } = require('../../src/services/auth/authService');
const { conversationMemory } = require('../../src/services/memory/conversationMemory');

describe('Security & Authentication Tests', () => {
  test('PBKDF2 Password Hashing and Timing-Safe Verification', () => {
    const password = 'SuperSecretPassword2026!';
    const { salt, hash } = authService.hashPassword(password);

    assert.ok(salt && salt.length >= 32);
    assert.ok(hash && hash.length === 128); // 64 bytes in hex

    // Valid password verification
    const isValid = authService.verifyPassword(password, salt, hash);
    assert.equal(isValid, true);

    // Invalid password verification
    const isInvalid = authService.verifyPassword('WrongPassword', salt, hash);
    assert.equal(isInvalid, false);
  });

  test('Prevents unauthorized privilege escalation to Administrator', async () => {
    // Attempting to register as Administrator without setup token must throw or assign User role
    await assert.rejects(async () => {
      await authService.registerUser({
        username: 'hacker',
        email: 'hacker@example.com',
        password: 'password123',
        role: ROLES.ADMIN,
        adminToken: 'wrong_token'
      });
    }, /Invalid administrator setup token/);
  });

  test('Enforces strict cross-user memory isolation', () => {
    const userA = 'user_alice_123';
    const userB = 'user_bob_456';

    // Alice saves a private memory
    const aliceMem = conversationMemory.saveUserMemory(userA, {
      content: 'Alice prefers dark theme and Python',
      category: 'preference'
    });

    // Bob queries his own memories
    const bobMemories = conversationMemory.getUserMemories(userB);
    const aliceMemories = conversationMemory.getUserMemories(userA);

    // Alice's memory must not appear in Bob's query
    assert.ok(aliceMemories.some(m => m.id === aliceMem.id));
    assert.ok(!bobMemories.some(m => m.id === aliceMem.id));

    // Bob cannot delete Alice's memory
    const bobDeleteAttempt = conversationMemory.deleteUserMemory(userB, aliceMem.id);
    assert.equal(bobDeleteAttempt, false);

    // Alice's memory remains intact
    assert.ok(conversationMemory.getUserMemories(userA).some(m => m.id === aliceMem.id));
  });
});
