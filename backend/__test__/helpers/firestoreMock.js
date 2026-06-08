const deepClone = (value) => JSON.parse(JSON.stringify(value));

const SERVER_TIMESTAMP = { __fieldValue: 'serverTimestamp' };

const arrayUnion = (...values) => ({ __fieldValue: 'arrayUnion', values });
const arrayRemove = (...values) => ({ __fieldValue: 'arrayRemove', values });

const applyFieldValues = (target, patch) => {
  Object.entries(patch).forEach(([key, value]) => {
    if (value && value.__fieldValue === 'serverTimestamp') {
      target[key] = { seconds: Math.floor(Date.now() / 1000), toMillis: () => Date.now() };
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

class DocumentSnapshot {
  constructor(id, value) {
    this.id = id;
    this.exists = Boolean(value);
    this._value = value ? deepClone(value) : undefined;
  }

  data() {
    return this._value ? deepClone(this._value) : undefined;
  }
}

class QuerySnapshot {
  constructor(entries) {
    this.docs = entries.map(([id, value]) => new DocumentSnapshot(id, value));
    this.size = this.docs.length;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class DocumentReference {
  constructor(store, path) {
    this.store = store;
    this.path = path;
    this.id = path[path.length - 1];
  }

  async get() {
    return new DocumentSnapshot(this.id, this.store.get(this.path));
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
    return new QuerySnapshot(this.store.list(this.path));
  }

  orderBy() {
    return this;
  }
}

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
}

const createFirestoreMock = (seed) => new FirestoreStore(seed);

module.exports = {
  SERVER_TIMESTAMP,
  arrayRemove,
  arrayUnion,
  createFirestoreMock
};
