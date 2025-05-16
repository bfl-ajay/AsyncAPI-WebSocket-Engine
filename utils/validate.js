import Ajv from 'ajv';

// 🔑 Paste this function at the very top!
function stripXParserKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stripXParserKeys);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k]) => k !== 'x-parser-schema-id')
        .map(([k, v]) => [k, stripXParserKeys(v)])
    );
  }
  return obj;
}

export function validate(schema, payload) {
  const ajv = new Ajv();
  const cleanSchema = stripXParserKeys(schema);
  const validate = ajv.compile(cleanSchema);
  const valid = validate(payload);
  if (!valid) {
    return { success: false, error: ajv.errorsText(validate.errors) };
  }
  return { success: true };
}
