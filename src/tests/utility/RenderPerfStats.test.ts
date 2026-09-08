import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { RenderPerfStats } from '@/utility/RenderPerfStats';

describe('RenderPerfStats phase buckets', () => {
  let renderer: {
    info: { autoReset: boolean; reset: () => void; render: { calls: number } };
    shadowMap: { render: (...args: any[]) => void };
  };

  beforeEach(() => {
    RenderPerfStats.enabled = true;
    (RenderPerfStats as any)._hooksInstalled = false;
    (RenderPerfStats as any)._origShadowRender = null;
    (RenderPerfStats as any)._renderer = null;
    (RenderPerfStats as any)._phase = 'none';

    let calls = 0;
    renderer = {
      info: {
        autoReset: true,
        reset: () => { calls = 0; },
        render: {
          get calls(){ return calls; },
          set calls(v: number){ calls = v; },
        },
      },
      shadowMap: {
        render: () => {
          calls += 5;
        },
      },
    };
  });

  afterEach(() => {
    RenderPerfStats.enabled = false;
  });

  test('buckets shadow vs world draws via beginPhase/endPhase', () => {
    RenderPerfStats.beginFrame(renderer as any);
    expect(renderer.info.autoReset).toBe(false);

    RenderPerfStats.beginPhase('shadow');
    renderer.info.render.calls = 12;
    RenderPerfStats.endPhase();

    RenderPerfStats.beginPhase('world');
    renderer.info.render.calls = 40;
    RenderPerfStats.endPhase();

    RenderPerfStats.beginPhase('gui');
    renderer.info.render.calls = 48;
    RenderPerfStats.endPhase();

    RenderPerfStats.endFrame();

    expect(RenderPerfStats.drawsShadow).toBe(12);
    expect(RenderPerfStats.drawsWorld).toBe(28);
    expect(RenderPerfStats.drawsGui).toBe(8);
    expect(RenderPerfStats.drawCalls).toBe(48);
  });

  test('shadowMap.render hook assigns shadow then resumes world', () => {
    RenderPerfStats.beginFrame(renderer as any);
    RenderPerfStats.beginPhase('world');
    renderer.info.render.calls = 3;

    renderer.shadowMap.render();
    renderer.info.render.calls = 20;
    RenderPerfStats.endPhase();
    RenderPerfStats.endFrame();

    expect(RenderPerfStats.drawsShadow).toBe(5);
    expect(RenderPerfStats.drawsWorld).toBeGreaterThanOrEqual(3);
  });
});
