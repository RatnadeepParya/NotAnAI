'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { chatController } = require('../../src/controllers/chatController');
const { authController } = require('../../src/controllers/authController');
const { chatPipeline } = require('../../src/engine/chatPipeline');
const { invertedIndex } = require('../../src/engine/retrieval/invertedIndex');
const { knowledgeGraph } = require('../../src/engine/reasoning/knowledgeGraph');
const { localStorageEngine } = require('../../src/services/storage/localStorageEngine');
const bootstrap = require('../../scripts/bootstrap');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    bodyData: null,
    renderedView: null,
    renderedData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    json(data) {
      this.bodyData = data;
      return this;
    },
    send(data) {
      this.bodyData = data;
      return this;
    },
    render(view, data) {
      this.renderedView = view;
      this.renderedData = data;
      return this;
    }
  };
}

test('Integration Suite — Not an AI Controllers & Pipeline', async (t) => {
  // Ensure seed knowledge is ready
  await bootstrap();

  const mockUser = {
    uid: 'integration_tester',
    username: 'tester',
    role: 'user'
  };

  await t.test('1. Render Chat View', async () => {
    const req = { session: { user: mockUser }, query: {} };
    const res = createMockRes();

    await chatController.renderChat(req, res);
    assert.strictEqual(res.renderedView, 'chat/index');
    assert.ok(res.renderedData.title.includes('Not an AI'));
    assert.ok(Array.isArray(res.renderedData.messages));
  });

  await t.test('2. Factual Retrieval Message via ChatController', async () => {
    const req = {
      session: { user: mockUser },
      body: { message: 'What is a database?', conversationId: 'conv_integ_1' }
    };
    const res = createMockRes();

    await chatController.sendMessage(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);
    assert.ok(res.bodyData.botMessage.text.includes('database is an organized'));
    assert.ok(res.bodyData.botMessage.confidence >= 0.85);
    assert.ok(res.bodyData.botMessage.explanation);
    assert.ok(res.bodyData.botMessage.explanation.strategy);
  });

  await t.test('3. Safe Arithmetic Calculation via ChatController', async () => {
    const req = {
      session: { user: mockUser },
      body: { message: 'calculate 125 * 8', conversationId: 'conv_integ_2' }
    };
    const res = createMockRes();

    await chatController.sendMessage(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);
    assert.ok(res.bodyData.botMessage.text.includes('1000'));
    assert.strictEqual(res.bodyData.botMessage.confidence, 1.0);
    assert.strictEqual(res.bodyData.botMessage.format, 'calculated');
    assert.strictEqual(res.bodyData.botMessage.explanation.strategy, 'Deterministic Arithmetic / Unit Parser');
  });

  await t.test('4. Unit Conversion via ChatController', async () => {
    const req = {
      session: { user: mockUser },
      body: { message: 'convert 50 km to miles', conversationId: 'conv_integ_3' }
    };
    const res = createMockRes();

    await chatController.sendMessage(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);
    assert.ok(res.bodyData.botMessage.text.includes('31.068'));
    assert.strictEqual(res.bodyData.botMessage.confidence, 1.0);
    assert.strictEqual(res.bodyData.botMessage.format, 'calculated');
  });

  await t.test('5. Multi-Hop Graph Deduction via ChatController', async () => {
    const req = {
      session: { user: mockUser },
      body: { message: 'Is Earth a celestial body?', conversationId: 'conv_integ_4' }
    };
    const res = createMockRes();

    await chatController.sendMessage(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);
    assert.ok(res.bodyData.botMessage.text.includes('Yes'));
    assert.strictEqual(res.bodyData.botMessage.format, 'graph_deduction');
    assert.ok(res.bodyData.botMessage.explanation.supportingPath.length > 0);
  });

  await t.test('6. Honest Rejection of Unverifiable Query', async () => {
    const req = {
      session: { user: mockUser },
      body: { message: 'Who is the reigning emperor of Alpha Centauri quantum realm?', conversationId: 'conv_integ_5' }
    };
    const res = createMockRes();

    await chatController.sendMessage(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);
    assert.strictEqual(res.bodyData.botMessage.format, 'unknown_knowledge');
    assert.ok(res.bodyData.botMessage.text.includes('do not have verified knowledge'));
  });

  await t.test('7. Validation Rejection for Empty Message', async () => {
    const req = {
      session: { user: mockUser },
      body: { message: '   ' }
    };
    const res = createMockRes();

    await chatController.sendMessage(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.bodyData.error);
  });

  await t.test('8. Render Login View via AuthController', async () => {
    const req = { session: {}, query: {} };
    const res = createMockRes();

    await authController.renderLogin(req, res);
    assert.strictEqual(res.renderedView, 'auth/login');
    assert.ok(res.renderedData.title.includes('Sign In'));
  });

  await t.test('9. Clear Conversation History', async () => {
    const req = {
      session: { user: mockUser },
      body: { conversationId: 'conv_integ_1' }
    };
    const res = createMockRes();

    await chatController.clearConversation(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.bodyData.success, true);
  });
});
