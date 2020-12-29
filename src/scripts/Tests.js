function ObjectStoreTests_() {
  const {describe, it, assert} = Import.UnitTesting;
  // cast to Values_ class
  //const Values_ = import_();

  describe("when manual is turned on", function () {
    it("the cache and properties are not updated until .update is explicitly called", function () {
      const max = 10;
      const arr = Array.from(Array(max).keys());
      const store = Values_.scriptStore({manual: true});  // just save to local
      store.removeAll(arr.map(item => item.toString()));   // resets it from previous call

      arr.map(item => (max - item).toString())
        .forEach( (num, idx) =>{
          store.set(num, idx);
        });

      // make sure nothing has been put into the cache, nor properties yet
      assert.objectEquals({
        actual: store.cache.getAll([...store.map.keys()]),
        expected: {},
        comment: 'cache should be empty'
      });

      assert.objectEquals({
        actual: store.props.getProperties(),
        expected: {},
        comment: 'properties should be empty'
      })

      store.update(propsOnly=true);  // now save to properties (skip cache)

      //
      assert.equals({
        actual: store.getKeys().length,
        expected: max,
        comment: 'number of keys stored in properties should be same as max'
      });
    });
  });

  describe("initializaion via static methods", function () {

    it('stores first in its map, then in cache', () => {
      const key = 'key';
      const expected = 'value';
      const props = Values_.scriptStore();
      props.set(key, expected);
      assert.equals({expected, actual: props.map.get(key)})
    });

    it("initialize via three modes: script, user, and document stores", () => {
      var actual;
      actual = Values_.userStore();
      assert.notUndefined({actual: actual});
      actual = Values_.documentStore();
      assert.notUndefined({actual: actual});
      actual = Values_.scriptStore();
      assert.notUndefined({actual: actual});
    });

    it("initing with date: false stores dates as ISO strings", () => {
      const lib = Values_.userStore({dates:false});
      const expected = new Date();
      lib.set('date', expected);
      lib.map.delete('date');
      const actual = lib.get('date');  // get directly from cache instead of default
      assert.objectEquals({actual: actual, expected:expected.toISOString()});
    });

    it("initing with jsons: false but dates: true throws error", () => {
      assert.throwsTypeError(function () {
        const lib = Values_.userStore({jsons: false, dates: true});
      });
    });


    it("utils.serialize and utils.deseralize persists dates correctly with defaults", function () {
      const expected = {date: new Date()};
      const serialized = Values_.utils.serialize(expected);
      const actual = Values_.utils.deserialize(serialized);
      assert.objectEquals({actual: actual, expected: expected});
    });

  });

  describe("getting and setting values", () => {

    it("get and set persists jsons by default", () => {
      const lib = Values_.scriptStore(/* no params */);
      const expected = {key: 'value'};
      lib.set('key', expected);
      const actual = lib.get('key');
      assert.objectEquals({actual: actual, expected: expected});
    });

    it("get and set persists strings with jsons = false", () => {
      const lib = Values_.scriptStore({jsons:false});
      const expected = 'string';
      lib.set('key', expected);
      const actual = lib.get('key');
      assert.equals({actual: actual, expected: expected});
    });

    it("trying to persist non-strings with jsons = false throws error", () => {
      const lib = Values_.scriptStore({jsons:false});
      const expected = {obj:'obj'};
      lib.remove('key');
      assert.throwsTypeError(_ => lib.set('key', expected));
      const actual = lib.props.getProperty('key');
      assert.null_({actual: actual});
    });

    it(".setProperties with a nested object with nested arrays, primitives, objects, and dates, and persists", () => {
      const lib = Values_.scriptStore({jsons: true, dates: true});
      const expected = {
        arr: [1, 2, 4.3343433, "five"],
        obj: {
          prop:'prop',
          date: new Date()
        }
      };
      lib.removeAll();
      lib.setProperties(expected);
      const actual = lib.getAll();
      assert.objectEquals({actual: actual, expected:expected});
    });

  });
}
