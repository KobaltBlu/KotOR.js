export const PazaakConfig = {
  name: "Pazaak",
  textures: [
    {
      name: "Card Back",
      file: "pcards_back_p"
    },
    {
      name: "Card Hilight",
      file: "pcards_hilite_p"
    },
    {
      name: "Card Drawn",
      file: "pcards_generic_p"
    },
    {
      name: "Card Positive",
      file: "pcards_pos_p"
    },
    {
      name: "Card Negative",
      file: "pcards_neg_p"
    },
    {
      name: "Card Reversible Positive",
      file: "pcards_dblpos_p"
    },
    {
      name: "Card Reversible Negative",
      file: "pcards_dblneg_p"
    },
    {
      name: "Card Gold",
      file: "pcards_gold_p"
    }
  ],
  data: {
    rounds: 3,
    mainDeckCards: [
      {
        name: "Base 1",
        modifier: [1, 0],
        modifierLabel: '1',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Base 2",
        modifier: [2, 0],
        modifierLabel: '2',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Base 3",
        modifier: [3, 0],
        modifierLabel: '3',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Base 4",
        modifier: [4, 0],
        modifierLabel: '4',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },  
      {
        name: "Base 5",
        modifier: [5, 0],
        modifierLabel: '5',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Base 6",
        modifier: [6, 0],
        modifierLabel: '6',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Base 7",
        modifier: [7, 0],
        modifierLabel: '7',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      }, 
      {
        name: "Base 8",
        modifier: [8, 0],
        modifierLabel: '8',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Base 9",
        modifier: [9, 0],
        modifierLabel: '9',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Base 10",
        modifier: [10, 0],
        modifierLabel: '10',
        reversible: false,
        textures: [
          'pcards_generic_p',
          'pcards_back_p'
        ]
      }
    ],
    sideDeckCards: [
      {
        name: "Plus 1",
        modifier: [1, 0],
        modifierLabel: "+1",
        reversible: false,
        textures: [
          'pcards_pos_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Plus 2",
        modifier: [2, 0],
        modifierLabel: "+2",
        reversible: false,
        textures: [
          'pcards_pos_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Plus 3",
        modifier: [3, 0],
        modifierLabel: "+3",
        reversible: false,
        textures: [
          'pcards_pos_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Plus 4",
        modifier: [4, 0],
        modifierLabel: "+4",
        reversible: false,
        textures: [
          'pcards_pos_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Plus 5",
        modifier: [5, 0],
        modifierLabel: "+5",
        reversible: false,
        textures: [
          'pcards_pos_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Plus 6",
        modifier: [6, 0],
        modifierLabel: "+6",
        reversible: false,
        textures: [
          'pcards_pos_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Minus 1",
        modifier: [-1, 0],
        modifierLabel: "-1",
        reversible: false,
        textures: [
          'pcards_neg_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Minus 2",
        modifier: [-2, 0],
        modifierLabel: "-2",
        reversible: false,
        textures: [
          'pcards_neg_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Minus 3",
        modifier: [-3, 0],
        modifierLabel: "-3",
        reversible: false,
        textures: [
          'pcards_neg_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Minus 4",
        modifier: [-4, 0],
        modifierLabel: "-4",
        reversible: false,
        textures: [
          'pcards_neg_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Minus 5",
        modifier: [-5, 0],
        modifierLabel: "-5",
        reversible: false,
        textures: [
          'pcards_neg_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Minus 6",
        modifier: [-6, 0],
        modifierLabel: "-6",
        reversible: false,
        textures: [
          'pcards_neg_p',
          'pcards_back_p'
        ]
      },
      {
        name: "Plus/Minus 1",
        modifier: [1, -1],
        modifierLabel: "±1",
        reversible: true,
        textures: [
          'pcards_dblpos_p', // positive
          'pcards_dblneg_p' // negative
        ]
      },
      {
        name: "Plus/Minus 2",
        modifier: [2, -2],
        modifierLabel: "±2",
        reversible: true,
        textures: [
          'pcards_dblpos_p', // positive
          'pcards_dblneg_p' // negative
        ]
      },
      {
        name: "Plus/Minus 3",
        modifier: [3, -3],
        modifierLabel: "±3",
        reversible: true,
        textures: [
          'pcards_dblpos_p', // positive
          'pcards_dblneg_p' // negative
        ]
      },
      {
        name: "Plus/Minus 4",
        modifier: [4, -4],
        modifierLabel: "±4",
        reversible: true,
        textures: [
          'pcards_dblpos_p', // positive
          'pcards_dblneg_p' // negative
        ]
      },
      {
        name: "Plus/Minus 5",
        modifier: [5, -5],
        modifierLabel: "±5",
        reversible: true,
        textures: [
          'pcards_dblpos_p', // positive
          'pcards_dblneg_p' // negative
        ]
      },
      {
        name: "Plus/Minus 6",
        modifier: [6, -6],
        modifierLabel: "±6",
        reversible: true,
        textures: [
          'pcards_dblpos_p', // positive
          'pcards_dblneg_p'
        ]
      },
      {
        name: "1±2",
        modifier: [1, 2],
        modifierLabel: "1±2",
        reversible: true,
        textures: [
          'pcards_gold_p',
          'pcards_gold_p'
        ]
      }
    ]
  }
}