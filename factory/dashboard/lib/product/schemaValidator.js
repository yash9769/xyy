'use strict';

/**
 * Minimal deterministic JSON Schema (draft-07 subset) validator for
 * schemas/product-specification.schema.json. The repository has no schema-validation dependency
 * (factory/docs/11-SCHEMAS.md), and Phase 5 adds none, so this implements only the keywords that
 * schema uses. Any other keyword makes validation throw rather than being silently ignored — a
 * schema edit can never quietly weaken validation.
 *
 * Schema validation is structural only; semantic rules live in validation.js.
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'schemas', 'product-specification.schema.json');

const SUPPORTED_KEYWORDS = new Set([
  '$schema', '$id', '$ref', 'title', 'description', 'definitions',
  'type', 'enum', 'required', 'properties', 'additionalProperties', 'items',
  'minItems', 'maxItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'format',
]);

let cachedSchema = null;

function loadProductSpecificationSchema() {
  if (!cachedSchema) {
    cachedSchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  }
  return cachedSchema;
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  if (type === 'number') return actual === 'number' || actual === 'integer';
  return actual === type;
}

function resolveRef(root, ref) {
  const prefix = '#/definitions/';
  if (typeof ref !== 'string' || !ref.startsWith(prefix)) {
    throw new Error(`schemaValidator: unsupported $ref '${ref}'`);
  }
  const target = root.definitions && root.definitions[ref.slice(prefix.length)];
  if (!target) throw new Error(`schemaValidator: unresolved $ref '${ref}'`);
  return target;
}

function validateNode(root, schema, value, pointer, errors) {
  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) {
      throw new Error(`schemaValidator: unsupported schema keyword '${keyword}' at ${pointer || '/'}`);
    }
  }

  if (schema.$ref) {
    validateNode(root, resolveRef(root, schema.$ref), value, pointer, errors);
    return;
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push({ path: pointer || '/', message: `expected type ${types.join('|')}, got ${typeOf(value)}` });
      return;
    }
  }

  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push({ path: pointer || '/', message: `value ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}` });
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ path: pointer || '/', message: `string shorter than ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ path: pointer || '/', message: `string longer than ${schema.maxLength}` });
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push({ path: pointer || '/', message: `string does not match pattern ${schema.pattern}` });
    }
    if (schema.format !== undefined) {
      if (schema.format !== 'date-time') throw new Error(`schemaValidator: unsupported format '${schema.format}'`);
      if (Number.isNaN(Date.parse(value))) errors.push({ path: pointer || '/', message: 'string is not a valid date-time' });
    }
  }

  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
    errors.push({ path: pointer || '/', message: `number below minimum ${schema.minimum}` });
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ path: pointer || '/', message: `array has fewer than ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({ path: pointer || '/', message: `array has more than ${schema.maxItems} items` });
    }
    if (schema.items) {
      value.forEach((item, i) => validateNode(root, schema.items, item, `${pointer}/${i}`, errors));
    }
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push({ path: `${pointer}/${key}`, message: 'required property is missing' });
      }
    }
    const props = schema.properties || {};
    for (const key of Object.keys(value)) {
      const childPointer = `${pointer}/${key}`;
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        validateNode(root, props[key], value[key], childPointer, errors);
      } else if (schema.additionalProperties === false) {
        errors.push({ path: childPointer, message: 'additional property is not allowed' });
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateNode(root, schema.additionalProperties, value[key], childPointer, errors);
      }
    }
  }
}

/** @returns {Array<{path: string, message: string}>} empty when valid. */
function validateAgainstSchema(value, schema = loadProductSpecificationSchema()) {
  const errors = [];
  validateNode(schema, schema, value, '', errors);
  return errors;
}

module.exports = { validateAgainstSchema, loadProductSpecificationSchema, SCHEMA_PATH };
