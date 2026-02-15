import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

type ScoreFunctionType<T> = (node: T) => number;

//https://github.com/bgrins/javascript-astar
export class BinaryHeap<T> {
  content: T[];
  scoreFunction: ScoreFunctionType<T>;

  constructor(scoreFunction: ScoreFunctionType<T>) {
    log.trace('BinaryHeap constructor');
    this.content = [];
    this.scoreFunction = scoreFunction;
  }

  push(element: T) {
    log.trace('BinaryHeap.push', this.content.length);
    this.content.push(element);
    this.sinkDown(this.content.length - 1);
  }

  pop(): T | undefined {
    log.trace('BinaryHeap.pop', this.content.length);
    const result = this.content[0];
    const end = this.content.pop();
    if (this.content.length > 0 && end !== undefined) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  }

  remove(node: T) {
    log.trace('BinaryHeap.remove', this.content.length);
    const i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    const end = this.content.pop();

    if (i !== this.content.length - 1 && end !== undefined) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  }

  size() {
    return this.content.length;
  }

  rescoreElement(node: T) {
    log.trace('BinaryHeap.rescoreElement');
    this.sinkDown(this.content.indexOf(node));
  }

  sinkDown(n: number) {
    log.trace('BinaryHeap.sinkDown', n);
    // Fetch the element that has to be sunk.
    const element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      const parentN = ((n + 1) >> 1) - 1;
      const parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  }

  bubbleUp(n: number) {
    log.trace('BinaryHeap.bubbleUp', n);
    const length = this.content.length;
    const element = this.content[n];
    const elemScore = this.scoreFunction(element);

    // eslint-disable-next-line no-constant-condition -- heap bubbleUp loop
    while (true) {
      // Compute the indices of the child elements.
      const child2N = (n + 1) << 1;
      const child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      let swap: number | null = null;
      let child1Score: number = elemScore;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        const child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }

}
