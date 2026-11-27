export class GameObjectInitFinalizer {
  static finalize(
    target: { initialized: boolean },
    options: {
      needsRegister: boolean;
      register?: () => void;
    },
  ): void {
    if(options.needsRegister && options.register){
      options.register();
    }
    target.initialized = true;
  }
}
