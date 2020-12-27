# Object Store

Store any object so that it's available to you either immediately, from the cache, or in the properties service. 

```js
function myFunction () {
    const userStore = ObjectStore('user'); 
    const obj = {
        hi: 'hi',
        date: new Date()
        arr: [1, 2, 3]
    }
    userStore.set('key', obj);

    // when you do this:
    const value = userStore.get('key');
    // if it's still in memory, will return that
    // if not in memory, will consult the cache
    // if not in the cache, will look for it in the property store
    Logger.log(value);
}
```

## Get Started:

- Library ID: `1vAC2ffoTeBPU6SmGTEBsQuf-XP_Pv-XaTUCNHscyGmiJRCNHZhevGEz6`

## Why?

AppsScripters need a quick and easy way to keep objects hanging around, and to persist them across executions.

Using `PropertiesService` is great for persisting across executions, but is slow and has a quota. If you're storing objects, you'll need to parse them to use them first, making it even slower.

Using the `CacheService` is much faster but has a time limit, and you have to consult that first, before using PropertiesService. You'll also need to stringify those objects.

Keeping them locally in memory is fastest, and doesn't have to be stringified. However, once the execution stops, you'll have to persist them somehow, either in the cache or store.

This libray does all three, so you don't have to worry about it.

Bonus: It also handles dates correctly.

## Examples

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
