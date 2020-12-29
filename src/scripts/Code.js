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

  static serialize(value) {
    // return JSON.stringify(value, Utils.dateReplacer);
    return JSON.stringify(value);
  }

  static deserialize(value, dates=true) {
    if (dates)
      return JSON.parse(value, Utils.dateReviver);
    return JSON.parse(value);
  }

}

class Values_ {

  constructor (guard='script', config) {
    this[_config_] = configure(config);
    guard = guard[0].toUpperCase() + guard.slice(1);
    this.props = PropertiesService[`get${guard}Properties`].call();
    this.cache = CacheService[`get${guard}Cache`].call();
    this.map = new Map();
  }

  static scriptStore (config={}) {
    return new Values_('script', config);
  }

  static documentStore (config={}) {
    return new Values_('document', config);
  }

  static userStore (config={}) {
    return new Values_('user', config);
  }

  static get utils () {
    // return serialiser who knows what to do with dates, if on
    return Utils;
  }

  serializePass (value) {
    if (this[_config_].jsons)
      return Values_.utils.serialize(value);
    return value;
  }

  /**
   * @param {String} key
   */
  set (key, origValue) {
    key = key.toString();  // cast to a string, otherwise might confuse things with integers
    let value = this.serializePass(origValue);
    if (typeof value !== 'string') throw TypeError("non-string passed, turn on jsons?");
    this.map.set(key, origValue);
    if (!this[_config_].manual) {
      this.cache.put(key, value);  // default value
      this.props.setProperty(key, value);
    }
  }

  /**
   * Take what has been stored locally and update the property store
   */
  persist (propsOnly=true) {
    const build = {};
    for (const [key, value] of this.map) {
      build[key] = this.serializePass(value);
    }
    if (!propsOnly) this.cache.putAll(build, this[_config_].expiry);
    this.props.setProperties(build);
  }

  get (key) {
    // avoid any calls at all
    if (this.map.has(key)) return this.map.get(key);

    let value;
    // see if it's in the cache
    value = this.cache.get(key);
    if (value !== null) {
      // put in map and return
      this.map.set(key, value);
      return value;
    }

    // let's see if it's in the properties
    value = this.props.getProperty(key);
    if (value === null || value === undefined) return null;  // always return null when not present (or undefined?)
    if (this[_config_].jsons) {
      value = Values_.utils.deserialize(value, this[_config_].dates);
    }
    // put it in the cache and the store and return
    this.map.set(key, value);
    this.cache.put(key, value, this[_config_].expiry);
    return value;
  }

  getKeys () {
    return this.props.getKeys();
  }

  getAll () {
    const keys = this.getKeys();
    let properties = {};
    for (let key of keys) {
      properties[key] = this.get(key);
    }
    return properties;
  }

  setProperties (properties) {
    // make a copy of properties
    const copied = {};
    for (let key of Object.keys(properties)) {
      this.map.set(key, properties[key]);
      this.cache.put(key, properties[key], this[_config_].expiry);
      if (this[_config_].jsons) {
        copied[key] = this.serializePass(properties[key]);
      } else {
        copied[key] = properties[key];
      }
    }
    this.props.setProperties(copied);
  }

  remove (key) {
    this.props.deleteProperty(key);
    this.cache.remove(key);
    this.map.delete(key);
  }

  removeAll (keys=null) {
    // cache service can only remove keys it is sent
    if (keys) this.cache.removeAll(this.props.getKeys());
    else this.cache.removeAll(keys);
    this.props.deleteAllProperties();
  }
}

function create (guard='script', config) {
  return new Values_(guard, config);
}

function import_ () {
  return Values_;
}
