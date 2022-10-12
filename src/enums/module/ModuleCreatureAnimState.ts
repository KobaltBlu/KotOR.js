

export enum ModuleCreatureAnimState {
  IDLE = 10000,
  ANIMATING = 4,
  //CREATURE
  PAUSE =                10000, //NWSCRIPT Constant = 0
  //READY - depends on equipped weapons
  //1=92,2=133,3=174,4=215,5=223,6=237,7=245,8=249,9=245
  READY =                10001, //see comment ^^^ NWSCRIPT Constant = 19
  //WALK - depends on equipped weapons
  //2=338,3=341,4=339,5=0,6=0,7=340,8=0,9=340 simple 253
  WALKING =              10002, //see comment ^^^ 
  //WALKING_BACK - depends on equipped weapons
  //2=338,3=341,4=339,5=0,6=0,7=340,8=0,9=340 simple 253
  WALKING_BACK =         10003, //see comment ^^^ 
  RUNNING =              10004, //
  DEAD =                 10006, //81 - NWSCRIPT Constant = 26
  DEAD1 =                10008, //83
  ATTACK =               10009, //300
  DODGE =                10011, //302 -
  PARRY =                10012, //301 -
  DAMAGE =               10014, //303 -
  CASTOUT1 =             10015, //62 - 
  CASTOUT2 =             10016, //64 - 
  CASTOUT1_LP =          10017, //63 - 
  CASTOUT2_LP =          10018, //65 - 
  SPASM =                10023, //77 - NWSCRIPT Constant = 21
  TAUNT =                10028, //33 - NWSCRIPT Constant = 107
  GREETING =             10029, //31 - NWSCRIPT Constant = 106
  LISTEN =               10030, //18 - NWSCRIPT Constant = 2
  MEDITATE =             10032, //24 - NWSCRIPT Constant = 3
  WORSHIP =              10033, //24 - NWSCRIPT Constant = 4
  SALUTE =               10034, //16 - NWSCRIPT Constant = 104
  BOW =                  10035, //19 - NWSCRIPT Constant = 105
  TALK_NORMAL =          10038, //25 - NWSCRIPT Constant = 5
  TALK_PLEADING =        10039, //27 - NWSCRIPT Constant = 6
  TALK_FORCEFUL =        10040, //26 - NWSCRIPT Constant = 7
  TALK_LAUGHING =        10041, //29 - NWSCRIPT Constant = 8
  TALK_SAD =             10042, //28 - NWSCRIPT Constant = 9
  VICTORY =              10044, //260 - NWSCRIPT Constant = 108 - 110
  PAUSE2 =               10052, //7 -NWSCRIPT Constant = 1
  HEAD_TURN_LEFT =       10053, //11 - NWSCRIPT Constant = 100
  HEAD_TURN_RIGHT =      10054, //10 - NWSCRIPT Constant = 101
  PAUSE_SCRATCH_HEAD =   10055, //12 - NWSCRIPT Constant = 102
  PAUSE_BORED =          10056, //13 - NWSCRIPT Constant = 103
  PAUSE_TIRED =          10057, //14 - NWSCRIPT Constant = 12
  PAUSE_DRUNK =          10058, //15 - NWSCRIPT Constant = 13 pausepsn - poisoned
  GET_LOW =              10059, //40 - NWSCRIPT Constant = 10
  GET_MID =              10060, //41 - NWSCRIPT Constant = 11
  THROW_SABER_LP =       10061, //70 - 
  INJECT =               10070, //37 - NWSCRIPT Constant = 112 - Simple Creatures can't do this one
  DAMAGE2 =              10077, //303 -
  PAUSE_INJ =            10092, //8 - 
  WALK_INJ =             10093, //1 - 
  RUN_INJ =              10094, //4 -
  ATTACK_DUELING =       10109, //300
  USE_COMPUTER_LP =      10112, //44 - 
  WHIRLWIND =            10117, //75 - 
  DEACTIVATE =           10118, //270 - NWSCRIPT Constant = 20
  FLIRT =                10120, //32 - NWSCRIPT Constant = 14
  USE_COMPUTER =         10121, //43? - NWSCRIPT Constant = 15
  DANCE =                10122, //53 - NWSCRIPT Constant = 16
  DANCE1 =               10123, //54 - NWSCRIPT Constant = 17
  HORROR =               10124, //74 - NWSCRIPT Constant = 18
  USE_COMPUTER2 =        10125, //43 - NWSCRIPT Constant = 113
  PERSUADE =             10126, //68 - NWSCRIPT Constant = 114
  ACTIVATE_ITEM =        10127, //38 - NWSCRIPT Constant = 115
  UNLOCK_DOOR =          10128, //47
  THROW_HIGH =           10129, //57 - NWSCRIPT Constant = 117
  THROW_LOW =            10130, //58 - NWSCRIPT Constant = 118
  UNLOCK_CONTAINER =     10131, //48 - 
  DISABLE_MINE =         10132, //51 - 
  WALK_STEALTH =         10133, //5 - 
  UNLOCK_DOOR2 =         10134, //47 - 
  UNLOCK_CONTAINER2 =    10135, //48 - 
  ACTIVATE_ITEM2 =       10136, //38 - 
  SLEEP =                10137, //76 - NWSCRIPT Constant = 22
  PARALYZED =            10138, //78 - 
  PRONE =                10139, //79 - NWSCRIPT Constant = 23
  SET_MINE =             10140, //52 - 
  DISABLE_MINE2 =        10141, //51 - 
  CUSTOM01 =             10142, //346 - NWSCRIPT Constant = 119
  FBLOCK =               10145, //355 - fblock?
  PAUSE4 =               10147, //357 - 
  //READY_ALT - depends on equipped weapons
  //1=92,2=133,3=174,4=215,5=223,6=237,7=245,8=249,9=245
  READY_ALT =            10148, //see comment ^^^
  PAUSE_ALT =            10149, //pause?
  CHOKE =                10150, //72 - NWSCRIPT Constant = 116
  PAUSE3 =               10151, //359 - NWSCRIPT Constant = 24
  WELD =                 10152, //360 - NWSCRIPT Constant = 25
  TALK_INJURED =         10154, //370 - NWSCRIPT Constant = 27
  LISTEN_INJURED =       10155, //371 - NWSCRIPT Constant = 28
  DEAD_PRONE =           10156, //375 - NWSCRIPT Constant = 30
  //MELEE_WIELD - depends on equipped weapons
  //1=378,2=377,3=378,4=376,5=378,6=378,7=378,8=378,9=378
  MELEE_WIELD =          10157, //see comment ^^^
  //MELEE_COMBAT_WIELD - depends on equipped weapons
  //2=132,3=214,4=173
  MELEE_COMBAT_WIELD =   10158, //see comment ^^^
  TREAT_INJURED =        10159, //34 - NWSCRIPT Constant = 120
  TREAT_INJURED_LP =     10160, //35 - NWSCRIPT Constant = 29
  CATCH_SABER =          10161, //71 - catchsab
  THROW_SABER =          10162, //69 - throwsab
  KID_TALK_ANGRY =       10163, //384 - NWSCRIPT Constant = 31
  KID_TALK_SAD =         10164, //385 - NWSCRIPT Constant = 32
  KNOCKED_DOWN =         10219, //85 -
  KNOCKED_DOWN2 =        10220, //85 -
  DIE =                  10221, //80 -
  DIE1 =                 10222, //82 -
  GET_UP_DEAD =          10223, //381 //getupdead
  GET_UP_DEAD1 =         10224, //382 //getupdead1
  KNEEL =                10237, //23 - 
  KNEEL1 =               10238, //23 - 
  //FLOURISH - depends on equipped weapons
  //1=91,2=132,3=173,4=214,5=222,6=136,7=244,8=373,9=244
  FLOURISH =             10246, //see comment ^^^
  KNEELING =             10271, //383 - kd - animations.2da
  //DAMAGED - depends on equipped weapons
  //1=unknown,2=124,3=206,4=165,5=220,6=234,7=242,8=280,9=242
  DAMAGED =              10302, //see comment ^^^
  //BLASTER_DEFLECTION_1H - depends on equipped weapons
  //2=109,3=151,4=192
  BLASTER_DEFLECTION_1H =10300, //see comment ^^^
  //BLASTER_DEFLECTION_2H - depends on equipped weapons
  //2=110,3=151,4=192
  BLASTER_DEFLECTION_2H =10301, //see comment ^^^
  KNOCKED_DOWN_LP =      10400, //84 - 
  POWER_ATTACK_SS =      10401, //115 - 
  KNOCKED_DOWN2_LP =     10402, //84 - 

  //BEGIN TSL ANIMATIONS

  TOUCH_HEART =          10403,
  ROLL_EYES =            10404,
  USE_ITEM_ON_OTHER =    10405,
  STAND_ATTENTION =      10406,
  NOD_YES =              10407,
  NOD_NO =               10408,
  POINT =                10409,
  POINT_LP =             10410,
  POINT_DOWN =           10411,
  SCANNING =             10412,
  SHRUG =                10413,
  SIT_CHAIR =            10424,
  SIT_CHAIR_DRUNK =      10425,
  SIT_CHAIR_PAZAAK =     10426,
  SIT_CHAIR_COMP1 =      10427,
  SIT_CHAIR_COMP2 =      10428,
  CUT_HANDS =            10499,
  L_HAND_CHOP =          10500,
  COLLAPSE =             10501,
  COLLAPSE_STAND =       10503,
  BAO_DUR_POWER_PUNCH =  10504,
  HOOD_OFF =             10507,
  HOOD_ON =              10508,

  //END TSL ANIMATIONS

  CASTOUT3 =             11000, //66 - 
  CRITICAL_STRIKE2_SS =  11001, //392 -
  CRITICAL_STRIKE3_SS =  11002, //393 -
};