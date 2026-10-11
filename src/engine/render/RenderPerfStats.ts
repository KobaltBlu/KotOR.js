/**
 * Lightweight, toggleable render counters for Spector-comparable baselines.
 * Enable with `?perf=1` (or `RenderPerfStats.enabled = true`).
 *
 * Draw buckets use `renderer.info` with `autoReset = false` for one frame and
 * optional hooks on `shadowMap.render` / composer passes so totals are honest
 * after EffectComposer (which otherwise leaves `info.render.calls` near 1).
 */
export class RenderPerfStats {
  static enabled = false;

  static shadowRedraw = false;
  static shadowUpdateReason = '';
  static boneTextureUploads = 0;
  static minimapRtt = 0;
  static guiEmptyDrawsSkipped = 0;
  /** Total GL draws this frame (all phases). */
  static drawCalls = 0;
  static drawsShadow = 0;
  static drawsWorld = 0;
  static drawsGui = 0;
  static drawsPost = 0;
  static drawsDepthPre = 0;
  static programChanges = 0;
  static casterDrawCount = 0;
  /** Soft-depth blitFramebuffer failures this frame (MeshDepthMaterial fallback). */
  static softDepthBlitFails = 0;

  // --- Animation evaluation counters (opt-in via enabled / ?perf=1) ---
  static animActiveRuns = 0;
  static animBoundNodesVisited = 0;
  static animControllerSamples = 0;
  static animConstantSamples = 0;
  static animBinarySearchFallbacks = 0;
  static animTransformWrites = 0;
  static animUnchangedTransforms = 0;
  static animDirtyNodes = 0;
  static animLocalMatrixUpdates = 0;
  static animSkeletonInvalidations = 0;
  static animCpuMs = 0;
  static animMatrixFlushMs = 0;
  static shadowAnimatedCasterHits = 0;

  private static _frame = 0;
  private static _lastProgramId = -1;
  private static _hooksInstalled = false;
  private static _phase: 'shadow' | 'world' | 'gui' | 'post' | 'depthPre' | 'none' = 'none';
  private static _callsAtPhaseStart = 0;
  private static _renderer: {
    info: { autoReset: boolean; reset: () => void; render: { calls: number } };
    shadowMap?: { render: (...args: any[]) => void };
    render?: (...args: any[]) => void;
  } | null = null;
  private static _prevAutoReset = true;
  private static _origShadowRender: ((...args: any[]) => void) | null = null;

  static initFromUrl(): void {
    try {
      if(typeof location !== 'undefined' && /[?&]perf=1(?:&|$)/.test(location.search)){
        this.enabled = true;
      }
    }catch(_e){
      // non-browser
    }
  }

  /** Install once on the game WebGLRenderer (safe to call every frame). */
  static ensureHooks(renderer: {
    info: { autoReset: boolean; reset: () => void; render: { calls: number } };
    shadowMap?: { render: (...args: any[]) => void };
  } | null | undefined): void {
    if(!renderer || this._hooksInstalled){ return; }
    this._renderer = renderer;
    if(renderer.shadowMap && typeof renderer.shadowMap.render === 'function'){
      this._origShadowRender = renderer.shadowMap.render.bind(renderer.shadowMap);
      renderer.shadowMap.render = (...args: any[]) => {
        if(this.enabled){
          this.endPhase();
          this.beginPhase('shadow');
        }
        const ret = this._origShadowRender!(...args);
        if(this.enabled){
          this.endPhase();
          this.beginPhase('world');
        }
        return ret;
      };
    }
    this._hooksInstalled = true;
  }

  /** Call at the start of each rendered frame. */
  static beginFrame(renderer?: {
    info: { autoReset: boolean; reset: () => void; render: { calls: number } };
    shadowMap?: { render: (...args: any[]) => void };
  } | null): void {
    if(!this.enabled){ return; }
    if(renderer){
      this.ensureHooks(renderer);
      this._renderer = renderer;
      this._prevAutoReset = renderer.info.autoReset;
      renderer.info.autoReset = false;
      renderer.info.reset();
    }
    this._frame++;
    this.shadowRedraw = false;
    this.shadowUpdateReason = '';
    this.boneTextureUploads = 0;
    this.minimapRtt = 0;
    this.guiEmptyDrawsSkipped = 0;
    this.drawCalls = 0;
    this.drawsShadow = 0;
    this.drawsWorld = 0;
    this.drawsGui = 0;
    this.drawsPost = 0;
    this.drawsDepthPre = 0;
    this.programChanges = 0;
    this.casterDrawCount = 0;
    this.softDepthBlitFails = 0;
    this.animActiveRuns = 0;
    this.animBoundNodesVisited = 0;
    this.animControllerSamples = 0;
    this.animConstantSamples = 0;
    this.animBinarySearchFallbacks = 0;
    this.animTransformWrites = 0;
    this.animUnchangedTransforms = 0;
    this.animDirtyNodes = 0;
    this.animLocalMatrixUpdates = 0;
    this.animSkeletonInvalidations = 0;
    this.animCpuMs = 0;
    this.animMatrixFlushMs = 0;
    this.shadowAnimatedCasterHits = 0;
    this._lastProgramId = -1;
    this._phase = 'none';
    this._callsAtPhaseStart = this.currentCalls();
  }

