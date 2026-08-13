# Stale State in a `requestAnimationFrame` Render Loop

Note from Kay: this is claudes Ecplanation for how to setuo the render loop so the closure does not only capture the first state value

## The diagnosis

- **Every render creates a new closure.** Render 0's arrow function closes over `count === 0`, render 1's over `count === 1`. Neither can see the other's value. This is correct behavior, not the bug.
- **`requestAnimationFrame` captures a function *reference* at schedule time.** Recreating the function in a later render does nothing to what is already queued — nothing goes back and swaps it out.
- **The real problem is which closure reschedules itself.** In the typical setup, the identifier `loop` inside render 0's `loop` resolves to render 0's binding, so render 0's closure reschedules *itself* forever. React keeps creating fresh `loop` functions on every render; nothing ever schedules them, and they are immediately garbage collected.

```jsx
const loop = useCallback(() => {
  console.log(count);
  requestAnimationFrame(loop); // the `loop` const from *this* render
}, [count]);

useEffect(() => {
  requestAnimationFrame(loop);
}, []); // only ever schedules render 0's loop
```

### Common second bug stacked on top

If the state update happens inside the callback as `setCount(count + 1)`, the stale `count` is always `0`, so you always set `1`. After the first update React bails out on `Object.is` equality and stops rerendering entirely.

## The fix: stable loop, callback read through a ref

```jsx
function useAnimationFrame(callback) {
  const cbRef = useRef(callback);

  // no dep array — runs after *every* render, so the box always holds the newest closure
  // useLayoutEffect, not useEffect: see "Timing" below
  useLayoutEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    let id;
    const tick = (time) => {
      cbRef.current(time);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []); // loop starts once, never torn down mid-animation
}
```

```jsx
useAnimationFrame(() => {
  console.log(count); // current value, every frame
});
```

- `tick` is a single function object created once, so the self-rescheduling chain is stable.
- The *behavior* it invokes is looked up fresh each frame through the ref.
- No `useCallback` needed on the caller's side — memoizing is pointless when the callback is read through a ref anyway.

### Timing: `useLayoutEffect` over `useEffect` for the ref write

Passive effects flush asynchronously, so a rAF callback can fire in the window after paint but before React has written the new callback into the ref — giving you one frame running the previous render's closure. `useLayoutEffect` runs synchronously during commit and closes that gap. Rarely visible, but free to get right.

### Alternative that works but is worse

Putting `loop` in the effect's dep array so the effect restarts on every change technically works, but it tears down and rebuilds the rAF chain on every state update, which can drop frames and makes cleanup ordering fiddly.

## Related habits

- **Functional updates.** If the callback derives new state from old, `setCount(c => c + 1)` sidesteps staleness for that specific case with none of the above machinery.
- **Keep per-frame values out of React state.** Animation data (position, elapsed time, physics) belongs in a `useRef` mutated by the loop, which avoids 60 rerenders per second. Reserve `useState` for values that must reach the DOM through React, and update those on a coarser cadence — or write directly to `element.style` / a canvas from the loop.

## Performance notes

- **`tick` is created once, not per frame.** Empty dep array; one function object reschedules itself forever.
- **The user callback is recreated per *render*, not per frame.** With per-frame data kept out of state, that's a handful of renders total.
- **Even per-frame closure allocation would be negligible.** A closure is a small nursery allocation, and scavenge collection of short-lived objects is close to free in V8. 60 allocations/sec doesn't register. Per-frame allocation only matters at volume — e.g. a vector object per entity per frame across thousands of entities, which shows up as minor-GC sawtooth. The fix there is object pooling and mutating in place.
- **The one real micro-cost is the indirection.** `cbRef.current(time)` is a property load plus a call through a function identity that changes every render, so that call site never gets a stable inline cache. Once per frame this is nanoseconds. It would matter inside a loop over 10,000 particles — there, hoist the deref out of the loop, or don't use this pattern on the inner hot path.