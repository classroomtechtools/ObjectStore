# Object Store

A key/value store in AppsScripts that stores values and objects locally in memory, and writes to the `CacheService` and `PropertiesService` for reliable persistance.

It operates in two modes, auto or manual, the latter of which gives you control of when objects are persisted.

```js
// "global" stores, choose from 'script', 'document' or 'user'
const autoStore = ObjectStore.create();  // 'script by default'
const manualStore = ObjectStore.create('script', {manual: true});

function autopersist () {   
    // persisted now:
    autoStore.set('key', {value: 'value'});  
    ... // on next execution
    const value = autoStore.get('key');
}

function manuallypersist () {
    const dataArray = [ {idx: 1, d: 'd'}, ... ];
    for (const item of dataArray) {
        // keys must be strings (throws error if not):
        const key = item.idx.toString();  
        // does not persist in PropertiesStorage yet:
        manualStore.set(key, item);  
    }
    // manually tell it to persist, more performant
    manualStore.persist(); 
}
```

## Get Started:

- Library ID: `1vAC2ffoTeBPU6SmGTEBsQuf-XP_Pv-XaTUCNHscyGmiJRCNHZhevGEz6`
- [Documentation](https://classroomtechtools.github.io/ObjectStore)

## How it works

A key/value store is just nomenclature where you have some sort of identifier (usually a string) that coorrelates to a value or object. JavaScript Objects can be a key/value store, and so are the `Properties` and `Cache` objects.

In V8 JavaScript, the new datastructure `Map` is also a key/value store, and is used internally by this library to store objects natively. When it persists, it writes to the `PropertiesService` service.

## Why?

AppsScripters need a quick and easy way to keep objects hanging around, and to persist them across executions. There are services available but using them effectively is a well-worn problem. Why not solve it once-and-for-all?

Using `PropertiesService` is great for persisting across executions, but is slow and has a quota. If you're storing objects, you'll need to parse them to use them first, making it even slower.

Using the `CacheService` is much faster but has a time limit, and you have to consult that first, before using PropertiesService. You'll also need to stringify those objects.

Keeping them locally in memory is fastest, and doesn't have to be stringified. However, once the execution stops, you'll have to persist them somehow, either in the cache or store.

This libray does all three, so you don't have to worry about it.

## Examples

This illustrates the basic methods and properties:

```js
const store = ObjectStore();  // by default uses script

// store an item, can even be a date
store.set('key', {});
store.set('key', new Date());

// get them back
store.get('key');

//delete them
store.remove('key');

// access the internals:
store.cache;  // instance of Cache
store.props;  // instance of Properites
store.map;  // instance of Map object
```

This is how you use it to manually tell it to persist:

```js
// turn on manual mode
const store = ObjectStore.create('script', {manual: true});

// store a bunch of objects
const arr = [{a:'a'}, {b: 'b'} ...];
arr.forEach(function (item, index) {
    store.set(index.toString(), item);
});

// persist after the loop:
store.persist();
```

## Performance Note

With only 10 items in the array, persisting it manually rather than in the each time through a loop is compared with the following code:

```js
function speedtest() {
  const props = PropertiesService.getScriptProperties();
  [null, false, true].forEach( manual => {
    const max = 10;
    const arr = Array.from(Array(max).keys());
    const store = create('script', {manual});  // just save to local
    store.removeAll(arr);   // resets it from previous call
    const start = new Date().getTime();
    
    arr.map(item => (max - item).toString())
      .forEach( (num, idx) => {
        const item = {idx, a: num, date: new Date()};
        if (manual == null) 
            props.setProperty(num, JSON.stringify(item));
        else
            store.set(num, item, skipCache=true);
      });
    
    if (manual) 
      store.persist();  // now save

    const end = new Date().getTime();
    Logger.log(manual + ': ' + ((end - start) / 1000) + ' seconds');
  });
}
```

Result:

```
For max = 10:
    null: 1.049 seconds     # Calling PropertiesService directly 
    false: 1.041 seconds    # In auto mode (persisting during loop)
    true: 0.068 seconds     # In manual mode (persisting after loop)

For max = 100:
    null: 9.269 seconds
    false: 6.476 seconds
    true: 0.072 seconds

For max = 1000:
    null: 68.854 seconds
    false: 68.777 seconds
    true: 0.139 seconds
```

Note that `skipCache` was set to `true` in calls to `set` in order to present a more reliable metric of comparison.

Conclusion: There could be substantial performance benefit to using this library in manual mode.
