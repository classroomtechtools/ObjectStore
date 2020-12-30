import {Enforce} from '@classroomtechtools/enforce_arguments';

const _config_ = Symbol('config');
function configure(config) {
  config = config || {jsons:true};
  config.jsons = config.jsons == undefined ? true : config.jsons;
  config.dates = config.dates == undefined ? false : config.dates;
  config.manual = config.manual || false;
  config.expiry = config.expiry || 600;  // 10 minutes by default
  // can pass in "max" string
  if (config.expiry == 'max') config.expiry = 21600;
  if (config.dates && !config.jsons) throw TypeError("jsons needs to be true for dates: true to be meaningful");
  if (Object.keys(config).length > 4) throw TypeError(`Unknown property: ${Object.keys(config)}`);
  return config;
}

const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

class Utils {

  static isSerializedDate(dateValue) {
    // Dates are serialized in TZ format, example: '1981-12-20T04:00:14.000Z'.
    return Utils.isString(dateValue) && datePattern.test(dateValue);
  }

  static isString(value) {
    return typeof value === 'string' || value instanceof String;
  }

  static dateReviver(key, value) {
    if (Utils.isSerializedDate(value)) {
      return new Date(value);
    }
    return value;
  }

  static dateReplacer(key, value) {
    if (value instanceof Date) {
      const timezoneOffsetInHours = -(this.getTimezoneOffset() / 60); //UTC minus local time
      const sign = timezoneOffsetInHours >= 0 ? '+' : '-';
      const leadingZero = (Math.abs(timezoneOffsetInHours) < 10) ? '0' : '';

      //It's a bit unfortunate that we need to construct a new Date instance
      //(we don't want _this_ Date instance to be modified)
      let correctedDate = new Date(this.getFullYear(), this.getMonth(),
          this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(),
          this.getMilliseconds());
      correctedDate.setHours(this.getHours() + timezoneOffsetInHours);
      const iso = correctedDate.toISOString().replace('Z', '');

      return iso + sign + leadingZero + Math.abs(timezoneOffsetInHours).toString() + ':00';
    }
    return value;
  }

  static serialize(value, dates=true) {
    // return JSON.stringify(value, Utils.dateReplacer);
    if (!dates && Utils.isString(value))
      return value;
    return JSON.stringify(value);
  }

  static deserialize(value, dates=true) {
    if (dates)
      return JSON.parse(value, Utils.dateReviver);
    return JSON.parse(value);
  }

}

/**
 * The class whose instance is returned when using `.create`. You can access the internal properties and interact with the store with its methods.
 * @class
 * @property {Map} map - Internal storage, values are not stored as strings but as their native objects
 * @property {Properties} props - AppsScripts' PropertiesService instance
 * @property {Cache} cache - AppsScripts' CacheService instance
 * @example
 * const store = ObjectStore.create('script');
 * // load it at execution start time
 * store.load();
 * store.set('key1', 'key1');
 * store.set('key2', 'key2');
 * store.persist();
 */
class Store {

  /**
   * Refer to {@link create} to get instance of this class.
   * @see {@link create}
   */
  constructor (guard='script', config) {
    this[_config_] = configure(config);
    guard = guard[0].toUpperCase() + guard.slice(1);
    this.props = PropertiesService[`get${guard}Properties`].call();
    this.cache = CacheService[`get${guard}Cache`].call();
    this.map = new Map();
  }

  static scriptStore (config={}) {
    return new Store('script', config);
  }

  static documentStore (config={}) {
    return new Store('document', config);
  }

  static userStore (config={}) {
    return new Store('user', config);
  }

  static get utils () {
    // return serialiser who knows what to do with dates, if on
    return Utils;
  }

  serializePass (value) {
    if (this[_config_].jsons)
      return Store.utils.serialize(value, this[_config_].dates);
    return value;
  }

  /**
   * Download from the PropertyStore and store locally
   */
  load () {
    const props = this.props.getProperties();
    for (const [key, value] of Object.entries(props)) {
      this.map.set(key, this.serializePass(value));
    }
  }

