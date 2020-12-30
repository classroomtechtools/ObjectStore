/**
 * @param {String} [guard='script']
 * @param {Object} [config]
 * @param {Boolean} [config.manual=false] - Only persists on call to .persist
 * @param {Boolean} [config.jsons=true] - Converts the objects with JSOn.stringify
 * @return {Store}
 */
function create (guard='script', config) {
  const {Store} = Import.ObjectStore;
  return new Store(guard, config);
}

/**
 * Used internally to get the class object
 */
function import_ () {
  const {Store} = Import.ObjectStore;
  return Store;
}