  static beginPhase(phase: 'shadow' | 'world' | 'gui' | 'post' | 'depthPre'): void {
    if(!this.enabled){ return; }
    this.endPhase();
    this._phase = phase;
    this._callsAtPhaseStart = this.currentCalls();
  }

  static endPhase(): void {
    if(!this.enabled || this._phase === 'none'){ return; }
    const delta = Math.max(0, this.currentCalls() - this._callsAtPhaseStart);
    switch(this._phase){
      case 'shadow': this.drawsShadow += delta; break;
      case 'world': this.drawsWorld += delta; break;
      case 'gui': this.drawsGui += delta; break;
      case 'post': this.drawsPost += delta; break;
      case 'depthPre': this.drawsDepthPre += delta; break;
    }
    this._phase = 'none';
    this._callsAtPhaseStart = this.currentCalls();
  }

  /** Finalize frame totals after composer. */
  static endFrame(): void {
    if(!this.enabled){ return; }
    this.endPhase();
    const infoCalls = this.currentCalls();
    this.drawCalls = infoCalls > 0
      ? infoCalls
      : (this.drawsShadow + this.drawsWorld + this.drawsGui + this.drawsPost + this.drawsDepthPre);
    if(this._renderer){
      this._renderer.info.autoReset = this._prevAutoReset;
    }
  }

  private static currentCalls(): number {
    return this._renderer?.info?.render?.calls | 0;
  }

  static noteShadowRedraw(reason: string): void {
    if(!this.enabled){ return; }
    this.shadowRedraw = true;
    this.shadowUpdateReason = reason || '';
  }

  static noteBoneTextureUpload(): void {
    if(!this.enabled){ return; }
    this.boneTextureUploads++;
  }

  static noteMinimapRtt(): void {
    if(!this.enabled){ return; }
    this.minimapRtt++;
  }

  static noteGuiEmptyDrawSkipped(): void {
    if(!this.enabled){ return; }
    this.guiEmptyDrawsSkipped++;
  }

  static noteDraw(programId?: number): void {
    if(!this.enabled){ return; }
    this.drawCalls++;
    if(typeof programId === 'number' && programId !== this._lastProgramId){
      this.programChanges++;
      this._lastProgramId = programId;
    }
  }

  static noteCasterDraws(count: number): void {
    if(!this.enabled){ return; }
    this.casterDrawCount = count;
  }

  static noteSoftDepthBlitFail(): void {
    if(!this.enabled){ return; }
    this.softDepthBlitFails++;
  }

  static noteShadowAnimatedCaster(): void {
    if(!this.enabled){ return; }
    this.shadowAnimatedCasterHits++;
  }

  static snapshot(): string {
    return [
      `frame=${this._frame}`,
      `shadow=${this.shadowRedraw ? 1 : 0}(${this.shadowUpdateReason || '-'})`,
      `bones=${this.boneTextureUploads}`,
      `minimap=${this.minimapRtt}`,
      `draws=${this.drawCalls}`,
      `sh=${this.drawsShadow}`,
      `world=${this.drawsWorld}`,
      `gui=${this.drawsGui}`,
      `post=${this.drawsPost}`,
      `depthPre=${this.drawsDepthPre}`,
      `programs=${this.programChanges}`,
      `casters=${this.casterDrawCount}`,
      `guiSkip=${this.guiEmptyDrawsSkipped}`,
      `softBlitFail=${this.softDepthBlitFails}`,
      `animRuns=${this.animActiveRuns}`,
      `animNodes=${this.animBoundNodesVisited}`,
      `animSamples=${this.animControllerSamples}`,
      `animConst=${this.animConstantSamples}`,
      `animBin=${this.animBinarySearchFallbacks}`,
      `animWrites=${this.animTransformWrites}`,
      `animUnch=${this.animUnchangedTransforms}`,
      `animDirty=${this.animDirtyNodes}`,
      `animMtx=${this.animLocalMatrixUpdates}`,
      `animSkel=${this.animSkeletonInvalidations}`,
      `animMs=${this.animCpuMs.toFixed(2)}`,
      `flushMs=${this.animMatrixFlushMs.toFixed(2)}`,
      `animCaster=${this.shadowAnimatedCasterHits}`,
    ].join(' ');
  }

  /** Log once per N frames when enabled. */
  static maybeLog(everyN = 60): void {
    if(!this.enabled || this._frame % everyN !== 0){ return; }
    console.info('[RenderPerf]', this.snapshot());
  }
}

RenderPerfStats.initFromUrl();
