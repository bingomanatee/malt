import { Change } from '../Change';
import {
  ABSENT,
  CHANGE_ABSOLUTE,
  CHANGE_DOWN,
  CHANGE_UP,
  TYPE_ANY,
} from '../constants';
import { LeafType } from '../types';
import {
  clone,
  detectForm,
  detectType,
  e,
  getKey,
  hasKey,
  isArr,
  setKey,
} from '../utils';

function branchChanges(target, value): Map<LeafType, any> {
  const branchChanges = new Map();

  target.beach((branch, name) => {
    //@TODO: type test now?
    if (hasKey(value, name, target.form)) {
      const newValue = getKey(value, name, target.form);
      if (newValue !== branch.value) {
        branchChanges.set(branch, newValue);
      }
    }
  });

  return branchChanges;
}

function checkForm(target, value) {
  /**
   * insures that the value is the same type as the leaf's current value
   * @param value
   */
  if (target.type === TYPE_ANY || target.form === TYPE_ANY) return;

  if (target.type) {
    const valueType = detectType(value);

    if (target.type === true) {
      // a specific boolean - not just truthy
      const targetType = detectType(target.value);
      if (valueType === targetType) return;
      throw e(
        `incorrect type for leaf ${target.name ||
          ''}; wanted ${targetType.toString()}, got ${targetType.toString()}`,
        { valueType, targetType, target, value }
      );
    }

    if (isArr(target.type)) {
      if (target.type.includes(valueType)) return;
      throw e(`incorrect type for leaf ${target.name || ''}; `, {
        valueType,
        target,
        types: target.type,
        value,
      });
    }

    if (valueType !== target.type) {
      throw e(`incorrect type for leaf ${target.name || ''}`, {
        valueType,
        type: target.type,
        target,
        value,
      });
    }
  }

  const valueForm = detectForm(value);
  if (valueForm !== target.form) {
    throw e(
      `incorrect form for leaf ${target.name ||
        ''}; wanted ${target.form.toString()}, got ${valueForm.toString()}`,
      {
        valueForm,
        leafForm: target.form,
        value,
      }
    );
  }
}
export default function listenForChange(target) {
  target.on('change-up', value => {
    const branchMap = branchChanges(target, value);
    branchMap.forEach((newValue, branch) => {
      branch.next(newValue); // can throw;
    });
  });

  target.on('change-from-branch', (branch: LeafType) => {
    if (branch.name && target.branch(branch.name) === branch) {
      const value = clone(target.value);
      const branchValue = branch.valueWithSelectors();
      setKey(value, branch.name, branchValue, target.form);
      target.emit('debug', {
        n: 2,
        message: ['--- >>>>>>>>> changing from branch ', branch.name],
      });
      target.next(value, CHANGE_DOWN);
    }
  });

  target.on('change-value', ({ value, direction }) => {
    if (target.isInitialized) {
      checkForm(target, value);
    }
    target.transact(() => {
      const rootChange = Change.create(target, value, direction);
      if (direction === CHANGE_ABSOLUTE) {
        direction = ABSENT;
      }
      if (
        !(
          target.version !== null &&
          target._history &&
          target.history.get(target.version) === target.value
        )
      ) {
        target.snapshot();
      }

      target.value = rootChange.next;
      target.version = null;
      try {
        target.emit('change', rootChange);
        if (rootChange.error) throw rootChange.error;
        if (direction !== CHANGE_DOWN) {
          target.emit('change-up', value);
        }
        if (direction !== CHANGE_UP && !target.isRoot) {
          target.parent.emit('change-from-branch', target);
        }
      } catch (err) {
        if (!rootChange.isStopped) {
          rootChange.error = err;
        }
        throw err;
      }
      rootChange.complete();
    });
  });

  target.on('rollback', version => {
    /**
     * resets all branches by resetting their value to the first one
     * whose version is <= the target.
     *
     * @param version {number}
     * @param rollingForward {boolean}
     */

    // either  at parent, or rolling forward from parent

    if (target._dirty || target.version === null || target.version > version) {
      // at target point we do have a value that needs to be redacted

      const snap = target._getSnap(version);

      if (snap !== null) {
        target._value = snap.value;
        target._version = snap.version;
      }
      target._purgeHistoryAfter(version);
    }

    target.branchEmit('rollback', version);
  });
}