import { ILoaderProgress, LoaderProgressTracker, formatLoaderEta } from '@/apps/common/loader/LoaderProgress';

describe('LoaderProgressTracker', () => {
  it('begins with total and resets completed count', () => {
    const emissions: ILoaderProgress[] = [];
    const tracker = new LoaderProgressTracker((p) => emissions.push(p), 'Loading assets');

    tracker.begin(10, 'Loading assets');

    expect(emissions[0]).toEqual({
      message: 'Loading assets',
      completed: 0,
      total: 10,
    });
  });

  it('tracks item start and completion', () => {
    const emissions: ILoaderProgress[] = [];
    const tracker = new LoaderProgressTracker((p) => emissions.push(p));

    tracker.begin(2);
    tracker.itemStart('foo.2da');
    tracker.itemComplete();

    expect(emissions[emissions.length - 1]).toEqual({
      message: 'Loading...',
      currentAsset: 'foo.2da',
      completed: 1,
      total: 2,
    });
  });

  it('adds to total without changing completed', () => {
    const emissions: ILoaderProgress[] = [];
    const tracker = new LoaderProgressTracker((p) => emissions.push(p));

    tracker.begin(1);
    tracker.itemComplete();
    tracker.addTotal(3);

    expect(emissions[emissions.length - 1]).toEqual({
      message: 'Loading...',
      completed: 1,
      total: 4,
    });
  });

  it('updates message via setMessage without changing counts', () => {
    const emissions: ILoaderProgress[] = [];
    const tracker = new LoaderProgressTracker((p) => emissions.push(p), 'Phase one');

    tracker.begin(5);
    tracker.setMessage('Loading BIFs');

    expect(emissions[emissions.length - 1]).toEqual({
      message: 'Loading BIFs',
      completed: 0,
      total: 5,
    });
  });
});

describe('formatLoaderEta', () => {
  it('returns Almost done for short remaining times', () => {
    expect(formatLoaderEta(3)).toBe('Almost done');
  });

  it('formats seconds and minutes', () => {
    expect(formatLoaderEta(45)).toBe('45s remaining');
    expect(formatLoaderEta(125)).toBe('2m 5s remaining');
  });

  it('formats hours', () => {
    expect(formatLoaderEta(3665)).toBe('1h 1m remaining');
  });

  it('returns empty string for invalid input', () => {
    expect(formatLoaderEta(Number.NaN)).toBe('');
    expect(formatLoaderEta(-1)).toBe('');
  });
});
