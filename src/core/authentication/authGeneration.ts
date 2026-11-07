// Invalidates asynchronous work when the browser identity changes.
let generation = 0;
export const getAuthGeneration = () => generation;
export const advanceAuthGeneration = () => ++generation;
