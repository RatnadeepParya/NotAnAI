'use strict';

const { knowledgeGraph, RELATIONSHIPS } = require('./knowledgeGraph');

/**
 * Safe Arithmetic Parser
 * Tokenizes and evaluates arithmetic expressions using Shunting-Yard Algorithm & AST.
 * Zero use of eval() or new Function().
 */
class SafeMathParser {
  static evaluate(expression) {
    if (!expression || typeof expression !== 'string') return null;

    // Clean expression
    const clean = expression
      .replace(/x/gi, '*')
      .replace(/\^/g, '**')
      .replace(/[^0-9\.\+\-\*\/\(\)\s\%]/g, '')
      .trim();

    if (!clean) return null;

    const tokens = SafeMathParser._tokenize(clean);
    if (!tokens || tokens.length === 0) return null;

    return SafeMathParser._parseAndCompute(tokens);
  }

  static _tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (/[0-9\.]/.test(ch)) {
        let numStr = '';
        while (i < str.length && /[0-9\.]/.test(str[i])) {
          numStr += str[i++];
        }
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        continue;
      }

      if (ch === '*' && str[i + 1] === '*') {
        tokens.push({ type: 'operator', value: '^', precedence: 4, assoc: 'right' });
        i += 2;
        continue;
      }

      if (['+', '-', '*', '/', '%'].includes(ch)) {
        // Handle unary minus
        if (ch === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'operator' || tokens[tokens.length - 1].value === '(')) {
          let numStr = '-';
          i++;
          while (i < str.length && /[0-9\.]/.test(str[i])) {
            numStr += str[i++];
          }
          if (numStr === '-') return null;
          tokens.push({ type: 'number', value: parseFloat(numStr) });
          continue;
        }

        const precedence = (ch === '+' || ch === '-') ? 2 : 3;
        tokens.push({ type: 'operator', value: ch, precedence, assoc: 'left' });
        i++;
        continue;
      }

      if (ch === '(' || ch === ')') {
        tokens.push({ type: 'paren', value: ch });
        i++;
        continue;
      }

      i++;
    }
    return tokens;
  }

  static _parseAndCompute(tokens) {
    const outputQueue = [];
    const opStack = [];

    for (const token of tokens) {
      if (token.type === 'number') {
        outputQueue.push(token.value);
      } else if (token.type === 'operator') {
        while (
          opStack.length > 0 &&
          opStack[opStack.length - 1].type === 'operator' &&
          ((token.assoc === 'left' && token.precedence <= opStack[opStack.length - 1].precedence) ||
           (token.assoc === 'right' && token.precedence < opStack[opStack.length - 1].precedence))
        ) {
          outputQueue.push(opStack.pop().value);
        }
        opStack.push(token);
      } else if (token.value === '(') {
        opStack.push(token);
      } else if (token.value === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1].value !== '(') {
          outputQueue.push(opStack.pop().value);
        }
        if (opStack.length === 0) return null; // Mismatched parens
        opStack.pop(); // Pop '('
      }
    }

    while (opStack.length > 0) {
      const top = opStack.pop();
      if (top.value === '(' || top.value === ')') return null;
      outputQueue.push(top.value);
    }

    // Evaluate RPN
    const evalStack = [];
    for (const item of outputQueue) {
      if (typeof item === 'number') {
        evalStack.push(item);
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (a === undefined || b === undefined) return null;

        let res = 0;
        switch (item) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) throw new Error('Division by zero');
            res = a / b;
            break;
          case '%': res = a % b; break;
          case '^': res = Math.pow(a, b); break;
          default: return null;
        }
        evalStack.push(res);
      }
    }

    return evalStack.length === 1 ? evalStack[0] : null;
  }
}

/**
 * Unit Conversion Tables & Engine
 */
const UNIT_CONVERSIONS = {
  length: {
    base: 'meter',
    units: {
      meter: 1.0,
      meters: 1.0,
      m: 1.0,
      kilometer: 1000.0,
      kilometers: 1000.0,
      km: 1000.0,
      centimeter: 0.01,
      centimeters: 0.01,
      cm: 0.01,
      millimeter: 0.001,
      millimeters: 0.001,
      mm: 0.001,
      mile: 1609.344,
      miles: 1609.344,
      mi: 1609.344,
      yard: 0.9144,
      yards: 0.9144,
      yd: 0.9144,
      foot: 0.3048,
      feet: 0.3048,
      ft: 0.3048,
      inch: 0.0254,
      inches: 0.0254,
      in: 0.0254
    }
  },
  mass: {
    base: 'gram',
    units: {
      gram: 1.0,
      grams: 1.0,
      g: 1.0,
      kilogram: 1000.0,
      kilograms: 1000.0,
      kg: 1000.0,
      milligram: 0.001,
      milligrams: 0.001,
      mg: 0.001,
      pound: 453.59237,
      pounds: 453.59237,
      lbs: 453.59237,
      lb: 453.59237,
      ounce: 28.349523,
      ounces: 28.349523,
      oz: 28.349523,
      tonne: 1000000.0,
      ton: 907184.74
    }
  },
  data: {
    base: 'byte',
    units: {
      byte: 1.0,
      b: 1.0,
      kilobyte: 1024.0,
      kb: 1024.0,
      megabyte: 1048576.0,
      mb: 1048576.0,
      gigabyte: 1073741824.0,
      gb: 1073741824.0,
      terabyte: 1099511627776.0,
      tb: 1099511627776.0,
      petabyte: 1125899906842624.0,
      pb: 1125899906842624.0
    }
  },
  time: {
    base: 'second',
    units: {
      second: 1.0,
      sec: 1.0,
      s: 1.0,
      minute: 60.0,
      min: 60.0,
      hour: 3600.0,
      hr: 3600.0,
      h: 3600.0,
      day: 86400.0,
      week: 604800.0,
      year: 31536000.0
    }
  }
};

