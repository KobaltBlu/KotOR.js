// export {};

declare module 'jison' {
  export class JisonGenerator {
    constructor(grammar: any, options?: any)
    generate(): any;
    createParser(): any;
  }

  export class LR0Generator extends JisonGenerator {
    constructor(grammar: any, options?: any)
  }

  export class SLRGenerator extends JisonGenerator {
    constructor(grammar: any, options?: any)
  }

  export class LR1Generator extends JisonGenerator {
    constructor(grammar: any, options?: any)
  }

  export class LLGenerator extends JisonGenerator {
    constructor(grammar: any, options?: any)
  }

  export class LALRGenerator extends JisonGenerator {
    constructor(grammar: any, options?: any)
  }

  export class Jison {
    static Generator(grammar: any, options?: any):JisonGenerator;
    static Parser(grammer: any, options?: any): any;
  }

}
