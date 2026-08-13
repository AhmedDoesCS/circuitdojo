/**
 * Profile backup and restore.
 *
 * The backup file is the only escape hatch a guest has: browser storage is
 * scoped to an origin and can be cleared without warning. A backup that silently
 * omits the learner's position in the curriculum would look like it worked and
 * cost them everything they had done.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage stub, installed before the module under test reads it.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { localStore } = await import('../src/lib/storage.js');

test('a backup carries the roadmap position', () => {
  localStore.setRoadmap(['s1b1-ohms-law-current', 's1b1-ohms-law-voltage']);
  const file = localStore.exportProfile();
  assert.deepEqual(file.roadmap, ['s1b1-ohms-law-current', 's1b1-ohms-law-voltage']);
  assert.equal(file.version, 2);
});

test('restoring puts the position back', () => {
  const file = { ...localStore.exportProfile(), roadmap: ['s2b1-parallel-pair'] };
  localStore.setRoadmap([]);
  assert.equal(localStore.importProfile(file).ok, true);
  assert.deepEqual(localStore.getRoadmap(), ['s2b1-parallel-pair']);
});

test('a backup written before the roadmap existed leaves the position alone', () => {
  localStore.setRoadmap(['s3b1-pull-current']);
  const old = localStore.exportProfile();
  delete old.roadmap; // a version 1 file
  assert.equal(localStore.importProfile(old).ok, true);
  assert.deepEqual(
    localStore.getRoadmap(),
    ['s3b1-pull-current'],
    'an old backup must not reset a learner to the first unit'
  );
});

test('a file that is not a profile is refused rather than thrown at', () => {
  assert.equal(localStore.importProfile({ hello: 'world' }).ok, false);
  assert.equal(localStore.importProfile(null).ok, false);
});
