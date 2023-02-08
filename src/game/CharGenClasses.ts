
export interface CharGenClassInterface {
  id: number;
  strings: {
    name: number,
    gender: number,
    description: number,
  },
  appearances: number[]
}

export const CharGenClasses: {[key: number]: CharGenClassInterface} = {
  0: {
    id: 2,
    strings: {
      name: 135,
      gender: 358,
      description: 32109
    },
    appearances: [136, 139, 142, 145, 148, 151, 154, 157, 160, 163, 166, 169, 172, 175, 178]
  },
  1: {
    id: 1,
    strings: {
      name: 133,
      gender: 358,
      description: 32110
    },
    appearances: [137, 140, 143, 146, 149, 152, 155, 158, 161, 164, 167, 170, 173, 175, 179]
  },
  2: {
    id: 0,
    strings: {
      name: 134,
      gender: 358,
      description: 32111
    },
    appearances: [138, 141, 144, 147, 150, 153, 156, 159, 162, 165, 168, 171, 174, 177, 180]
  },
  3: {
    id: 0,
    strings: {
      name: 134,
      gender: 359,
      description: 32111
    },
    appearances: [93, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135]
  },
  4: {
    id: 1,
    strings: {
      name: 133,
      gender: 359,
      description: 32110
    },
    appearances: [92, 95, 98, 101, 104, 107, 110, 113, 116, 119, 122, 125, 128, 131, 134]
  },
  5: {
    id: 2,
    strings: {
      name: 135,
      gender: 359,
      description: 32109
    },
    appearances: [91, 94, 97, 100, 103, 106, 109, 112, 115, 118, 121, 124, 127, 130, 133]
  }
};