export type ColorRGB = {
  r: number;
  g: number;
  b: number;
};

export class IndoorLocalizedString {
  stringref: number;
  substrings: Map<number, string>;

  constructor(stringref: number = -1, substrings?: Map<number, string> | Record<number, string>) {
    this.stringref = stringref;
    this.substrings = new Map<number, string>();
    if (substrings) {
      if (substrings instanceof Map) {
        substrings.forEach((value, key) => this.substrings.set(Number(key), value));
      } else {
        Object.entries(substrings).forEach(([key, value]) => {
          this.substrings.set(Number(key), value);
        });
      }
    }
  }

  static fromEnglish(text: string): IndoorLocalizedString {
    const loc = new IndoorLocalizedString(-1);
    loc.setData(0, 0, text);
    return loc;
  }

  static substringId(language: number, gender: number): number {
    return (language * 2) + gender;
  }

  static substringPair(substringId: number | string): [number, number] {
    const id = Number(substringId);
    return [Math.floor(id / 2), id % 2];
  }

  setData(language: number, gender: number, text: string): void {
    this.substrings.set(IndoorLocalizedString.substringId(language, gender), text);
  }

  setString(substringId: number | string, text: string): void {
    const id = Number(substringId);
    this.substrings.set(id, text);
  }

  toJson(): Record<string, string | number> {
    const data: Record<string, string | number> = { stringref: this.stringref };
    this.substrings.forEach((value, key) => {
      data[String(key)] = value;
    });
    return data;
  }

  static fromJson(data: Record<string, unknown>): IndoorLocalizedString {
    const loc = new IndoorLocalizedString(Number(data.stringref ?? -1));
    Object.entries(data).forEach(([key, value]) => {
      if (key === "stringref") return;
      if (!Number.isNaN(Number(key)) && typeof value === "string") {
        loc.setString(Number(key), value);
      }
    });
    return loc;
  }
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};
