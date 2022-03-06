import {
  isMap,
  isObj,
  isStr,
  isNumber,
  e,
  typeOfValue,
  isThere,
} from './tests';
import { TYPE_ARRAY, TYPE_MAP, TYPE_OBJECT } from '../constants';

export function toMap(m: any, force = false) {
  if (m instanceof Map) {
    return force ? new Map(m) : m;
  }
  const map = new Map();
  if (isObj(m)) Object.keys(m).forEach(key => map.set(key, m[key]));
  return map;
}

/**
 * returns a POJO object equivalent to the input;
 * or the input itself if force !== true;
 * If a map is passed, its keys are forced into a POJO; unusable keys
 * are silently skipped.
 *
 * @param m
 * @param force {boolean} returns a clone of an input object; otherwise is a noop for POJOS
 * @returns {Object}
 */
export function toObj(m: any, force = false) {
  if (!(isObj(m) || isMap(m))) {
    throw e('cannot convert target to object', { target: m });
  }
  let out = m;
  if (isObj(m)) {
    if (force) {
      out = { ...m };
    }
  } else if (isMap(m)) {
    out = {};
    m.forEach((val: any, key: any) => {
      if (!(isNumber(val) || isStr(val, true))) {
        return;
      }
      try {
        out[key] = val;
      } catch (e) {
        console.warn(
          'toObj map/object conversion -- skipping exporting of child key',
          key,
          'of ',
          m
        );
      }
    });
  }

  return out;
}

/**
 * returns the union of two values, combining dictionary key/values;
 * prefers the first parameter.
 *
 * for simple/scalar types returns the first parameter.
 *
 * @param update any
 * @param base any
 */
export function makeValue(update, base) {
  const baseType = typeOfValue(base);
  const updateType = typeOfValue(update);

  if (baseType !== updateType) {
    const err = e('makeValue Type Mismatch', {
      base,
      update,
      baseType,
      updateType,
    });

    console.log('--- mismatch', err);

    throw err;
  }

  let out = update;
  switch (baseType) {
    case TYPE_MAP:
      out = new Map(base);
      update.forEach((val, key) => {
        out.set(key, val);
      });
      break;

    case TYPE_OBJECT:
      out = { ...base, ...update };
      break;

    case TYPE_ARRAY:
      out = [...base];
      update.forEach((val, key) => {
        if (isThere(val)) {
          out[key] = val;
        }
      });
      break;
  }
  return out;
}