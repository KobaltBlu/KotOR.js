export const PazaakConfig = {
  name: "Pazaak",
  textures: [
    {
      name: "Card Back",
      file: "lbl_cardback"
    },
    {
      name: "Card Hilight",
      file: "lbl_cardhilite"
    },
    {
      name: "Card Drawn",
      file: "lbl_cardstand"
    },
    {
      name: "Card Positive",
      file: "lbl_cardmpos"
    },
    {
      name: "Card Negative",
      file: "lbl_cardmneg"
    },
    {
      name: "Card Reversible Positive",
      file: "lbl_cardrarem"
    },
    {
      name: "Card Reversible Negative",
      file: "lbl_cardraref"
    }
  ],
  data: {
    rounds: 3,
    mainDeckCards: [
      {
        name: "Base 1",
        modifier: 1,
        modifierLabel: '1',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },
      {
        name: "Base 2",
        modifier: 2,
        modifierLabel: '2',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },
      {
        name: "Base 3",
        modifier: 3,
        modifierLabel: '3',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },
      {
        name: "Base 4",
        modifier: 4,
        modifierLabel: '4',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },  
      {
        name: "Base 5",
        modifier: 5,
        modifierLabel: '5',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },
      {
        name: "Base 6",
        modifier: 6,
        modifierLabel: '6',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },
      {
        name: "Base 7",
        modifier: 7,
        modifierLabel: '7',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      }, 
      {
        name: "Base 8",
        modifier: 8,
        modifierLabel: '8',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },
      {
        name: "Base 9",
        modifier: 9,
        modifierLabel: '9',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      },
      {
        name: "Base 10",
        modifier: 10,
        modifierLabel: '10',
        reversible: false,
        textures: [
          'lbl_cardstand',
          'lbl_cardback'
        ]
      }
    ],
    sideDeckCards: [
      {
        name: "Plus 1",
        modifier: 1,
        modifierLabel: "+1",
        reversible: false,
        textures: [
          'lbl_cardmpos',
          'lbl_cardback'
        ]
      },
      {
        name: "Plus 2",
        modifier: 2,
        modifierLabel: "+2",
        reversible: false,
        textures: [
          'lbl_cardmpos',
          'lbl_cardback'
        ]
      },
      {
        name: "Plus 3",
        modifier: 3,
        modifierLabel: "+3",
        reversible: false,
        textures: [
          'lbl_cardmpos',
          'lbl_cardback'
        ]
      },
      {
        name: "Plus 4",
        modifier: 4,
        modifierLabel: "+4",
        reversible: false,
        textures: [
          'lbl_cardmpos',
          'lbl_cardback'
        ]
      },
      {
        name: "Plus 5",
        modifier: 5,
        modifierLabel: "+5",
        reversible: false,
        textures: [
          'lbl_cardmpos',
          'lbl_cardback'
        ]
      },
      {
        name: "Plus 6",
        modifier: 6,
        modifierLabel: "+6",
        reversible: false,
        textures: [
          'lbl_cardmpos',
          'lbl_cardback'
        ]
      },
      {
        name: "Minus 1",
        modifier: -1,
        modifierLabel: "-1",
        reversible: false,
        textures: [
          'lbl_cardmneg',
          'lbl_cardback'
        ]
      },
      {
        name: "Minus 2",
        modifier: -2,
        modifierLabel: "-2",
        reversible: false,
        textures: [
          'lbl_cardmneg',
          'lbl_cardback'
        ]
      },
      {
        name: "Minus 3",
        modifier: -3,
        modifierLabel: "-3",
        reversible: false,
        textures: [
          'lbl_cardmneg',
          'lbl_cardback'
        ]
      },
      {
        name: "Minus 4",
        modifier: -4,
        modifierLabel: "-4",
        reversible: false,
        textures: [
          'lbl_cardmneg',
          'lbl_cardback'
        ]
      },
      {
        name: "Minus 5",
        modifier: -5,
        modifierLabel: "-5",
        reversible: false,
        textures: [
          'lbl_cardmneg',
          'lbl_cardback'
        ]
      },
      {
        name: "Minus 6",
        modifier: -6,
        modifierLabel: "-6",
        reversible: false,
        textures: [
          'lbl_cardmneg',
          'lbl_cardback'
        ]
      },
      {
        name: "Plus/Minus 1",
        modifier: 1,
        modifierLabel: "±1",
        reversible: true,
        textures: [
          'lbl_cardrarem', // positive
          'lbl_cardraref' // negative
        ]
      },
      {
        name: "Plus/Minus 2",
        modifier: 2,
        modifierLabel: "±2",
        reversible: true,
        textures: [
          'lbl_cardrarem', // positive
          'lbl_cardraref' // negative
        ]
      },
      {
        name: "Plus/Minus 3",
        modifier: 3,
        modifierLabel: "±3",
        reversible: true,
        textures: [
          'lbl_cardrarem', // positive
          'lbl_cardraref' // negative
        ]
      },
      {
        name: "Plus/Minus 4",
        modifier: 4,
        modifierLabel: "±4",
        reversible: true,
        textures: [
          'lbl_cardrarem', // positive
          'lbl_cardraref'
        ]
      },
      {
        name: "Plus/Minus 5",
        modifier: 5,
        modifierLabel: "±5",
        reversible: true,
        textures: [
          'lbl_cardrarem', // positive
          'lbl_cardraref' // negative
        ]
      },
      {
        name: "Plus/Minus 6",
        modifier: 6,
        modifierLabel: "±6",
        reversible: true,
        textures: [
          'lbl_cardrarem', // positive
          'lbl_cardraref'
        ]
      }
    ]
  }
}