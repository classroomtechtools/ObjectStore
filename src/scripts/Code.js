/**
 * @param {String} [guard='script']
 * @param {Object} [config]
 * @param {Boolean} [config.manual=false] - Only persists on call to .persist
 * @param {Boolean} [config.jsons=true] - Converts the objects with JSOn.stringify
 * @param {String[]} [config.paths=[]] - List of strings that passed in object that should be kept
 * @return {Store}
 * @example
const store = ObjectStore();
const store = ObjectStore('user');
const store = ObjectStore('script' {manual: true});
 */
function create (guard='script', config) {
  const {Store} = Import.ObjectStore;
  return new Store(guard, config);
}

function import_ () {
  const {Store} = Import.ObjectStore;
  return Store;
}
