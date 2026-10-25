// Firestore's REST API wraps every value in a typed envelope. These two
// functions convert plain JSON to that shape and back.

export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export type FirestoreFields = Record<string, FirestoreValue>;

export function toValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === 'object') return { mapValue: { fields: toFields(value as Record<string, unknown>) } };
  throw new TypeError(`Can't store a ${typeof value} in Firestore`);
}

export function toFields(object: Record<string, unknown>): FirestoreFields {
  const fields: FirestoreFields = {};
  for (const [key, value] of Object.entries(object)) {
    // Optional fields are left out rather than stored as null.
    if (value !== undefined) fields[key] = toValue(value);
  }
  return fields;
}

export function fromValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromValue);
  if ('mapValue' in value) return fromFields(value.mapValue.fields ?? {});
  return undefined;
}

export function fromFields(fields: FirestoreFields): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const plain = fromValue(value);
    if (plain !== null && plain !== undefined) object[key] = plain;
  }
  return object;
}