class UnitConverter {
  static convert(value, fromUnit, toUnit) {
    const val = parseFloat(value);
    if (isNaN(val)) return null;

    const from = fromUnit.toLowerCase().trim();
    const to = toUnit.toLowerCase().trim();

    // Special temperature handling
    if (['celsius', 'c', 'fahrenheit', 'f', 'kelvin', 'k'].includes(from) &&
        ['celsius', 'c', 'fahrenheit', 'f', 'kelvin', 'k'].includes(to)) {
      return UnitConverter._convertTemperature(val, from, to);
    }

    // Standard linear conversions
    for (const category of Object.values(UNIT_CONVERSIONS)) {
      if (category.units[from] !== undefined && category.units[to] !== undefined) {
        const baseVal = val * category.units[from];
        const converted = baseVal / category.units[to];
        return Math.round(converted * 100000) / 100000;
      }
    }

    return null;
  }

  static _convertTemperature(val, from, to) {
    let celsius = 0;
    if (from === 'celsius' || from === 'c') celsius = val;
    else if (from === 'fahrenheit' || from === 'f') celsius = (val - 32) * (5 / 9);
    else if (from === 'kelvin' || from === 'k') celsius = val - 273.15;

    let res = 0;
    if (to === 'celsius' || to === 'c') res = celsius;
    else if (to === 'fahrenheit' || to === 'f') res = (celsius * (9 / 5)) + 32;
    else if (to === 'kelvin' || to === 'k') res = celsius + 273.15;

    return Math.round(res * 100) / 100;
  }
}

/**
 * RuleEngine
 * Evaluates logical rules and performs deterministic reasoning.
 */
class RuleEngine {
  constructor() {
    this.rules = [];
    this.graph = knowledgeGraph;
  }

  /**
   * Register an IF/THEN reasoning rule
   */
  addRule(rule) {
    if (!rule || !rule.id || !rule.condition || !rule.conclusion) {
      throw new Error('Rule must specify id, condition, and conclusion');
    }
    this.rules.push(rule);
  }

  /**
   * Evaluate arithmetic query (e.g. "calculate 45 * 12 + 10", "what is 2 ^ 8")
   */
  evaluateCalculation(query) {
    const mathMatch = query.match(/(?:calculate|compute|solve|what is|how much is)\s+([0-9\.\+\-\*\/\^\(\)\%\s]+)/i) ||
                      query.match(/^([0-9\.\+\-\*\/\^\(\)\%\s]+)$/);

    if (mathMatch) {
      const expr = mathMatch[1].trim();
      // Ensure at least one operator exists
      if (/[\+\-\*\/\^\%]/.test(expr)) {
        try {
          const result = SafeMathParser.evaluate(expr);
          if (result !== null && !isNaN(result)) {
            return {
              isHandled: true,
              result,
              expression: expr,
              explanation: `Evaluated expression "${expr}" using deterministic safe arithmetic AST parser.`
            };
          }
        } catch (err) {
          return { isHandled: true, error: err.message };
        }
      }
    }

    // Unit conversion query check: "convert 100 km to miles", "50 kg in lbs"
    const convMatch = query.match(/(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:to|in|into)\s+([a-zA-Z]+)/i);
    if (convMatch) {
      const [, val, fromUnit, toUnit] = convMatch;
      const converted = UnitConverter.convert(val, fromUnit, toUnit);
      if (converted !== null) {
        return {
          isHandled: true,
          result: converted,
          from: `${val} ${fromUnit}`,
          to: `${converted} ${toUnit}`,
          explanation: `Converted ${val} ${fromUnit} to ${converted} ${toUnit} using verified unit conversion table.`
        };
      }
    }

    return { isHandled: false };
  }

  /**
   * Infer relationships via Knowledge Graph
   * E.g. "Is Earth a celestial body?"
   */
  inferGraphRelationship(query) {
    const isAMatch = query.match(/is\s+([a-z\s]+)\s+(?:a|an)\s+([a-z\s]+)\??/i);
    if (isAMatch) {
      const [, source, target] = isAMatch;
      const deduction = this.graph.deduceRelationship(source.trim(), target.trim(), RELATIONSHIPS.IS_A);
      if (deduction.established) {
        return {
          inferred: true,
          answer: `Yes, ${source.trim()} is a ${target.trim()}.`,
          path: deduction.supportingPath,
          hops: deduction.hops
        };
      }
    }

    return { inferred: false };
  }
}

const ruleEngine = new RuleEngine();

module.exports = {
  SafeMathParser,
  UnitConverter,
  RuleEngine,
  ruleEngine
};
