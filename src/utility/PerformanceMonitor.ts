
/**
 * Represents a single performance monitoring event with timing data.
 * 
 * This class tracks the start and end times of a performance event,
 * calculates the duration, and provides formatted string output.
 * 
 * @class PerformanceMonitorEvent
 */
class PerformanceMonitorEvent {
  /** The name identifier for this performance event */
  name: string;
  /** The start time of the event in milliseconds (from performance.now()) */
  startTime: number;
  /** The end time of the event in milliseconds (from performance.now()) */
  endTime: number;
  /** The calculated duration of the event in milliseconds */
  duration: number;
  
  /**
   * Creates a new PerformanceMonitorEvent instance.
   * 
   * @param {string} name - The name identifier for this performance event.
   */
  constructor(name: string){
    this.name = name;
  }

  /**
   * Starts timing the performance event.
   * 
   * Records the current time as the start time and resets the end time
   * and duration to zero. This should be called before the operation
   * you want to measure begins.
   * 
   * @returns {void}
   * 
   * @example
   * const event = new PerformanceMonitorEvent('database_query');
   * event.start();
   * // ... perform database operation ...
   * event.stop();
   */
  start(){
    this.startTime = performance.now();
    this.endTime = 0;
    this.duration = 0;
  }

  /**
   * Stops timing the performance event and calculates the duration.
   * 
   * Records the current time as the end time and calculates the duration
   * by subtracting the start time from the end time. This should be
   * called after the operation you want to measure completes.
   * 
   * @returns {void}
   * 
   * @example
   * const event = new PerformanceMonitorEvent('database_query');
   * event.start();
   * // ... perform database operation ...
   * event.stop();
   * console.log(event.duration); // Duration in milliseconds
   */
  stop(){
    this.endTime = performance.now();
    this.duration = this.endTime - this.startTime;
  }

  /**
   * Returns a formatted string representation of the performance event.
   * 
   * The duration is displayed in milliseconds if less than 1000ms,
   * otherwise it's displayed in seconds with 2 decimal places.
   * 
   * @returns {string} A formatted string showing the event name and duration.
   * 
   * @example
   * const event = new PerformanceMonitorEvent('database_query');
   * event.start();
   * // ... perform operation ...
   * event.stop();
   * console.log(event.toString()); // "database_query: 150ms"
   */
  toString(){
    const duration = this.duration < 1000 ? `${this.duration}ms` : `${(this.duration / 1000).toFixed(2)}s`;
    return `${this.name}: ${duration}`;
  }
}

/**
 * A static utility class for monitoring and tracking performance events.
 * 
 * This class provides a centralized way to measure the performance of
 * various operations throughout the application. It maintains a collection
 * of performance events and provides methods to start, stop, and retrieve
 * timing information.
 * 
 * @class PerformanceMonitor
 * 
 * @example
 * // Start timing an operation
 * PerformanceMonitor.start('module_loading');
 * 
 * // ... perform some operation ...
 * 
 * // Stop timing and record the duration
 * PerformanceMonitor.stop('module_loading');
 * 
 * // Get a formatted report of all performance events
 * console.log(PerformanceMonitor.toString());
 */
export class PerformanceMonitor {
  
  /** Private map storing all performance events by name */
  static #events: Map<string, PerformanceMonitorEvent> = new Map();

  /** ANSI color helpers for terminal output */
  private static readonly ANSI = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m"
  } as const;

  /** Formats a duration in ms to a human-friendly string */
  private static formatDuration(ms: number): string {
    if(ms < 1000){ return `${Math.round(ms)}ms`; }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Starts timing a performance event with the given name.
   * 
   * If an event with the same name already exists, it will be reused.
   * If no event exists, a new one will be created. This method should
   * be called before the operation you want to measure begins.
   * 
   * @static
   * @param {string} name - The unique name identifier for the performance event.
   * @returns {void}
   * 
   * @example
   * PerformanceMonitor.start('texture_loading');
   * // ... load textures ...
   * PerformanceMonitor.stop('texture_loading');
   */
  static start(name: string){
    const ev = this.#events.has(name) ? this.#events.get(name) : new PerformanceMonitorEvent(name);
    ev.start();
    this.#events.set(name, ev);
  }
  
  /**
   * Stops timing a performance event and records the duration.
   * 
   * This method should be called after the operation you want to measure
   * completes. If no event with the given name exists, this method does nothing.
   * 
   * @static
   * @param {string} name - The name of the performance event to stop.
   * @returns {void}
   * 
   * @example
   * PerformanceMonitor.start('database_query');
   * // ... perform database operation ...
   * PerformanceMonitor.stop('database_query');
   */
  static stop(name: string){
    const ev = this.#events.get(name);
    if(!ev){ return; }
    ev.stop();
  }
  
  /**
   * Returns a formatted string report of all performance events.
   * 
   * The events are sorted by duration in descending order (longest first),
   * making it easy to identify the most time-consuming operations. Each
   * event is displayed with its name and duration in a human-readable format.
   * 
   * @static
   * @returns {string} A formatted string containing all performance events sorted by duration.
   * 
   * @example
   * PerformanceMonitor.start('operation1');
   * PerformanceMonitor.start('operation2');
   * // ... perform operations ...
   * PerformanceMonitor.stop('operation1');
   * PerformanceMonitor.stop('operation2');
   * 
   * console.log(PerformanceMonitor.toString());
   * // Output:
   * // operation2: 250ms
   * // operation1: 150ms
   */
  static toString(){
    const events = Array.from(this.#events.values()).sort((a, b) => b.duration - a.duration);
    if(events.length === 0){ return "(no performance events)"; }

    const total = events.reduce((sum, ev) => sum + (ev.duration || 0), 0);
    const nameWidth = Math.max(10, ...events.map(e => e.name.length));
    const barWidth = 20;

    const { ANSI } = this;

    const header = `${ANSI.cyan}${ANSI.bold}Performance Monitor${ANSI.reset}`;
    const columns = `${ANSI.dim}${"Name".padEnd(nameWidth)}  Duration   %     Bar${ANSI.reset}`;
    const divider = `${ANSI.gray}${"-".repeat(nameWidth)}  --------  -----  ${"-".repeat(barWidth)}${ANSI.reset}`;

    const lines = events.map(ev => {
      const pct = total > 0 ? (ev.duration / total) * 100 : 0;
      const barLen = Math.max(0, Math.min(barWidth, Math.round((pct / 100) * barWidth)));
      const durationStr = this.formatDuration(ev.duration);
      const color = ev.duration >= 500 ? ANSI.red : ev.duration >= 200 ? ANSI.yellow : ANSI.green;
      const nameCol = `${color}${ev.name.padEnd(nameWidth)}${ANSI.reset}`;
      const durCol = `${ANSI.bold}${durationStr.padStart(9)}${ANSI.reset}`;
      const pctCol = `${ANSI.dim}${pct.toFixed(1).padStart(5)}%${ANSI.reset}`;
      const bar = `${color}[${"#".repeat(barLen).padEnd(barWidth, " ")}]${ANSI.reset}`;
      return `${nameCol}  ${durCol}  ${pctCol}  ${bar}`;
    });

    const summary = `${ANSI.dim}Total: ${events.length} events, ${this.formatDuration(total)}${ANSI.reset}`;

    return [header, columns, divider, ...lines, divider, summary].join('\n');
  }
}