  /**
   * Stores the value at key. If in auto mode, also stores in cache and properties
   * @param {String} key - The identifier, must be a string
   * @param {String} value - The data to be stored at `key`.
   * @param {Boolean} [skipCache=true] - If true (the default), don't interact with the cache service for this call
   * @throws {TypeError} Type error if `key` is not a string
   * @throws {TypeError} Type error if `value` is not a string, and it attempts to write to external stores
   */
  set (key, value, skipCache=true) {
    Enforce.positional(arguments, {key: '!string', value: 'any', 'skipCache': 'boolean'});
    this.map.set(key, value);
    if (!this[_config_].manual) {
      let serializedValue = this.serializePass(value);
      if (!Utils.isString(serializedValue)) throw TypeError("value must be string");
      !skipCache && this.cache.put(key, serializedValue);
      this.props.setProperty(key, serializedValue);
    }
  }

  /**
   * Take what has been stored in `.map` and update the property store
   * @param {Boolean} [skipCache=true] - If true (the default), don't interact with the cache service for this call
   */
  persist (skipCache=true) {
    const build = {};
    for (const [key, value] of this.map) {
      build[key] = this.serializePass(value);
    }
    if (!skipCache) this.cache.putAll(build, this[_config_].expiry);
    this.props.setProperties(build);
  }

  /**
   * Retrieve the value stored at key, return `null` if not present
   * @param {String} key - The key of which to return
   * @param {Boolean} [skipCache=true] If true (the default), don't interact with the cache service for this call
   * @returns {any}
   */
  get (key, skipCache=true) {
    Enforce.positional(arguments, {key: '!string'});
    // avoid any calls at all
    if (this.map.has(key)) return this.map.get(key);

    let value;
    // see if it's in the cache
    if (!skipCache) {
      value = this.cache.get(key);
      if (value !== null) {
        // put in map and return
        this.map.set(key, value);
        return value;
      }
    }

    // let's see if it's in the properties
    value = this.props.getProperty(key);
    if (value === null || value === undefined) return null;  // always return null when not present (or undefined?)
    if (this[_config_].jsons) {
      value = Store.utils.deserialize(value, this[_config_].dates);
    }
    // put it in the cache and the store and return
    this.map.set(key, value);
    this.cache.put(key, value, this[_config_].expiry);
    return value;
  }

  /**
   * Returns the keys that have been stored externally in `Properties`
   * @return {String[]}
   */
  getKeys () {
    return this.props.getKeys();
  }

  /**
   * Iterates over `this.getKeys()` and returns each key in an object
   * @return {Object}
   */
  getAll () {
    const keys = this.getKeys();
    let properties = {};
    for (let key of keys) {
      properties[key] = this.get(key);
    }
    return properties;
  }

  /**
   * Calls `.setProperties` with properties after iterating through, serializing, and storing in local map
   * @param {Object} properties - object representing key/values
   * @param {Boolean} [skipCache=true] - If true (the default), don't interact with the cache service for this call
   */
  setProperties (properties, skipCache=true) {
    Enforce.positional(arguments, {properties: 'object'});
    // make a copy of properties
    const copied = {};
    for (let key of Object.keys(properties)) {
      this.map.set(key, properties[key]);
      !skipCache && this.cache.put(key, properties[key], this[_config_].expiry);
      if (this[_config_].jsons) {
        copied[key] = this.serializePass(properties[key]);
      } else {
        copied[key] = properties[key];
      }
    }
    this.props.setProperties(copied);
  }

  /**
   * @param {String} [key] - The key to remove
   * @throws {TypeError} if key is not a string
   */
  remove (key) {
    Enforce.positional(arguments, {key: '!string'});
    this.props.deleteProperty(key);
    this.cache.remove(key);
    this.map.delete(key);
  }

  /**
   * Removes keys and values from external stores. Since the cache requires a list of keys explicitely given, keys parameter is available to specific which ones to delete from the cache. The props are deleted in its entirety. The `keys` param probably only needs to be set in testing conditions.
   * @param {String[]} [keys=null] - The keys to remove from the cache (note that all keys are removed from properties, irregardless of the value of this parameter)
   */
  removeAll (keys=null) {
    Enforce.positional(arguments, {keys: 'array'});
    // cache service can only remove keys it is sent
    if (!keys) this.cache.removeAll(this.props.getKeys());
    else this.cache.removeAll(keys);
    this.props.deleteAllProperties();
  }
}

export const ObjectStore = {Store};
