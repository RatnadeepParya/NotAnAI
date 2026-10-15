'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { SafeMathParser, UnitConverter } = require('../../src/engine/reasoning/ruleEngine');
const { KnowledgeGraph, RELATIONSHIPS } = require('../../src/engine/reasoning/knowledgeGraph');

describe('Safe Arithmetic Parser (Zero eval)', () => {
  test('Evaluates operator precedence correctly', () => {
    // 2 + 3 * 4 = 14 (not 20)
    assert.equal(SafeMathParser.evaluate('2 + 3 * 4'), 14);
  });

  test('Evaluates parentheses correctly', () => {
    // (2 + 3) * 4 = 20
    assert.equal(SafeMathParser.evaluate('(2 + 3) * 4'), 20);
  });

  test('Evaluates exponents and decimal numbers', () => {
    assert.equal(SafeMathParser.evaluate('2 ^ 8'), 256);
    assert.equal(SafeMathParser.evaluate('3.5 * 2'), 7);
  });

  test('Evaluates unary minus and negative numbers', () => {
    assert.equal(SafeMathParser.evaluate('-10 + 25'), 15);
    assert.equal(SafeMathParser.evaluate('5 * -3'), -15);
  });

  test('Throws error on division by zero', () => {
    assert.throws(() => SafeMathParser.evaluate('100 / 0'), /Division by zero/);
  });
});

describe('Unit Conversion Engine', () => {
  test('Converts lengths with high precision', () => {
    // 1 km = 0.62137 miles approx
    const miles = UnitConverter.convert(1, 'km', 'miles');
    assert.ok(Math.abs(miles - 0.62137) < 0.001);

    const cm = UnitConverter.convert(2, 'm', 'cm');
    assert.equal(cm, 200);
  });

  test('Converts masses accurately', () => {
    // 1 kg approx 2.20462 lbs
    const lbs = UnitConverter.convert(1, 'kg', 'lbs');
    assert.ok(Math.abs(lbs - 2.20462) < 0.001);
  });

  test('Converts temperatures accurately', () => {
    // 0 C = 32 F, 100 C = 212 F
    assert.equal(UnitConverter.convert(0, 'celsius', 'fahrenheit'), 32);
    assert.equal(UnitConverter.convert(100, 'celsius', 'fahrenheit'), 212);
    assert.equal(UnitConverter.convert(0, 'celsius', 'kelvin'), 273.15);
  });

  test('Converts digital data storage units', () => {
    assert.equal(UnitConverter.convert(1, 'gb', 'mb'), 1024);
    assert.equal(UnitConverter.convert(1024, 'kb', 'mb'), 1);
  });
});

describe('Knowledge Graph Multi-Hop Traversal', () => {
  test('Deduces multi-hop transitive IS_A relationships with path explanation', () => {
    const graph = new KnowledgeGraph();
    graph.addEntity('earth', 'Earth', 'planet');
    graph.addEntity('planet', 'Planet', 'class');
    graph.addEntity('celestial body', 'Celestial Body', 'universe');

    graph.addRelationship('earth', RELATIONSHIPS.IS_A, 'planet');
    graph.addRelationship('planet', RELATIONSHIPS.IS_A, 'celestial body');

    const deduction = graph.deduceRelationship('earth', 'celestial body', RELATIONSHIPS.IS_A);
    assert.equal(deduction.established, true);
    assert.equal(deduction.hops, 2);
    assert.equal(deduction.supportingPath, 'earth → IS_A → planet AND planet → IS_A → celestial body');
  });

  test('Prevents cycles during graph traversal', () => {
    const graph = new KnowledgeGraph();
    graph.addEntity('a', 'A', 'item');
    graph.addEntity('b', 'B', 'item');
    graph.addEntity('c', 'C', 'item');

    // Create a cycle: A -> B -> C -> A
    graph.addRelationship('a', RELATIONSHIPS.RELATED_TO, 'b');
    graph.addRelationship('b', RELATIONSHIPS.RELATED_TO, 'c');
    graph.addRelationship('c', RELATIONSHIPS.RELATED_TO, 'a');

    const paths = graph.findPaths('a', 'c', 4);
    assert.ok(paths.length > 0);
    // Verified that it terminated and did not loop infinitely
  });
});
