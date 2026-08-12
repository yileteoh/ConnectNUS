// Custom clone (not JSON.parse/stringify) so seeded Firestore-Timestamp-style
// Objects like { seconds: 1, toMillis: () => 1000 } keep their toMillis function
const deepClone = (value) => {
  if (Array.isArray(value)) return value.map(deepClone);
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, val]) => {
      clone[key] = typeof val === 'function' ? val : deepClone(val);
    });
    return clone;
  }
  return value;
};

const SERVER_TIMESTAMP = { __fieldValue: 'serverTimestamp' };
const DELETE_FIELD = { __fieldValue: 'delete' };

const arrayUnion = (...values) => ({ __fieldValue: 'arrayUnion', values });
const arrayRemove = (...values) => ({ __fieldValue: 'arrayRemove', values });
const deleteField = () => DELETE_FIELD;

// Apply Firestore-style field values to a target object, mutating it in place
const applyFieldValues = (target, patch) => {
  Object.entries(patch).forEach(([key, value]) => {
    if (value && value.__fieldValue === 'serverTimestamp') {
      target[key] = { seconds: Math.floor(Date.now() / 1000), toMillis: () => Date.now() };
      return;
    }

    if (value && value.__fieldValue === 'delete') {
      delete target[key];
      return;
    }

    if (value && value.__fieldValue === 'arrayUnion') {
      const current = Array.isArray(target[key]) ? target[key] : [];
      target[key] = [...current];
      value.values.forEach((item) => {
        if (!target[key].includes(item)) target[key].push(item);
      });
      return;
    }

    if (value && value.__fieldValue === 'arrayRemove') {
      const removals = new Set(value.values);
      target[key] = (Array.isArray(target[key]) ? target[key] : []).filter((item) => !removals.has(item));
      return;
    }

    target[key] = value;
  });
};

// Mock Firestore classes to simulate Firestore behavior in tests
class DocumentSnapshot {
  constructor(id, value, ref) {
    this.id = id;
    this.exists = Boolean(value);
    this._value = value ? deepClone(value) : undefined;
    this.ref = ref;
  }

  data() {
    return this._value ? deepClone(this._value) : undefined;
  }
}

// Mock QuerySnapshot class to simulate Firestore query results
class QuerySnapshot {
  constructor(entries, collectionRef) {
    this.docs = entries.map(([id, value]) => new DocumentSnapshot(id, value, collectionRef.doc(id)));
    this.size = this.docs.length;
    this.empty = this.docs.length === 0;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

// Helper function to check if a document matches a given filter
const matchesFilter = (value, [field, op, target]) => {
  const actual = value ? value[field] : undefined;
  if (op === 'array-contains') {
    return Array.isArray(actual) && actual.includes(target);
  }
  return actual === target;
};

// Mock Firestore classes to simulate Firestore behavior in tests
class DocumentReference {
  constructor(store, path) {
    this.store = store;
    this.path = path;
    this.id = path[path.length - 1];
  }

  async get() {
    return new DocumentSnapshot(this.id, this.store.get(this.path), this);
  }

  async set(data, options = {}) {
    const current = options.merge ? this.store.get(this.path) || {} : {};
    const next = { ...current };
    applyFieldValues(next, data);
    this.store.set(this.path, next);
  }

  async update(data) {
    const current = this.store.get(this.path);
    if (!current) throw new Error('Document does not exist.');
    const next = { ...current };
    applyFieldValues(next, data);
    this.store.set(this.path, next);
  }

  async delete() {
    this.store.delete(this.path);
  }

  collection(name) {
    return new CollectionReference(this.store, [...this.path, name]);
  }
}

// Mock CollectionReference class to simulate Firestore collection behavior
class CollectionReference {
  constructor(store, path) {
    this.store = store;
    this.path = path;
  }

  doc(id) {
    return new DocumentReference(this.store, [...this.path, id]);
  }

  async add(data) {
    const id = `mock-${this.store.nextId++}`;
    const ref = this.doc(id);
    await ref.set(data);
    return ref;
  }

  async get() {
    return new QuerySnapshot(this.store.list(this.path), this);
  }

  where(field, op, value) {
    return new Query(this, [[field, op, value]]);
  }

  orderBy() {
    return this;
  }
}

// Mock Query class to simulate Firestore query behavior
class Query {
  constructor(collectionRef, filters) {
    this.collectionRef = collectionRef;
    this.filters = filters;
  }

  where(field, op, value) {
    return new Query(this.collectionRef, [...this.filters, [field, op, value]]);
  }

  async get() {
    const entries = this.collectionRef.store
      .list(this.collectionRef.path)
      .filter(([, value]) => this.filters.every((filter) => matchesFilter(value, filter)));
    return new QuerySnapshot(entries, this.collectionRef);
  }

  orderBy() {
    return this;
  }
}

// Mock Firestore store to simulate Firestore database behavior in tests
class FirestoreStore {
  constructor(seed = {}) {
    this.data = new Map();
    this.nextId = 1;
    Object.entries(seed).forEach(([path, value]) => this.set(path.split('/'), value));
  }

  key(path) {
    return path.join('/');
  }

  get(path) {
    const value = this.data.get(this.key(path));
    return value ? deepClone(value) : undefined;
  }

  set(path, value) {
    this.data.set(this.key(path), deepClone(value));
  }

  delete(path) {
    this.data.delete(this.key(path));
  }

  list(collectionPath) {
    const prefix = `${this.key(collectionPath)}/`;
    return [...this.data.entries()]
      .filter(([key]) => key.startsWith(prefix) && key.slice(prefix.length).split('/').length === 1)
      .map(([key, value]) => [key.slice(prefix.length), value]);
  }

  collection(name) {
    return new CollectionReference(this, [name]);
  }

  async runTransaction(callback) {
    const transaction = {
      get: (ref) => ref.get(),
      update: (ref, data) => ref.update(data)
    };

    return callback(transaction);
  }

  // Mock batch operations to simulate Firestore batch behavior in tests
  batch() {
    const ops = [];
    return {
      delete: (ref) => ops.push(() => ref.delete()),
      update: (ref, data) => ops.push(() => ref.update(data)),
      set: (ref, data, options) => ops.push(() => ref.set(data, options)),
      commit: async () => {
        for (const op of ops) await op();
      }
    };
  }
}

const createFirestoreMock = (seed) => new FirestoreStore(seed);

module.exports = {
  SERVER_TIMESTAMP,
  arrayRemove,
  arrayUnion,
  deleteField,
  createFirestoreMock
};
