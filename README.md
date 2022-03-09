# @wonderlandlabs/malt

Malt is an alternate delivery mechanic for Mirror. Synchronizing content between multiple version updates 
of nested Mirrors was proving difficult so another system as been developed. 

# Leafs

A leaf is a transactional value wrapper. It can function solo, or in a network of linked leaves.
Branches are added to leaves in one of the following methods: 

Only Leaf instances whose value is an object, Map or array can have branches. Branches are not 
automatic - not all of an objects' or Map's properties are managed with branches.

To create a Branch on a leaf you must define the leaf in either

1. **configuration:** calling leaf with a branches property in the second argument:

```javascript

const point = new Leaf({
  w: 0,
  x: 0,
},
  {
    branches: {
      x: new Leaf(1),
      y: 2,
      z: 3;
    }
  })

console.log('leaf value:', point.value);
// 'leaf value: ', {: 0, x: 1, y: 2: z: 3}

leaf.branch('y').next(4);

console.log('leaf value changed:', point.value);
// 'leaf value changed: ', {: 0, x: 1, y: 4: z: 3}

```

2. **dynamic:** you can call `myLeaf.branch(name, new Leaf(..))` to add a branch to
   the leaf. `myLeaf.branch(name, value)` will also work initializing a basic leaf.
   `myLeaf.branch(name)` or `myLeaf.branch(name, newBranchOrValue)` both return the branch itself. 

The value of sub-branches is you can localize validators or actions to affect sub-parts of the 
leaf. This is how you achieve the reducer pattern with Malt. 

Leaf can branch indefinately; as long as a branch is of type object/Map/array, it can have sub-branches applied to it.

## Actions

Leaf actions allow you to achieve more complex change patterns. They are functions, and can return values. 
Leaf actions are accessed off a `.$do` collection.

### Implicit (inferred) setter actions

Map and object types will have a set[field] function for every key/property in the initial value, and every branch.

```javascript

const point = new Leaf({x: 0, y: 0, z: 0});

point.$do.setX(3);

console.log('point is now', point.value);
// 'point is now', {x: 3, y: 0, z: 0}

```

You can also define custom actions. These actions can act on the leaf (the implicit first value)
and/or return a value. No matter how many changes you execute inside an action, only one change will
be emitted to subscribers (see below).

```javascript

const point = new Leaf(
  { x: 0, y: 0, z: 0 },
  {
     actions: {
        addTo: (leaf, x, y, z) => {
           leaf.$do.setX(leaf.value.x + x);
           leaf.$do.setY(leaf.value.y + y);
           leaf.$do.setZ(leaf.value.z + z);
        },
        length(leaf) {
           return Math.sqrt(
                   leaf.value.x ** 2 + leaf.value.y ** 2 + leaf.value.z ** 2
           );
        },
     },
  }
);

leaf.$do.addTo(3, 6, 9);
leaf.$do.addTo(1, 1, 1);

console.log('leaf is now', leaf.value);
// 'leaf is now', {x: 4, y: 7, z: 10);
console.log('length', leaf.$do.length());
// 'length', 12.84523257866513

```

### `subscribe(listener)`

Leaves follow the observable pattern of RxJS; it has the following methids/properties:

* **subscribe(listener)**
* **next(value)**
* **complete()**

`subscribe(listener)` delegates to a BehaviorSubject() instance that gets updated every time
a transaction finishes in which changes have been made. This can ge because of a set action,
a next() call, etc. 

It returns a subscriber that can of course be `.unsubscribe()`d. 

Subscription is the best way to observe changes to a Leaf. your listener can ber a function 
or an object dictionary of functions, `{next(value), error(err), complete()}`. 

### options

The second property of Leaf can be an object with any/all/none of these properties:

* **name** - an identifier for the leaf. set/overridden for Leaf 
  instances made/passed into `.branch(name, value)`
* **test** - a function that, if it returns anything, will block the updating of a Leaf. 
* **actions** - an object of name/function accessible off the `.$do` object property of your Leaf.
* **branches** - an object of name/branch values(or Leaf instances). Note, even if your Leaf
  is a Map, your Branches can be defined by an object. 
* **debug** - a boolean that if true, will echo extended data; used to develop Leaf code. 

You can set/extend these values post-creation by calling `.config(opts)` to, say, add
some actions or branches to a Leaf instance at any time. 