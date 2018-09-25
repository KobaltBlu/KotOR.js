////////////////////////////////////////////////////////
//
//  NWScript
//
//  The list of actions and pre-defined constants.
//
//  (c) BioWare Corp, 1999
//
////////////////////////////////////////////////////////

#define ENGINE_NUM_STRUCTURES   4
#define ENGINE_STRUCTURE_0      effect
#define ENGINE_STRUCTURE_1      event
#define ENGINE_STRUCTURE_2      location
#define ENGINE_STRUCTURE_3      talent

// Constants

int        NUM_INVENTORY_SLOTS          = 20;

int    TRUE                     = 1;
int    FALSE                    = 0;

float  DIRECTION_EAST           = 0.0;
float  DIRECTION_NORTH          = 90.0;
float  DIRECTION_WEST           = 180.0;
float  DIRECTION_SOUTH          = 270.0;
float  PI                       = 3.141592;

int    ATTITUDE_NEUTRAL         = 0;
int    ATTITUDE_AGGRESSIVE      = 1;
int    ATTITUDE_DEFENSIVE       = 2;
int    ATTITUDE_SPECIAL         = 3;

int    TALKVOLUME_TALK          = 0;
int    TALKVOLUME_WHISPER       = 1;
int    TALKVOLUME_SHOUT         = 2;
int    TALKVOLUME_SILENT_TALK   = 3;
int    TALKVOLUME_SILENT_SHOUT  = 4;

int    INVENTORY_SLOT_HEAD        = 0;
int    INVENTORY_SLOT_BODY        = 1;
int    INVENTORY_SLOT_HANDS       = 3;
int    INVENTORY_SLOT_RIGHTWEAPON = 4;
int    INVENTORY_SLOT_LEFTWEAPON  = 5;
int    INVENTORY_SLOT_LEFTARM     = 7;
int    INVENTORY_SLOT_RIGHTARM    = 8;
int    INVENTORY_SLOT_IMPLANT     = 9;
int    INVENTORY_SLOT_BELT        = 10;
int    INVENTORY_SLOT_CWEAPON_L   = 14;
int    INVENTORY_SLOT_CWEAPON_R   = 15;
int    INVENTORY_SLOT_CWEAPON_B   = 16;
int    INVENTORY_SLOT_CARMOUR     = 17;
int    INVENTORY_SLOT_RIGHTWEAPON2= 18;
int    INVENTORY_SLOT_LEFTWEAPON2 = 19;

//Effect type constants
int    DURATION_TYPE_INSTANT    = 0;
int    DURATION_TYPE_TEMPORARY  = 1;
int    DURATION_TYPE_PERMANENT  = 2;

int    SUBTYPE_MAGICAL          = 8;
int    SUBTYPE_SUPERNATURAL     = 16;
int    SUBTYPE_EXTRAORDINARY    = 24;

int    ABILITY_STRENGTH         = 0; // should be the same as in nwseffectlist.cpp
int    ABILITY_DEXTERITY        = 1;
int    ABILITY_CONSTITUTION     = 2;
int    ABILITY_INTELLIGENCE     = 3;
int    ABILITY_WISDOM           = 4;
int    ABILITY_CHARISMA         = 5;

int    SHAPE_SPELLCYLINDER      = 0;
int    SHAPE_CONE               = 1;
int    SHAPE_CUBE               = 2;
int    SHAPE_SPELLCONE          = 3;
int    SHAPE_SPHERE             = 4;

int    OBJECT_TYPE_CREATURE         = 1;
int    OBJECT_TYPE_ITEM             = 2;
int    OBJECT_TYPE_TRIGGER          = 4;
int    OBJECT_TYPE_DOOR             = 8;
int    OBJECT_TYPE_AREA_OF_EFFECT   = 16;
int    OBJECT_TYPE_WAYPOINT         = 32;
int    OBJECT_TYPE_PLACEABLE        = 64;
int    OBJECT_TYPE_STORE            = 128;
int    OBJECT_TYPE_ENCOUNTER        = 256;
int    OBJECT_TYPE_SOUND            = 512;
int    OBJECT_TYPE_ALL              = 32767;

int    OBJECT_TYPE_INVALID          = 32767;

int    GENDER_MALE    = 0;
int    GENDER_FEMALE  = 1;
int    GENDER_BOTH    = 2;
int    GENDER_OTHER   = 3;
int    GENDER_NONE    = 4;

int    DAMAGE_TYPE_BLUDGEONING  = 1;
int    DAMAGE_TYPE_PIERCING     = 2;
int    DAMAGE_TYPE_SLASHING     = 4;
int    DAMAGE_TYPE_UNIVERSAL    = 8;
int    DAMAGE_TYPE_ACID         = 16;
int    DAMAGE_TYPE_COLD         = 32;
int    DAMAGE_TYPE_LIGHT_SIDE   = 64;
int    DAMAGE_TYPE_ELECTRICAL   = 128;
int    DAMAGE_TYPE_FIRE         = 256;
int    DAMAGE_TYPE_DARK_SIDE    = 512;
int    DAMAGE_TYPE_SONIC        = 1024;
int    DAMAGE_TYPE_ION          = 2048;
int    DAMAGE_TYPE_BLASTER      = 4096;

// Special versus flag just for AC effects
int    AC_VS_DAMAGE_TYPE_ALL    = 8199;

int    DAMAGE_BONUS_1           = 1;
int    DAMAGE_BONUS_2           = 2;
int    DAMAGE_BONUS_3           = 3;
int    DAMAGE_BONUS_4           = 4;
int    DAMAGE_BONUS_5           = 5;
int    DAMAGE_BONUS_1d4         = 6;
int    DAMAGE_BONUS_1d6         = 7;
int    DAMAGE_BONUS_1d8         = 8;
int    DAMAGE_BONUS_1d10        = 9;
int    DAMAGE_BONUS_2d6         = 10;

int    DAMAGE_POWER_NORMAL         = 0;
int    DAMAGE_POWER_PLUS_ONE       = 1;
int    DAMAGE_POWER_PLUS_TWO       = 2;
int    DAMAGE_POWER_PLUS_THREE     = 3;
int    DAMAGE_POWER_PLUS_FOUR      = 4;
int    DAMAGE_POWER_PLUS_FIVE      = 5;
int    DAMAGE_POWER_ENERGY         = 6;

int    ATTACK_BONUS_MISC                = 0;
int    ATTACK_BONUS_ONHAND              = 1;
int    ATTACK_BONUS_OFFHAND             = 2;

int    AC_DODGE_BONUS                   = 0;
int    AC_NATURAL_BONUS                 = 1;
int    AC_ARMOUR_ENCHANTMENT_BONUS      = 2;
int    AC_SHIELD_ENCHANTMENT_BONUS      = 3;
int    AC_DEFLECTION_BONUS              = 4;

int    DOOR_ACTION_OPEN                 = 0;
int    DOOR_ACTION_UNLOCK               = 1;
int    DOOR_ACTION_BASH                 = 2;
int    DOOR_ACTION_IGNORE               = 3;
int    DOOR_ACTION_KNOCK                = 4;

int    PLACEABLE_ACTION_USE                  = 0;
int    PLACEABLE_ACTION_UNLOCK               = 1;
int    PLACEABLE_ACTION_BASH                 = 2;
int    PLACEABLE_ACTION_KNOCK                = 4;


int    RACIAL_TYPE_UNKNOWN              = 0;
int    RACIAL_TYPE_ELF                  = 1;
int    RACIAL_TYPE_GNOME                = 2;
int    RACIAL_TYPE_HALFLING             = 3;
int    RACIAL_TYPE_HALFELF              = 4;
int    RACIAL_TYPE_DROID                = 5;
int    RACIAL_TYPE_HUMAN                = 6;
int    RACIAL_TYPE_ALL                  = 7;
int    RACIAL_TYPE_INVALID              = 8;

int    ALIGNMENT_ALL                    = 0;
int    ALIGNMENT_NEUTRAL                = 1;
int    ALIGNMENT_LIGHT_SIDE             = 2;
int    ALIGNMENT_DARK_SIDE              = 3;

int SAVING_THROW_ALL                    = 0;
int SAVING_THROW_FORT                   = 1;
int SAVING_THROW_REFLEX                 = 2;
int SAVING_THROW_WILL                   = 3;

int SAVING_THROW_TYPE_ALL               = 0;
int SAVING_THROW_TYPE_NONE              = 0;
int SAVING_THROW_TYPE_ACID              = 1;
int SAVING_THROW_TYPE_SNEAK_ATTACK      = 2;
int SAVING_THROW_TYPE_COLD              = 3;
int SAVING_THROW_TYPE_DEATH             = 4;
int SAVING_THROW_TYPE_DISEASE           = 5;
int SAVING_THROW_TYPE_LIGHT_SIDE        = 6;
int SAVING_THROW_TYPE_ELECTRICAL        = 7;
int SAVING_THROW_TYPE_FEAR              = 8;
int SAVING_THROW_TYPE_FIRE              = 9;
int SAVING_THROW_TYPE_MIND_AFFECTING    = 10;
int SAVING_THROW_TYPE_DARK_SIDE         = 11;
int SAVING_THROW_TYPE_POISON            = 12;
int SAVING_THROW_TYPE_SONIC             = 13;
int SAVING_THROW_TYPE_TRAP              = 14;
int SAVING_THROW_TYPE_FORCE_POWER       = 15;
int SAVING_THROW_TYPE_ION               = 16;
int SAVING_THROW_TYPE_BLASTER           = 17;
int SAVING_THROW_TYPE_PARALYSIS         = 18;

int IMMUNITY_TYPE_NONE              = 0;
int IMMUNITY_TYPE_MIND_SPELLS       = 1;
int IMMUNITY_TYPE_POISON            = 2;
int IMMUNITY_TYPE_DISEASE           = 3;
int IMMUNITY_TYPE_FEAR              = 4;
int IMMUNITY_TYPE_TRAP              = 5;
int IMMUNITY_TYPE_PARALYSIS         = 6;
int IMMUNITY_TYPE_BLINDNESS         = 7;
int IMMUNITY_TYPE_DEAFNESS          = 8;
int IMMUNITY_TYPE_SLOW              = 9;
int IMMUNITY_TYPE_ENTANGLE          = 10;
int IMMUNITY_TYPE_SILENCE           = 11;
int IMMUNITY_TYPE_STUN              = 12;
int IMMUNITY_TYPE_SLEEP             = 13;
int IMMUNITY_TYPE_CHARM             = 14;
int IMMUNITY_TYPE_DOMINATE          = 15;
int IMMUNITY_TYPE_CONFUSED          = 16;
int IMMUNITY_TYPE_CURSED            = 17;
int IMMUNITY_TYPE_DAZED             = 18;
int IMMUNITY_TYPE_ABILITY_DECREASE  = 19;
int IMMUNITY_TYPE_ATTACK_DECREASE   = 20;
int IMMUNITY_TYPE_DAMAGE_DECREASE   = 21;
int IMMUNITY_TYPE_DAMAGE_IMMUNITY_DECREASE = 22;
int IMMUNITY_TYPE_AC_DECREASE       = 23;
int IMMUNITY_TYPE_MOVEMENT_SPEED_DECREASE = 24;
int IMMUNITY_TYPE_SAVING_THROW_DECREASE = 25;
int IMMUNITY_TYPE_FORCE_RESISTANCE_DECREASE = 26;
int IMMUNITY_TYPE_SKILL_DECREASE    = 27;
int IMMUNITY_TYPE_KNOCKDOWN         = 28;
int IMMUNITY_TYPE_NEGATIVE_LEVEL    = 29;
int IMMUNITY_TYPE_SNEAK_ATTACK      = 30;
int IMMUNITY_TYPE_CRITICAL_HIT      = 31;
int IMMUNITY_TYPE_DEATH             = 32;
int IMMUNITY_TYPE_DROID_CONFUSED    = 33;

int AREA_TRANSITION_RANDOM        = 0;
int AREA_TRANSITION_USER_DEFINED  = 1;
int AREA_TRANSITION_CITY_01       = 2;
int AREA_TRANSITION_CITY_02       = 3;
int AREA_TRANSITION_CITY_03       = 4;
int AREA_TRANSITION_CITY_04       = 5;
int AREA_TRANSITION_CITY_05       = 6;
int AREA_TRANSITION_CRYPT_01      = 7;
int AREA_TRANSITION_CRYPT_02      = 8;
int AREA_TRANSITION_CRYPT_03      = 9;
int AREA_TRANSITION_CRYPT_04      = 10;
int AREA_TRANSITION_CRYPT_05      = 11;
int AREA_TRANSITION_DUNGEON_01    = 12;
int AREA_TRANSITION_DUNGEON_02    = 13;
int AREA_TRANSITION_DUNGEON_03    = 14;
int AREA_TRANSITION_DUNGEON_04    = 15;
int AREA_TRANSITION_DUNGEON_05    = 16;
int AREA_TRANSITION_DUNGEON_06    = 17;
int AREA_TRANSITION_DUNGEON_07    = 18;
int AREA_TRANSITION_DUNGEON_08    = 19;
int AREA_TRANSITION_MINES_01      = 20;
int AREA_TRANSITION_MINES_02      = 21;
int AREA_TRANSITION_MINES_03      = 22;
int AREA_TRANSITION_MINES_04      = 23;
int AREA_TRANSITION_MINES_05      = 24;
int AREA_TRANSITION_MINES_06      = 25;
int AREA_TRANSITION_MINES_07      = 26;
int AREA_TRANSITION_MINES_08      = 27;
int AREA_TRANSITION_MINES_09      = 28;
int AREA_TRANSITION_SEWER_01      = 29;
int AREA_TRANSITION_SEWER_02      = 30;
int AREA_TRANSITION_SEWER_03      = 31;
int AREA_TRANSITION_SEWER_04      = 32;
int AREA_TRANSITION_SEWER_05      = 33;
int AREA_TRANSITION_CASTLE_01     = 34;
int AREA_TRANSITION_CASTLE_02     = 35;
int AREA_TRANSITION_CASTLE_03     = 36;
int AREA_TRANSITION_CASTLE_04     = 37;
int AREA_TRANSITION_CASTLE_05     = 38;
int AREA_TRANSITION_CASTLE_06     = 39;
int AREA_TRANSITION_CASTLE_07     = 40;
int AREA_TRANSITION_CASTLE_08     = 41;
int AREA_TRANSITION_INTERIOR_01   = 42;
int AREA_TRANSITION_INTERIOR_02   = 43;
int AREA_TRANSITION_INTERIOR_03   = 44;
int AREA_TRANSITION_INTERIOR_04   = 45;
int AREA_TRANSITION_INTERIOR_05   = 46;
int AREA_TRANSITION_INTERIOR_06   = 47;
int AREA_TRANSITION_INTERIOR_07   = 48;
int AREA_TRANSITION_INTERIOR_08   = 49;
int AREA_TRANSITION_INTERIOR_09   = 50;
int AREA_TRANSITION_INTERIOR_10   = 51;
int AREA_TRANSITION_INTERIOR_11   = 52;
int AREA_TRANSITION_INTERIOR_12   = 53;
int AREA_TRANSITION_INTERIOR_13   = 54;
int AREA_TRANSITION_INTERIOR_14   = 55;
int AREA_TRANSITION_INTERIOR_15   = 56;
int AREA_TRANSITION_INTERIOR_16   = 57;
int AREA_TRANSITION_FOREST_01     = 58;
int AREA_TRANSITION_FOREST_02     = 59;
int AREA_TRANSITION_FOREST_03     = 60;
int AREA_TRANSITION_FOREST_04     = 61;
int AREA_TRANSITION_FOREST_05     = 62;
int AREA_TRANSITION_RURAL_01      = 63;
int AREA_TRANSITION_RURAL_02      = 64;
int AREA_TRANSITION_RURAL_03      = 65;
int AREA_TRANSITION_RURAL_04      = 66;
int AREA_TRANSITION_RURAL_05      = 67;

// Legacy area-transition constants.  Do not delete these.
int AREA_TRANSITION_CITY          = 2;
int AREA_TRANSITION_CRYPT         = 7;
int AREA_TRANSITION_FOREST        = 58;
int AREA_TRANSITION_RURAL         = 63;

// NOTE: BODY_NODE_HAND should be used to attach to the 'handconjure' node.
int BODY_NODE_HAND                                = 0;
int BODY_NODE_CHEST                               = 1;
int BODY_NODE_HEAD                                = 2;
// NOTE: BODY_NODE_HAND_* should be used to attach specifically to either the left or right hand.  The
//       nodes used with be 'lhand' and 'rhand'.
int BODY_NODE_HAND_LEFT                           = 3;
int BODY_NODE_HAND_RIGHT                          = 4;

float RADIUS_SIZE_SMALL           = 1.67f;
float RADIUS_SIZE_MEDIUM          = 3.33f;
float RADIUS_SIZE_LARGE           = 5.0f;
float RADIUS_SIZE_HUGE            = 6.67f;
float RADIUS_SIZE_GARGANTUAN      = 8.33f;
float RADIUS_SIZE_COLOSSAL        = 10.0f;

// these are magic numbers.  they should correspond to the values layed out in ExecuteCommandGetEffectType
int EFFECT_TYPE_INVALIDEFFECT               = 0;
int EFFECT_TYPE_DAMAGE_RESISTANCE           = 1;
//int EFFECT_TYPE_ABILITY_BONUS               = 2;
int EFFECT_TYPE_REGENERATE                  = 3;
//int EFFECT_TYPE_SAVING_THROW_BONUS          = 4;
//int EFFECT_TYPE_MODIFY_AC                   = 5;
//int EFFECT_TYPE_ATTACK_BONUS                = 6;
int EFFECT_TYPE_DAMAGE_REDUCTION            = 7;
//int EFFECT_TYPE_DAMAGE_BONUS                = 8;
int EFFECT_TYPE_TEMPORARY_HITPOINTS         = 9;
//int EFFECT_TYPE_DAMAGE_IMMUNITY             = 10;
int EFFECT_TYPE_ENTANGLE                    = 11;
int EFFECT_TYPE_INVULNERABLE                = 12;
int EFFECT_TYPE_DEAF                        = 13;
int EFFECT_TYPE_RESURRECTION                = 14;
int EFFECT_TYPE_IMMUNITY                    = 15;
//int EFFECT_TYPE_BLIND                       = 16;
int EFFECT_TYPE_ENEMY_ATTACK_BONUS          = 17;
int EFFECT_TYPE_ARCANE_SPELL_FAILURE        = 18;
//int EFFECT_TYPE_MOVEMENT_SPEED              = 19;
int EFFECT_TYPE_AREA_OF_EFFECT              = 20;
int EFFECT_TYPE_BEAM                        = 21;
//int EFFECT_TYPE_FORCE_RESISTANCE            = 22;
int EFFECT_TYPE_CHARMED                     = 23;
int EFFECT_TYPE_CONFUSED                    = 24;
int EFFECT_TYPE_FRIGHTENED                  = 25;
int EFFECT_TYPE_DOMINATED                   = 26;
int EFFECT_TYPE_PARALYZE                    = 27;
int EFFECT_TYPE_DAZED                       = 28;
int EFFECT_TYPE_STUNNED                     = 29;
int EFFECT_TYPE_SLEEP                       = 30;
int EFFECT_TYPE_POISON                      = 31;
int EFFECT_TYPE_DISEASE                     = 32;
int EFFECT_TYPE_CURSE                       = 33;
int EFFECT_TYPE_SILENCE                     = 34;
int EFFECT_TYPE_TURNED                      = 35;
int EFFECT_TYPE_HASTE                       = 36;
int EFFECT_TYPE_SLOW                        = 37;
int EFFECT_TYPE_ABILITY_INCREASE            = 38;
int EFFECT_TYPE_ABILITY_DECREASE            = 39;
int EFFECT_TYPE_ATTACK_INCREASE             = 40;
int EFFECT_TYPE_ATTACK_DECREASE             = 41;
int EFFECT_TYPE_DAMAGE_INCREASE             = 42;
int EFFECT_TYPE_DAMAGE_DECREASE             = 43;
int EFFECT_TYPE_DAMAGE_IMMUNITY_INCREASE    = 44;
int EFFECT_TYPE_DAMAGE_IMMUNITY_DECREASE    = 45;
int EFFECT_TYPE_AC_INCREASE                 = 46;
int EFFECT_TYPE_AC_DECREASE                 = 47;
int EFFECT_TYPE_MOVEMENT_SPEED_INCREASE     = 48;
int EFFECT_TYPE_MOVEMENT_SPEED_DECREASE     = 49;
int EFFECT_TYPE_SAVING_THROW_INCREASE       = 50;
int EFFECT_TYPE_SAVING_THROW_DECREASE       = 51;
int EFFECT_TYPE_FORCE_RESISTANCE_INCREASE   = 52;
int EFFECT_TYPE_FORCE_RESISTANCE_DECREASE   = 53;
int EFFECT_TYPE_SKILL_INCREASE              = 54;
int EFFECT_TYPE_SKILL_DECREASE              = 55;
int EFFECT_TYPE_INVISIBILITY                = 56;
int EFFECT_TYPE_IMPROVEDINVISIBILITY        = 57;
int EFFECT_TYPE_DARKNESS                    = 58;
int EFFECT_TYPE_DISPELMAGICALL              = 59;
int EFFECT_TYPE_ELEMENTALSHIELD             = 60;
int EFFECT_TYPE_NEGATIVELEVEL               = 61;
int EFFECT_TYPE_DISGUISE                    = 62;
int EFFECT_TYPE_SANCTUARY                   = 63;
int EFFECT_TYPE_TRUESEEING                  = 64;
int EFFECT_TYPE_SEEINVISIBLE                = 65;
int EFFECT_TYPE_TIMESTOP                    = 66;
int EFFECT_TYPE_BLINDNESS                   = 67;
int EFFECT_TYPE_SPELLLEVELABSORPTION        = 68;
int EFFECT_TYPE_DISPELMAGICBEST             = 69;
int EFFECT_TYPE_ULTRAVISION                 = 70;
int EFFECT_TYPE_MISS_CHANCE                 = 71;
int EFFECT_TYPE_CONCEALMENT                 = 72;
int EFFECT_TYPE_SPELL_IMMUNITY              = 73;
int EFFECT_TYPE_ASSUREDHIT                  = 74;
int EFFECT_TYPE_VISUAL                      = 75;
int EFFECT_TYPE_LIGHTSABERTHROW             = 76;
int EFFECT_TYPE_FORCEJUMP                   = 77;
int EFFECT_TYPE_ASSUREDDEFLECTION           = 78;
int EFFECT_TYPE_DROID_CONFUSED              = 79;
int EFFECT_TYPE_MINDTRICK                   = 80; // DJS-OEI 7/28/2004
int EFFECT_TYPE_DROIDSCRAMBLE               = 81; // DJS-OEI 8/21/2004


int ITEM_PROPERTY_ABILITY_BONUS                            = 0 ;
int ITEM_PROPERTY_AC_BONUS                                 = 1 ;
int ITEM_PROPERTY_AC_BONUS_VS_ALIGNMENT_GROUP              = 2 ;
int ITEM_PROPERTY_AC_BONUS_VS_DAMAGE_TYPE                  = 3 ;
int ITEM_PROPERTY_AC_BONUS_VS_RACIAL_GROUP                 = 4 ;
int ITEM_PROPERTY_ENHANCEMENT_BONUS                        = 5 ;
int ITEM_PROPERTY_ENHANCEMENT_BONUS_VS_ALIGNMENT_GROUP     = 6 ;
int ITEM_PROPERTY_ENHANCEMENT_BONUS_VS_RACIAL_GROUP        = 7 ;
int ITEM_PROPERTY_ATTACK_PENALTY                           = 8 ;
int ITEM_PROPERTY_BONUS_FEAT                               = 9 ;
int ITEM_PROPERTY_ACTIVATE_ITEM                            = 10;
int ITEM_PROPERTY_DAMAGE_BONUS                             = 11;
int ITEM_PROPERTY_DAMAGE_BONUS_VS_ALIGNMENT_GROUP          = 12;
int ITEM_PROPERTY_DAMAGE_BONUS_VS_RACIAL_GROUP             = 13;
int ITEM_PROPERTY_IMMUNITY_DAMAGE_TYPE                     = 14;
int ITEM_PROPERTY_DECREASED_DAMAGE                         = 15;
int ITEM_PROPERTY_DAMAGE_REDUCTION                         = 16;
int ITEM_PROPERTY_DAMAGE_RESISTANCE                        = 17;
int ITEM_PROPERTY_DAMAGE_VULNERABILITY                     = 18;
int ITEM_PROPERTY_DECREASED_ABILITY_SCORE                  = 19;
int ITEM_PROPERTY_DECREASED_AC                             = 20;
int ITEM_PROPERTY_DECREASED_SKILL_MODIFIER                 = 21;
int ITEM_PROPERTY_EXTRA_MELEE_DAMAGE_TYPE                  = 22;
int ITEM_PROPERTY_EXTRA_RANGED_DAMAGE_TYPE                 = 23;
int ITEM_PROPERTY_IMMUNITY                                 = 24;
int ITEM_PROPERTY_IMPROVED_FORCE_RESISTANCE                = 25;
int ITEM_PROPERTY_IMPROVED_SAVING_THROW                    = 26;
int ITEM_PROPERTY_IMPROVED_SAVING_THROW_SPECIFIC           = 27;
int ITEM_PROPERTY_KEEN                                     = 28;
int ITEM_PROPERTY_LIGHT                                    = 29;
int ITEM_PROPERTY_MIGHTY                                   = 30;
int ITEM_PROPERTY_NO_DAMAGE                                = 31;
int ITEM_PROPERTY_ON_HIT_PROPERTIES                        = 32;
int ITEM_PROPERTY_DECREASED_SAVING_THROWS                  = 33;
int ITEM_PROPERTY_DECREASED_SAVING_THROWS_SPECIFIC         = 34;
int ITEM_PROPERTY_REGENERATION                             = 35;
int ITEM_PROPERTY_SKILL_BONUS                              = 36;
int ITEM_PROPERTY_SECURITY_SPIKE                           = 37;
int ITEM_PROPERTY_ATTACK_BONUS                             = 38;
int ITEM_PROPERTY_ATTACK_BONUS_VS_ALIGNMENT_GROUP          = 39;
int ITEM_PROPERTY_ATTACK_BONUS_VS_RACIAL_GROUP             = 40;
int ITEM_PROPERTY_DECREASED_ATTACK_MODIFIER                = 41;
int ITEM_PROPERTY_UNLIMITED_AMMUNITION                     = 42;
int ITEM_PROPERTY_USE_LIMITATION_ALIGNMENT_GROUP           = 43;
int ITEM_PROPERTY_USE_LIMITATION_CLASS                     = 44;
int ITEM_PROPERTY_USE_LIMITATION_RACIAL_TYPE               = 45;
int ITEM_PROPERTY_TRAP                                     = 46;
int ITEM_PROPERTY_TRUE_SEEING                              = 47;
int ITEM_PROPERTY_ON_MONSTER_HIT                           = 48;
int ITEM_PROPERTY_MASSIVE_CRITICALS                        = 49;
int ITEM_PROPERTY_FREEDOM_OF_MOVEMENT                      = 50;
int ITEM_PROPERTY_MONSTER_DAMAGE                           = 51;
int ITEM_PROPERTY_SPECIAL_WALK                             = 52;
int ITEM_PROPERTY_COMPUTER_SPIKE                           = 53;
int ITEM_PROPERTY_REGENERATION_FORCE_POINTS                = 54;
int ITEM_PROPERTY_BLASTER_BOLT_DEFLECT_INCREASE            = 55;
int ITEM_PROPERTY_BLASTER_BOLT_DEFLECT_DECREASE            = 56;
int ITEM_PROPERTY_USE_LIMITATION_FEAT                      = 57;
int ITEM_PROPERTY_DROID_REPAIR_KIT                         = 58;
int ITEM_PROPERTY_DISGUISE                                 = 59;//RWT-OEI 12/03/03 - Caught this list up with the in-game code
int ITEM_PROPERTY_LIMIT_USE_BY_GENDER                      = 60;
int ITEM_PROPERTY_LIMIT_USE_BY_SUBRACE                     = 61;
int ITEM_PROPERTY_LIMIT_USE_BY_PC                          = 62;
int ITEM_PROPERTY_DAMPEN_SOUND                             = 63;
int ITEM_PROPERTY_DOORCUTTING                              = 64;
int ITEM_PROPERTY_DOORSABERING                             = 65;

int BASE_ITEM_QUARTER_STAFF              = 0;
int BASE_ITEM_STUN_BATON                 = 1;
int BASE_ITEM_LONG_SWORD                 = 2;
int BASE_ITEM_VIBRO_SWORD                = 3;
int BASE_ITEM_SHORT_SWORD                = 4;
int BASE_ITEM_VIBRO_BLADE                = 5;
int BASE_ITEM_DOUBLE_BLADED_SWORD        = 6;
int BASE_ITEM_VIBRO_DOUBLE_BLADE         = 7;
int BASE_ITEM_LIGHTSABER                 = 8;
int BASE_ITEM_DOUBLE_BLADED_LIGHTSABER   = 9;
int BASE_ITEM_SHORT_LIGHTSABER           = 10;
int BASE_ITEM_LIGHTSABER_CRYSTALS        = 11;
int BASE_ITEM_BLASTER_PISTOL             = 12;
int BASE_ITEM_HEAVY_BLASTER              = 13;
int BASE_ITEM_HOLD_OUT_BLASTER           = 14;
int BASE_ITEM_ION_BLASTER                = 15;
int BASE_ITEM_DISRUPTER_PISTOL           = 16;
int BASE_ITEM_SONIC_PISTOL               = 17;
int BASE_ITEM_ION_RIFLE                  = 18;
int BASE_ITEM_BOWCASTER                  = 19;
int BASE_ITEM_BLASTER_CARBINE            = 20;
int BASE_ITEM_DISRUPTER_RIFLE            = 21;
int BASE_ITEM_SONIC_RIFLE                = 22;
int BASE_ITEM_REPEATING_BLASTER          = 23;
int BASE_ITEM_HEAVY_REPEATING_BLASTER    = 24;
int BASE_ITEM_FRAGMENTATION_GRENADES     = 25;
int BASE_ITEM_STUN_GRENADES              = 26;
int BASE_ITEM_THERMAL_DETONATOR          = 27;
int BASE_ITEM_POISON_GRENADE             = 28;
int BASE_ITEM_FLASH_GRENADE              = 29;
int BASE_ITEM_SONIC_GRENADE              = 30;
int BASE_ITEM_ADHESIVE_GRENADE           = 31;
int BASE_ITEM_CRYOBAN_GRENADE            = 32;
int BASE_ITEM_FIRE_GRENADE               = 33;
int BASE_ITEM_ION_GRENADE                = 34;
int BASE_ITEM_JEDI_ROBE                  = 35;
int BASE_ITEM_JEDI_KNIGHT_ROBE           = 36;
int BASE_ITEM_JEDI_MASTER_ROBE           = 37;
int BASE_ITEM_ARMOR_CLASS_4              = 38;
int BASE_ITEM_ARMOR_CLASS_5              = 39;
int BASE_ITEM_ARMOR_CLASS_6              = 40;
int BASE_ITEM_ARMOR_CLASS_7              = 41;
int BASE_ITEM_ARMOR_CLASS_8              = 42;
int BASE_ITEM_ARMOR_CLASS_9              = 43;
int BASE_ITEM_MASK                       = 44;
int BASE_ITEM_GAUNTLETS                  = 45;
int BASE_ITEM_FOREARM_BANDS              = 46;
int BASE_ITEM_BELT                       = 47;
int BASE_ITEM_IMPLANT_1                  = 48;
int BASE_ITEM_IMPLANT_2                  = 49;
int BASE_ITEM_IMPLANT_3                  = 50;
int BASE_ITEM_DATA_PAD                   = 52;
int BASE_ITEM_ADRENALINE                 = 53;
int BASE_ITEM_COMBAT_SHOTS               = 54;
int BASE_ITEM_MEDICAL_EQUIPMENT          = 55;
int BASE_ITEM_DROID_REPAIR_EQUIPMENT     = 56;
int BASE_ITEM_CREDITS                    = 57;
int BASE_ITEM_TRAP_KIT                   = 58;
int BASE_ITEM_SECURITY_SPIKES            = 59;
int BASE_ITEM_PROGRAMMING_SPIKES         = 60;
int BASE_ITEM_GLOW_ROD                   = 61;
int BASE_ITEM_COLLAR_LIGHT               = 62;
int BASE_ITEM_TORCH                      = 63;
int BASE_ITEM_PLOT_USEABLE_ITEMS         = 64;
int BASE_ITEM_AESTHETIC_ITEM             = 65;
int BASE_ITEM_DROID_LIGHT_PLATING        = 66;
int BASE_ITEM_DROID_MEDIUM_PLATING       = 67;
int BASE_ITEM_DROID_HEAVY_PLATING        = 68;
int BASE_ITEM_DROID_SEARCH_SCOPE         = 69;
int BASE_ITEM_DROID_MOTION_SENSORS       = 70;
int BASE_ITEM_DROID_SONIC_SENSORS        = 71;
int BASE_ITEM_DROID_TARGETING_COMPUTERS  = 72;
int BASE_ITEM_DROID_COMPUTER_SPIKE_MOUNT = 73;
int BASE_ITEM_DROID_SECURITY_SPIKE_MOUNT = 74;
int BASE_ITEM_DROID_SHIELD               = 75;
int BASE_ITEM_DROID_UTILITY_DEVICE       = 76;
int BASE_ITEM_BLASTER_RIFLE              = 77;
int BASE_ITEM_GHAFFI_STICK               = 78;
int BASE_ITEM_WOOKIE_WARBLADE            = 79;
int BASE_ITEM_GAMMOREAN_BATTLEAXE        = 80;
int BASE_ITEM_CREATURE_ITEM_SLASH        = 81;
int BASE_ITEM_CREATURE_ITEM_PIERCE       = 82;
int BASE_ITEM_CREATURE_WEAPON_SL_PRC     = 83;
int BASE_ITEM_CREATURE_HIDE_ITEM         = 84;
int BASE_ITEM_BASIC_CLOTHING             = 85;
int BASE_ITEM_WRIST_LAUNCHER             = 91;
int BASE_ITEM_FORCE_PIKE                 = 93; // DJS-OEI 8/19/2004

int BASE_ITEM_INVALID = 256;


// AMF: These constants define attack results
int ATTACK_RESULT_INVALID               = 0;
int ATTACK_RESULT_HIT_SUCCESSFUL        = 1;
int ATTACK_RESULT_CRITICAL_HIT          = 2;
int ATTACK_RESULT_AUTOMATIC_HIT         = 3;

int ATTACK_RESULT_MISS                  = 4;
int ATTACK_RESULT_ATTACK_RESISTED       = 5;
int ATTACK_RESULT_ATTACK_FAILED         = 6;

int ATTACK_RESULT_PARRIED               = 8;
int ATTACK_RESULT_DEFLECTED     = 9;


// these match the constants in visualeffects.2da
int VFX_NONE                               = -1;

int VFX_IMP_HEALING_SMALL                  = 1001;
int VFX_IMP_FORCE_JUMP_ADVANCED            = 1002;
int VFX_PRO_AFFLICT                        = 1003;
int VFX_IMP_CHOKE                          = 1004;
int VFX_IMP_CURE                           = 1005;
int VFX_PRO_DEATH_FIELD                    = 1006;
int VFX_PRO_DROID_DISABLE                  = 1007;
int VFX_PRO_DROID_KILL                     = 1008;
int VFX_PRO_DRAIN                          = 1009;
int VFX_PRO_FORCE_ARMOR                    = 1010;
int VFX_PRO_FORCE_AURA                     = 1011;
int VFX_IMP_FORCE_BREACH                   = 1012;
int VFX_IMP_FORCE_PUSH                     = 1014;
int VFX_PRO_FORCE_SHIELD                   = 1015;
int VFX_IMP_FORCE_WAVE                     = 1017;
int VFX_IMP_FORCE_WHIRLWIND                = 1018;
int VFX_IMP_HEAL                           = 1019;
int VFX_IMP_SPEED_KNIGHT                   = 1020;
int VFX_PRO_LIGHTNING_L                    = 1021;
int VFX_IMP_SPEED_MASTERY                  = 1022;
int VFX_PRO_RESIST_ELEMENTS                = 1025;
int VFX_PRO_RESIST_FORCE                   = 1026;
int VFX_PRO_RESIST_POISON                  = 1027;
int VFX_PRO_LIGHTNING_S                    = 1028;
int VFX_IMP_MIND_FORCE                     = 1031;
int VFX_IMP_SUPPRESS_FORCE                 = 1032;
int VFX_IMP_MIND_KINIGHT                   = 1033;
int VFX_IMP_MIND_MASTERY                   = 1034;
int VFX_PRO_LIGHTNING_JEDI                 = 1035;
int VFX_PRO_LIGHTNING_L_SOUND              = 1036;
int VFX_IMP_GRENADE_ADHESIVE_PERSONAL      = 1038;
int VFX_IMP_FLAME                          = 1039;
int VFX_IMP_STUN                           = 1040;

int VFX_DUR_STEALTH_PULSE                  = 2000;
int VFX_DUR_INVISIBILITY                   = 2001;
int VFX_DUR_SPEED                          = 2004;
int VFX_DUR_FORCE_WHIRLWIND                = 2007;
int VFX_DUR_HOLD                           = 2008;
int VFX_DUR_BODY_FUAL                      = 2024;
int VFX_DUR_PSYCHIC_STATIC                 = 2025;
int VFX_BEAM_DEATH_FIELD_TENTACLE          = 2026;
int VFX_BEAM_DROID_DISABLE                 = 2027;
int VFX_BEAM_DROID_DESTROY                 = 2028;
int VFX_BEAM_DRAIN_LIFE                    = 2029;
int VFX_DUR_KNIGHTS_SPEED                  = 2031;
int VFX_DUR_SHIELD_RED_MARK_I              = 2032;
int VFX_DUR_SHIELD_RED_MARK_II             = 2034;
int VFX_DUR_SHIELD_RED_MARK_IV             = 2035;
int VFX_BEAM_LIGHTNING_DARK_S              = 2037;
int VFX_BEAM_LIGHTNING_DARK_L              = 2038;
int VFX_DUR_SHIELD_BLUE_01                 = 2040;
int VFX_DUR_SHIELD_BLUE_02                 = 2041;
int VFX_DUR_SHIELD_BLUE_03                 = 2042;
int VFX_DUR_SHIELD_BLUE_04                 = 2043;
int VFX_DUR_SHIELD_GREEN_01                = 2044;
int VFX_DUR_SHIELD_RED_01                  = 2045;
int VFX_DUR_SHIELD_RED_02                  = 2046;
int VFX_DUR_SHIELD_CHROME_01               = 2047;
int VFX_DUR_SHIELD_CHROME_02               = 2048;
int VFX_BEAM_ION_RAY_01                    = 2049;
int VFX_BEAM_ION_RAY_02                    = 2050;
int VFX_BEAM_COLD_RAY                      = 2051;
int VFX_BEAM_STUN_RAY                      = 2052;
int VFX_BEAM_FLAME_SPRAY                   = 2053;
int VFX_DUR_CARBONITE_ENCASING             = 2054;
int VFX_DUR_CARBONITE_CHUNKS               = 2055;
int VFX_DUR_SHIELD_BLUE_MARK_I             = 2056;
int VFX_DUR_SHIELD_BLUE_MARK_II            = 2058;
int VFX_DUR_SHIELD_BLUE_MARK_IV            = 2059;
int VFX_DUR_ELECTRICAL_SPARK               = 2067;

int VFX_FNF_FORCE_WAVE                     = 3001;
int VFX_FNF_PLOT_MAN_SONIC_WAVE            = 3002;
int VFX_FNF_GRENADE_FRAGMENTATION          = 3003;
int VFX_FNF_GRENADE_STUN                   = 3004;
int VFX_FNF_GRENADE_THERMAL_DETONATOR      = 3005;
int VFX_FNF_GRENADE_POISON                 = 3006;
int VFX_FNF_GRENADE_SONIC                  = 3007;
int VFX_FNF_GRENADE_ADHESIVE               = 3008;
int VFX_FNF_GRENADE_CRYOBAN                = 3009;
int VFX_FNF_GRENADE_PLASMA                 = 3010;
int VFX_FNF_GRENADE_ION                    = 3011;
int VFX_FNF_GRAVITY_GENERATOR              = 3013;

int VFX_COM_SPARKS_LARGE                   = 4003;
int VFX_COM_SPARKS_LIGHTSABER              = 4004;
int VFX_COM_SPARKS_PARRY_METAL             = 4011;
int VFX_COM_POWER_ATTACK_IMPROVED_STAFF    = 4012;
int VFX_COM_POWER_BLAST_IMPROVED           = 4013;
int VFX_COM_CRITICAL_STRIKE_IMPROVED_STAFF = 4014;
int VFX_COM_SNIPER_SHOT_IMPROVED           = 4015;
int VFX_COM_MULTI_SHOT                     = 4016;
int VFX_COM_WHIRLWIND_STRIKE_STAFF         = 4017;
int VFX_COM_CRITICAL_STRIKE_MASTERY_STAFF  = 4018;
int VFX_COM_POWER_ATTACK_MASTERY_STAFF     = 4019;
int VFX_COM_SNIPER_SHOT_MASTERY            = 4020;
int VFX_COM_FLURRY_IMPROVED_STAFF          = 4021;
int VFX_COM_RAPID_SHOT_IMPROVED            = 4022;
int VFX_COM_BLASTER_DEFLECTION             = 4023;
int VFX_COM_BLASTER_IMPACT                 = 4024;
int VFX_COM_CRITICAL_STRIKE_IMPROVED_SABER = 4025;
int VFX_COM_CRITICAL_STRIKE_MASTERY_SABER  = 4026;
int VFX_COM_POWER_ATTACK_IMPROVED_SABER    = 4027;
int VFX_COM_POWER_ATTACK_MASTERY_SABER     = 4028;
int VFX_COM_POWER_BLAST_MASTERY            = 4029;
int VFX_COM_FLURRY_IMPROVED_SABER          = 4030;
int VFX_COM_WHIRLWIND_STRIKE_SABER         = 4031;
int VFX_COM_BLASTER_IMPACT_GROUND          = 4032;
int VFX_COM_SPARKS_BLASTER                 = 4033;
int VFX_COM_DROID_EXPLOSION_1              = 4034;
int VFX_COM_DROID_EXPLOSION_2              = 4035;
int VFX_COM_JEDI_FORCE_FIZZLE              = 4036;
int VFX_COM_FORCE_RESISTED                 = 4037;

int VFX_ARD_LIGHT_YELLOW_10                = 5000;
int VFX_ARD_LIGHT_YELLOW_20                = 5001;
int VFX_ARD_LIGHT_BLIND                    = 5002;
int VFX_ARD_HEAT_SHIMMER                   = 5003;

int VFX_IMP_MIRV                           = 6000;
int VFX_IMP_MIRV_IMPACT                    = 6001;
int VFX_IMP_SCREEN_SHAKE                   = 6002;

int VFX_DUR_HOLO_PROJECT           = 9010;  // DJS-OEI 9/15/2004

int AOE_PER_FOGACID                = 0;
int AOE_PER_FOGFIRE                = 1;
int AOE_PER_FOGSTINK               = 2;
int AOE_PER_FOGKILL                = 3;
int AOE_PER_FOGMIND                = 4;
int AOE_PER_WALLFIRE               = 5;
int AOE_PER_WALLWIND               = 6;
int AOE_PER_WALLBLADE              = 7;
int AOE_PER_WEB                    = 8;
int AOE_PER_ENTANGLE               = 9;
//int AOE_PER_CHAOS = 10;
int AOE_PER_DARKNESS               = 11;
int AOE_MOB_CIRCEVIL               = 12;
int AOE_MOB_CIRCGOOD               = 13;
int AOE_MOB_CIRCLAW                = 14;
int AOE_MOB_CIRCCHAOS              = 15;
int AOE_MOB_FEAR                   = 16;
int AOE_MOB_BLINDING               = 17;
int AOE_MOB_UNEARTHLY              = 18;
int AOE_MOB_MENACE                 = 19;
int AOE_MOB_UNNATURAL              = 20;
int AOE_MOB_STUN                   = 21;
int AOE_MOB_PROTECTION             = 22;
int AOE_MOB_FIRE                   = 23;
int AOE_MOB_FROST                  = 24;
int AOE_MOB_ELECTRICAL             = 25;
int AOE_PER_FOGGHOUL               = 26;
int AOE_MOB_TYRANT_FOG             = 27;
int AOE_PER_STORM                  = 28;
int AOE_PER_INVIS_SPHERE           = 29;
int AOE_MOB_SILENCE                = 30;
int AOE_PER_DELAY_BLAST_FIREBALL   = 31;
int AOE_PER_GREASE                 = 32;
int AOE_PER_CREEPING_DOOM          = 33;
int AOE_PER_EVARDS_BLACK_TENTACLES = 34;
int AOE_MOB_INVISIBILITY_PURGE     = 35;
int AOE_MOB_DRAGON_FEAR            = 36;

// DJS-OEI 7/21/2004
// Form re-design.
/*
// DJS-OEI 3/28/2004
// These masks are used in Spells.2DA to indicate which spells
// can be affected by which Forms. Unfortunately, the script compiler
// won't let me make a constant with a Hex value, so I've had to use
// decimal.
int FORM_MASK_FORCE_FOCUS                       = 1;
int FORM_MASK_ENDURING_FORCE                    = 2;
int FORM_MASK_FORCE_AMPLIFICATION               = 4;
int FORM_MASK_FORCE_POTENCY                     = 8;
int FORM_MASK_REGENERATION                      = 16;
int FORM_MASK_POWER_OF_THE_DARK_SIDE            = 32;
*/

// these constants match those in spell.2da
int FORCE_POWER_ALL_FORCE_POWERS            = -1;  // used for spell immunity.
int FORCE_POWER_MASTER_ALTER                = 0;
int FORCE_POWER_MASTER_CONTROL              = 1;
int FORCE_POWER_MASTER_SENSE                = 2;
int FORCE_POWER_FORCE_JUMP_ADVANCED         = 3;
int FORCE_POWER_LIGHT_SABER_THROW_ADVANCED  = 4;
int FORCE_POWER_REGNERATION_ADVANCED        = 5;
int FORCE_POWER_AFFECT_MIND                 = 6;
int FORCE_POWER_AFFLICTION                  = 7;
int FORCE_POWER_SPEED_BURST                 = 8;
int FORCE_POWER_CHOKE                       = 9;
int FORCE_POWER_CURE                        = 10;
int FORCE_POWER_DEATH_FIELD                 = 11;
int FORCE_POWER_DROID_DISABLE               = 12;
int FORCE_POWER_DROID_DESTROY               = 13;
int FORCE_POWER_DOMINATE                    = 14;
int FORCE_POWER_DRAIN_LIFE                  = 15;
int FORCE_POWER_FEAR                        = 16;
int FORCE_POWER_FORCE_ARMOR                 = 17;
int FORCE_POWER_FORCE_AURA                  = 18;
int FORCE_POWER_FORCE_BREACH                = 19;
int FORCE_POWER_FORCE_IMMUNITY              = 20;
int FORCE_POWER_FORCE_JUMP                  = 21;
int FORCE_POWER_FORCE_MIND                  = 22;
int FORCE_POWER_FORCE_PUSH                  = 23;
int FORCE_POWER_FORCE_SHIELD                = 24;
int FORCE_POWER_FORCE_STORM                 = 25;
int FORCE_POWER_FORCE_WAVE                  = 26;
int FORCE_POWER_FORCE_WHIRLWIND             = 27;
int FORCE_POWER_HEAL                        = 28;
int FORCE_POWER_HOLD                        = 29;
int FORCE_POWER_HORROR                      = 30;
int FORCE_POWER_INSANITY                    = 31;
int FORCE_POWER_KILL                        = 32;
int FORCE_POWER_KNIGHT_MIND                 = 33;
int FORCE_POWER_KNIGHT_SPEED                = 34;
int FORCE_POWER_LIGHTNING                   = 35;
int FORCE_POWER_MIND_MASTERY                = 36;
int FORCE_POWER_SPEED_MASTERY               = 37;
int FORCE_POWER_PLAGUE                      = 38;
int FORCE_POWER_REGENERATION                = 39;
int FORCE_POWER_RESIST_COLD_HEAT_ENERGY     = 40;
int FORCE_POWER_RESIST_FORCE                = 41;
int FORCE_POWER_RESIST_POISON_DISEASE_SONIC = 42;
int FORCE_POWER_SHOCK                       = 43;
int FORCE_POWER_SLEEP                       = 44;
int FORCE_POWER_SLOW                        = 45;
int FORCE_POWER_STUN                        = 46;
int FORCE_POWER_DROID_STUN                  = 47;
int FORCE_POWER_SUPRESS_FORCE               = 48;
int FORCE_POWER_LIGHT_SABER_THROW           = 49;
int FORCE_POWER_WOUND                       = 50;
int SPECIAL_ABILITY_BATTLE_MEDITATION       = 51;
int SPECIAL_ABILITY_BODY_FUEL               = 52;
int SPECIAL_ABILITY_COMBAT_REGENERATION     = 53;
int SPECIAL_ABILITY_WARRIOR_STANCE          = 54;
int SPECIAL_ABILITY_SENTINEL_STANCE         = 55;
int SPECIAL_ABILITY_DOMINATE_MIND           = 56;
int SPECIAL_ABILITY_PSYCHIC_STANCE          = 57;
int SPECIAL_ABILITY_CATHAR_REFLEXES         = 58;
int SPECIAL_ABILITY_ENHANCED_SENSES         = 59;
int SPECIAL_ABILITY_CAMOFLAGE               = 60;
int SPECIAL_ABILITY_TAUNT                   = 61;
int SPECIAL_ABILITY_WHIRLING_DERVISH        = 62;
int SPECIAL_ABILITY_RAGE                    = 63;

// DJS-OEI 12/9/2003
// New Force Powers
int FORCE_POWER_MASTER_ENERGY_RESISTANCE        = 133;
int FORCE_POWER_MASTER_HEAL                     = 134;
int FORCE_POWER_FORCE_BARRIER                   = 135;
int FORCE_POWER_IMPROVED_FORCE_BARRIER          = 136;
int FORCE_POWER_MASTER_FORCE_BARRIER            = 137;
int FORCE_POWER_BATTLE_MEDITATION_PC            = 138;  // Only PCs, CNPCs, and Friendly allies should cast
int FORCE_POWER_IMPROVED_BATTLE_MEDITATION_PC   = 139;  // these versions of Battle Meditation.
int FORCE_POWER_MASTER_BATTLE_MEDITATION_PC     = 140;  //
int FORCE_POWER_BAT_MED_ENEMY                   = 141;  // Only hostile creatures should cast
int FORCE_POWER_IMP_BAT_MED_ENEMY               = 142;  // these versions of Battle Meditation.
int FORCE_POWER_MAS_BAT_MED_ENEMY               = 143;  //
int FORCE_POWER_CRUSH_OPPOSITION_I              = 144;
int FORCE_POWER_CRUSH_OPPOSITION_II             = 145;
int FORCE_POWER_CRUSH_OPPOSITION_III            = 146;
int FORCE_POWER_CRUSH_OPPOSITION_IV             = 147;
int FORCE_POWER_CRUSH_OPPOSITION_V              = 148;
int FORCE_POWER_CRUSH_OPPOSITION_VI             = 149;
int FORCE_POWER_FORCE_BODY                      = 150;
int FORCE_POWER_IMPROVED_FORCE_BODY             = 151;
int FORCE_POWER_MASTER_FORCE_BODY               = 152;
int FORCE_POWER_DRAIN_FORCE                     = 153;
int FORCE_POWER_IMPROVED_DRAIN_FORCE            = 154;
int FORCE_POWER_MASTER_DRAIN_FORCE              = 155;
int FORCE_POWER_FORCE_CAMOUFLAGE                = 156;
int FORCE_POWER_IMPROVED_FORCE_CAMOUFLAGE       = 157;
int FORCE_POWER_MASTER_FORCE_CAMOUFLAGE         = 158;
int FORCE_POWER_FORCE_SCREAM                    = 159;
int FORCE_POWER_IMPROVED_FORCE_SCREAM           = 160;
int FORCE_POWER_MASTER_FORCE_SCREAM             = 161;
int FORCE_POWER_FORCE_REPULSION                 = 162;
int FORCE_POWER_FORCE_REDIRECTION               = 163;
int FORCE_POWER_FURY                            = 164;
int FORCE_POWER_IMPROVED_FURY                   = 165;
int FORCE_POWER_MASTER_FURY                     = 166;
int FORCE_POWER_INSPIRE_FOLLOWERS_I             = 167;
int FORCE_POWER_INSPIRE_FOLLOWERS_II            = 168;
int FORCE_POWER_INSPIRE_FOLLOWERS_III           = 169;
int FORCE_POWER_INSPIRE_FOLLOWERS_IV            = 170;
int FORCE_POWER_INSPIRE_FOLLOWERS_V             = 171;
int FORCE_POWER_INSPIRE_FOLLOWERS_VI            = 172;
int FORCE_POWER_REVITALIZE                      = 173;
int FORCE_POWER_IMPROVED_REVITALIZE             = 174;
int FORCE_POWER_MASTER_REVITALIZE               = 175;
int FORCE_POWER_FORCE_SIGHT                     = 176;
int FORCE_POWER_FORCE_CRUSH                     = 177;
int FORCE_POWER_PRECOGNITION                    = 178;
int FORCE_POWER_BATTLE_PRECOGNITION             = 179;
int FORCE_POWER_FORCE_ENLIGHTENMENT             = 180;
int FORCE_POWER_MIND_TRICK                      = 181;
int FORCE_POWER_CONFUSION                       = 200;
int FORCE_POWER_BEAST_TRICK                     = 182;
int FORCE_POWER_BEAST_CONFUSION                 = 184;
int FORCE_POWER_DROID_TRICK                     = 201;
int FORCE_POWER_DROID_CONFUSION                 = 269;
int FORCE_POWER_BREATH_CONTROL                  = 270;
int FORCE_POWER_WOOKIEE_RAGE_I                  = 271;
int FORCE_POWER_WOOKIEE_RAGE_II                 = 272;
int FORCE_POWER_WOOKIEE_RAGE_III                = 273;

// DJS-OEI 7/21/2004
// Form re-design.
/*
// DJS-OEI 3/25/2004
int FORM_LIGHTSABER_PADAWAN_I                   = 205;
int FORM_LIGHTSABER_PADAWAN_II                  = 206;
int FORM_LIGHTSABER_PADAWAN_III                 = 207;
int FORM_LIGHTSABER_DAKLEAN_I                   = 208;
int FORM_LIGHTSABER_DAKLEAN_II                  = 209;
int FORM_LIGHTSABER_DAKLEAN_III                 = 210;
int FORM_LIGHTSABER_SENTINEL_I                  = 211;
int FORM_LIGHTSABER_SENTINEL_II                 = 212;
int FORM_LIGHTSABER_SENTINEL_III                = 213;
int FORM_LIGHTSABER_SODAK_I                     = 214;
int FORM_LIGHTSABER_SODAK_II                    = 215;
int FORM_LIGHTSABER_SODAK_III                   = 216;
int FORM_LIGHTSABER_ANCIENT_I                   = 217;
int FORM_LIGHTSABER_ANCIENT_II                  = 218;
int FORM_LIGHTSABER_ANCIENT_III                 = 219;
int FORM_LIGHTSABER_MASTER_I                    = 220;
int FORM_LIGHTSABER_MASTER_II                   = 221;
int FORM_LIGHTSABER_MASTER_III                  = 222;
int FORM_CONSULAR_FORCE_FOCUS_I                 = 223;
int FORM_CONSULAR_FORCE_FOCUS_II                = 224;
int FORM_CONSULAR_FORCE_FOCUS_III               = 225;
int FORM_CONSULAR_ENDURING_FORCE_I              = 226;
int FORM_CONSULAR_ENDURING_FORCE_II             = 227;
int FORM_CONSULAR_ENDURING_FORCE_III            = 228;
int FORM_CONSULAR_FORCE_AMPLIFICATION_I         = 229;
int FORM_CONSULAR_FORCE_AMPLIFICATION_II        = 230;
int FORM_CONSULAR_FORCE_AMPLIFICATION_III       = 231;
int FORM_CONSULAR_FORCE_SHELL_I                 = 232;
int FORM_CONSULAR_FORCE_SHELL_II                = 233;
int FORM_CONSULAR_FORCE_SHELL_III               = 234;
int FORM_CONSULAR_FORCE_POTENCY_I               = 235;
int FORM_CONSULAR_FORCE_POTENCY_II              = 236;
int FORM_CONSULAR_FORCE_POTENCY_III             = 237;
int FORM_CONSULAR_REGENERATION_I                = 238;
int FORM_CONSULAR_REGENERATION_II               = 239;
int FORM_CONSULAR_REGENERATION_III              = 240;
int FORM_CONSULAR_POWER_OF_THE_DARK_SIDE_I      = 241;
int FORM_CONSULAR_POWER_OF_THE_DARK_SIDE_II     = 242;
int FORM_CONSULAR_POWER_OF_THE_DARK_SIDE_III    = 243;
*/

int FORM_SABER_I_SHII_CHO                       = 258;
int FORM_SABER_II_MAKASHI                       = 259;
int FORM_SABER_III_SORESU                       = 260;
int FORM_SABER_IV_ATARU                         = 261;
int FORM_SABER_V_SHIEN                          = 262;
int FORM_SABER_VI_NIMAN                         = 263;
int FORM_SABER_VII_JUYO                         = 264;
int FORM_FORCE_I_FOCUS                          = 265;
int FORM_FORCE_II_POTENCY                       = 266;
int FORM_FORCE_III_AFFINITY                     = 267;
int FORM_FORCE_IV_MASTERY                       = 268;

// these constants must match those in poison.2da

int POISON_ABILITY_SCORE_MILD     = 0;
int POISON_ABILITY_SCORE_AVERAGE  = 1;
int POISON_ABILITY_SCORE_VIRULENT = 2;
int POISON_DAMAGE_MILD            = 3;
int POISON_DAMAGE_AVERAGE         = 4;
int POISON_DAMAGE_VIRULENT        = 5;
int POISON_ABILITY_AND_DAMAGE_AVERAGE  = 6;
int POISON_ABILITY_AND_DAMAGE_VIRULENT = 7;
int POISON_DAMAGE_ROCKET          = 8; // DJS-OEI 4/12/2004
int POISON_DAMAGE_NORMAL_DART     = 9; // DJS-OEI 4/13/2004
int POISON_DAMAGE_KYBER_DART      = 10; // DJS-OEI 4/13/2004
int POISON_DAMAGE_KYBER_DART_HALF = 11; // DJS-OEI 4/13/2004

// the thing after CREATURE_TYPE_ should refer to the
// actual "subtype" in the lists given above.
int CREATURE_TYPE_RACIAL_TYPE     = 0;
int CREATURE_TYPE_PLAYER_CHAR     = 1;
int CREATURE_TYPE_CLASS           = 2;
int CREATURE_TYPE_REPUTATION      = 3;
int CREATURE_TYPE_IS_ALIVE        = 4;
int CREATURE_TYPE_HAS_SPELL_EFFECT = 5;
int CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT = 6;
int CREATURE_TYPE_PERCEPTION                = 7;
//int CREATURE_TYPE_ALIGNMENT       = 2;

int REPUTATION_TYPE_FRIEND        = 0;
int REPUTATION_TYPE_ENEMY         = 1;
int REPUTATION_TYPE_NEUTRAL       = 2;

int PERCEPTION_SEEN_AND_HEARD           = 0;
int PERCEPTION_NOT_SEEN_AND_NOT_HEARD   = 1;
int PERCEPTION_HEARD_AND_NOT_SEEN       = 2;
int PERCEPTION_SEEN_AND_NOT_HEARD       = 3;
int PERCEPTION_NOT_HEARD                = 4;
int PERCEPTION_HEARD                    = 5;
int PERCEPTION_NOT_SEEN                 = 6;
int PERCEPTION_SEEN                     = 7;

int PLAYER_CHAR_NOT_PC            = FALSE;
int PLAYER_CHAR_IS_PC             = TRUE;

int CLASS_TYPE_SOLDIER       = 0;
int CLASS_TYPE_SCOUT         = 1;
int CLASS_TYPE_SCOUNDREL     = 2;
int CLASS_TYPE_JEDIGUARDIAN  = 3;
int CLASS_TYPE_JEDICONSULAR  = 4;
int CLASS_TYPE_JEDISENTINEL  = 5;
int CLASS_TYPE_COMBATDROID   = 6;
int CLASS_TYPE_EXPERTDROID   = 7;
int CLASS_TYPE_MINION        = 8;

// DJS-OEI 2/11/2004
int CLASS_TYPE_TECHSPECIALIST    = 9;
int CLASS_TYPE_BOUNTYHUNTER      = 10;  // Cut, I believe
int CLASS_TYPE_JEDIWEAPONMASTER  = 11;
int CLASS_TYPE_JEDIMASTER        = 12;
int CLASS_TYPE_JEDIWATCHMAN      = 13;
int CLASS_TYPE_SITHMARAUDER      = 14;
int CLASS_TYPE_SITHLORD          = 15;
int CLASS_TYPE_SITHASSASSIN      = 16;


int CLASS_TYPE_INVALID   = 255;

// These are for GetFirstInPersistentObject() and GetNextInPersistentObject()
int PERSISTENT_ZONE_ACTIVE = 0;
int PERSISTENT_ZONE_FOLLOW = 1;

int INVALID_STANDARD_FACTION        = -1;
int STANDARD_FACTION_HOSTILE_1      = 1;
int STANDARD_FACTION_FRIENDLY_1     = 2;
int STANDARD_FACTION_HOSTILE_2      = 3;
int STANDARD_FACTION_FRIENDLY_2     = 4;
int STANDARD_FACTION_NEUTRAL        = 5;
int STANDARD_FACTION_INSANE         = 6;
int STANDARD_FACTION_PTAT_TUSKAN    = 7;
int STANDARD_FACTION_GLB_XOR        = 8;
int STANDARD_FACTION_SURRENDER_1    = 9;
int STANDARD_FACTION_SURRENDER_2    = 10;
int STANDARD_FACTION_PREDATOR       = 11;
int STANDARD_FACTION_PREY           = 12;
int STANDARD_FACTION_TRAP           = 13;
int STANDARD_FACTION_ENDAR_SPIRE    = 14;
int STANDARD_FACTION_RANCOR         = 15;
int STANDARD_FACTION_GIZKA_1        = 16;
int STANDARD_FACTION_GIZKA_2        = 17;
// DJS-OEI 2/25/2004
int STANDARD_FACTION_SELF_LOATHING  = 21;
int STANDARD_FACTION_ONE_ON_ONE     = 22;
int STANDARD_FACTION_PARTYPUPPET    = 23;

// Skill defines
int SKILL_COMPUTER_USE    = 0;
int SKILL_DEMOLITIONS     = 1;
int SKILL_STEALTH         = 2;
int SKILL_AWARENESS       = 3;
int SKILL_PERSUADE        = 4;
int SKILL_REPAIR          = 5;
int SKILL_SECURITY        = 6;
int SKILL_TREAT_INJURY    = 7;
int SKILL_MAX_SKILLS      = 8;

int SUBSKILL_FLAGTRAP      = 100;
int SUBSKILL_RECOVERTRAP   = 101;
int SUBSKILL_EXAMINETRAP   = 102;

// FEATS
//int FEAT_ADVANCED_DODGE                        = 0;
int FEAT_ADVANCED_JEDI_DEFENSE                 = 1;
int FEAT_ADVANCED_GUARD_STANCE                 = 2;
int FEAT_AMBIDEXTERITY                         = 3;
int FEAT_ARMOUR_PROF_HEAVY                     = 4;
int FEAT_ARMOUR_PROF_LIGHT                     = 5;
int FEAT_ARMOUR_PROF_MEDIUM                    = 6;
int FEAT_CAUTIOUS                              = 7;
int FEAT_CRITICAL_STRIKE                       = 8;
int FEAT_DOUBLE_WEAPON_FIGHTING                = 9;
int FEAT_EMPATHY                               = 10;
int FEAT_FLURRY                                = 11;
int FEAT_GEAR_HEAD                             = 12;
int FEAT_GREAT_FORTITUDE                       = 13;
int FEAT_IMPLANT_LEVEL_1                       = 14;
int FEAT_IMPLANT_LEVEL_2                       = 15;
int FEAT_IMPLANT_LEVEL_3                       = 16;
int FEAT_IMPROVED_POWER_ATTACK                 = 17;
int FEAT_IMPROVED_POWER_BLAST                  = 18;
int FEAT_IMPROVED_CRITICAL_STRIKE              = 19;
int FEAT_IMPROVED_SNIPER_SHOT                  = 20;
int FEAT_IRON_WILL                             = 21;
int FEAT_LIGHTNING_REFLEXES                    = 22;
//int FEAT_MASTER_DODGE                         = 23;
int FEAT_MASTER_JEDI_DEFENSE                   = 24;
int FEAT_MASTER_GUARD_STANCE                   = 25;
int FEAT_MULTI_SHOT                            = 26;
int FEAT_PERCEPTIVE                            = 27;
int FEAT_POWER_ATTACK                          = 28;
int FEAT_POWER_BLAST                           = 29;
int FEAT_RAPID_SHOT                            = 30;
int FEAT_SNIPER_SHOT                           = 31;
int FEAT_WEAPON_FOCUS_BLASTER                  = 32;
int FEAT_WEAPON_FOCUS_BLASTER_RIFLE            = 33;
int FEAT_WEAPON_FOCUS_GRENADE                  = 34;
int FEAT_WEAPON_FOCUS_HEAVY_WEAPONS            = 35;
int FEAT_WEAPON_FOCUS_LIGHTSABER               = 36;
int FEAT_WEAPON_FOCUS_MELEE_WEAPONS            = 37;
int FEAT_WEAPON_FOCUS_SIMPLE_WEAPONS           = 38;
int FEAT_WEAPON_PROFICIENCY_BLASTER            = 39;
int FEAT_WEAPON_PROFICIENCY_BLASTER_RIFLE      = 40;
int FEAT_WEAPON_PROFICIENCY_GRENADE            = 41;
int FEAT_WEAPON_PROFICIENCY_HEAVY_WEAPONS      = 42;
int FEAT_WEAPON_PROFICIENCY_LIGHTSABER         = 43;
int FEAT_WEAPON_PROFICIENCY_MELEE_WEAPONS      = 44;
int FEAT_WEAPON_PROFICIENCY_SIMPLE_WEAPONS     = 45;
int FEAT_WEAPON_SPECIALIZATION_BLASTER         = 46;
int FEAT_WEAPON_SPECIALIZATION_BLASTER_RIFLE   = 47;
int FEAT_WEAPON_SPECIALIZATION_GRENADE         = 48;
int FEAT_WEAPON_SPECIALIZATION_HEAVY_WEAPONS   = 49;
int FEAT_WEAPON_SPECIALIZATION_LIGHTSABER      = 50;
int FEAT_WEAPON_SPECIALIZATION_MELEE_WEAPONS   = 51;
int FEAT_WEAPON_SPECIALIZATION_SIMPLE_WEAPONS  = 52;
int FEAT_WHIRLWIND_ATTACK                      = 53;
int FEAT_GUARD_STANCE                          = 54;
int FEAT_JEDI_DEFENSE                          = 55;
int FEAT_UNCANNY_DODGE_1                       = 56;
int FEAT_UNCANNY_DODGE_2                       = 57;
int FEAT_SKILL_FOCUS_COMPUTER_USE              = 58;
//int FEAT_DODGE                                 = 59;
int FEAT_SNEAK_ATTACK_1D6                      = 60;
int FEAT_SNEAK_ATTACK_2D6                      = 61;
int FEAT_SNEAK_ATTACK_3D6                      = 62;
int FEAT_SNEAK_ATTACK_4D6                      = 63;
int FEAT_SNEAK_ATTACK_5D6                      = 64;
int FEAT_SNEAK_ATTACK_6D6                      = 65;
int FEAT_SNEAK_ATTACK_7D6                      = 66;
int FEAT_SNEAK_ATTACK_8D6                      = 67;
int FEAT_SNEAK_ATTACK_9D6                      = 68;
int FEAT_SNEAK_ATTACK_10D6                     = 69;
int FEAT_SKILL_FOCUS_DEMOLITIONS               = 70;
int FEAT_SKILL_FOCUS_STEALTH                   = 71;
int FEAT_SKILL_FOCUS_AWARENESS                 = 72;
int FEAT_SKILL_FOCUS_PERSUADE                  = 73;
int FEAT_SKILL_FOCUS_REPAIR                    = 74;
int FEAT_SKILL_FOCUS_SECURITY                  = 75;
int FEAT_SKILL_FOCUS_TREAT_INJUURY             = 76;
int FEAT_MASTER_SNIPER_SHOT                    = 77;
int FEAT_DROID_UPGRADE_1                       = 78;
int FEAT_DROID_UPGRADE_2                       = 79;
int FEAT_DROID_UPGRADE_3                       = 80;
int FEAT_MASTER_CRITICAL_STRIKE                = 81;
int FEAT_MASTER_POWER_BLAST                    = 82;
int FEAT_MASTER_POWER_ATTACK                   = 83;
int FEAT_TOUGHNESS                             = 84;
int FEAT_ADVANCED_DOUBLE_WEAPON_FIGHTING       = 85;
int FEAT_FORCE_FOCUS_ALTER                     = 86;
int FEAT_FORCE_FOCUS_CONTROL                   = 87;
int FEAT_FORCE_FOCUS_SENSE                     = 88;
int FEAT_FORCE_FOCUS_ADVANCED                  = 89;
int FEAT_FORCE_FOCUS_MASTERY                   = 90;
int FEAT_IMPROVED_FLURRY                       = 91;
int FEAT_IMPROVED_RAPID_SHOT                   = 92;
int FEAT_PROFICIENCY_ALL                       = 93;
int FEAT_BATTLE_MEDITATION                     = 94;
// DJS-OEI 11/12/2003
int FEAT_EVASION                               = 125;
int FEAT_TARGETING_1                           = 126;
int FEAT_TARGETING_2                           = 127;
int FEAT_TARGETING_3                           = 128;
int FEAT_TARGETING_4                           = 129;
int FEAT_TARGETING_5                           = 130;
int FEAT_TARGETING_6                           = 131;
int FEAT_TARGETING_7                           = 132;
int FEAT_TARGETING_8                           = 133;
int FEAT_TARGETING_9                           = 134;
int FEAT_TARGETING_10                          = 135;
// DJS-OEI 10/5/2004
// Moved down to 240+
/*
int FEAT_PRECISE_SHOT                          = 136;
int FEAT_IMPROVED_PRECISE_SHOT                 = 137;
int FEAT_MASTER_PRECISE_SHOT                   = 138;
*/
int FEAT_CLOSE_COMBAT                          = 139;
int FEAT_IMPROVED_CLOSE_COMBAT                 = 140;
int FEAT_IMPROVED_FORCE_CAMOUFLAGE             = 141;
int FEAT_MASTER_FORCE_CAMOUFLAGE               = 142;
int FEAT_REGENERATE_FORCE_POINTS               = 143;
int FEAT_DARK_SIDE_CORRUPTION                  = 149;
int FEAT_IGNORE_PAIN_1                         = 150;
int FEAT_IGNORE_PAIN_2                         = 151;
int FEAT_IGNORE_PAIN_3                         = 152;
int FEAT_INCREASE_COMBAT_DAMAGE_1              = 153;
int FEAT_INCREASE_COMBAT_DAMAGE_2              = 154;
int FEAT_INCREASE_COMBAT_DAMAGE_3              = 155;
int FEAT_SUPERIOR_WEAPON_FOCUS_LIGHTSABER_1    = 156;
int FEAT_SUPERIOR_WEAPON_FOCUS_LIGHTSABER_2    = 157;
int FEAT_SUPERIOR_WEAPON_FOCUS_LIGHTSABER_3    = 158;
int FEAT_SUPERIOR_WEAPON_FOCUS_TWO_WEAPON_1    = 159;
int FEAT_SUPERIOR_WEAPON_FOCUS_TWO_WEAPON_2    = 160;
int FEAT_SUPERIOR_WEAPON_FOCUS_TWO_WEAPON_3    = 161;
int FEAT_LIGHT_SIDE_ENLIGHTENMENT              = 167;
int FEAT_DEFLECT                               = 168;
int FEAT_INNER_STRENGTH_1                      = 169;
int FEAT_INNER_STRENGTH_2                      = 170;
int FEAT_INNER_STRENGTH_3                      = 171;
int FEAT_INCREASE_MELEE_DAMAGE_1               = 172;
int FEAT_INCREASE_MELEE_DAMAGE_2               = 173;
int FEAT_INCREASE_MELEE_DAMAGE_3               = 174;
int FEAT_CRAFT                                 = 175;
int FEAT_MASTERCRAFT_WEAPONS_1                 = 176;
int FEAT_MASTERCRAFT_WEAPONS_2                 = 177;
int FEAT_MASTERCRAFT_WEAPONS_3                 = 178;
int FEAT_MASTERCRAFT_ARMOR_1                   = 179;
int FEAT_MASTERCRAFT_ARMOR_2                   = 180;
int FEAT_MASTERCRAFT_ARMOR_3                   = 181;
int FEAT_DROID_INTERFACE                       = 182;
int FEAT_CLASS_SKILL_AWARENESS                 = 183;
int FEAT_CLASS_SKILL_COMPUTER_USE              = 184;
int FEAT_CLASS_SKILL_DEMOLITIONS               = 185;
int FEAT_CLASS_SKILL_REPAIR                    = 186;
int FEAT_CLASS_SKILL_SECURITY                  = 187;
int FEAT_CLASS_SKILL_STEALTH                   = 188;
int FEAT_CLASS_SKILL_TREAT_INJURY              = 189;
int FEAT_DUAL_STRIKE                           = 190;
int FEAT_IMPROVED_DUAL_STRIKE                  = 191;
int FEAT_MASTER_DUAL_STRIKE                    = 192;
int FEAT_FINESSE_LIGHTSABERS                   = 193;
int FEAT_FINESSE_MELEE_WEAPONS                 = 194;
int FEAT_MOBILITY                              = 195;
int FEAT_REGENERATE_VITALITY_POINTS            = 196;
int FEAT_STEALTH_RUN                           = 197;
int FEAT_KINETIC_COMBAT                        = 198;
int FEAT_SURVIVAL                              = 199;
int FEAT_MANDALORIAN_COURAGE                   = 200;
int FEAT_PERSONAL_CLOAKING_SHIELD              = 201;
int FEAT_MENTOR                                = 202;
int FEAT_IMPLANT_SWITCHING                     = 203;
int FEAT_SPIRIT                                = 204;
int FEAT_FORCE_CHAIN                           = 205;
int FEAT_WAR_VETERAN                           = 206;
// DJS-OEI 10/5/2004
// Moved down to 240+
/*
int FEAT_PRECISE_SHOT_IV                       = 226;
int FEAT_PRECISE_SHOT_V                        = 227;
*/
int FEAT_FIGHTING_SPIRIT                       = 236;
int FEAT_HEROIC_RESOLVE                        = 237;
int FEAT_PRECISE_SHOT                          = 240;
int FEAT_IMPROVED_PRECISE_SHOT                 = 241;
int FEAT_MASTER_PRECISE_SHOT                   = 242;
int FEAT_PRECISE_SHOT_IV                       = 243;
int FEAT_PRECISE_SHOT_V                        = 244;

// Special Attack Defines
int SPECIAL_ATTACK_INVALID              =   0;
int SPECIAL_ATTACK_CALLED_SHOT_LEG      =   1;
int SPECIAL_ATTACK_CALLED_SHOT_ARM      =   2;
int SPECIAL_ATTACK_SAP                  =   3;
int SPECIAL_ATTACK_DISARM               =   4;
int SPECIAL_ATTACK_IMPROVED_DISARM      =   5;
int SPECIAL_ATTACK_KNOCKDOWN            =   6;
int SPECIAL_ATTACK_IMPROVED_KNOCKDOWN   =   7;
int SPECIAL_ATTACK_STUNNING_FIST        =   8;
int SPECIAL_ATTACK_FLURRY_OF_BLOWS      =   9;
int SPECIAL_ATTACK_RAPID_SHOT           =   10;

// Combat Mode Defines
int COMBAT_MODE_INVALID                 = 0;
int COMBAT_MODE_PARRY                   = 1;
int COMBAT_MODE_POWER_ATTACK            = 2;
int COMBAT_MODE_IMPROVED_POWER_ATTACK   = 3;
int COMBAT_MODE_FLURRY_OF_BLOWS         = 4;
int COMBAT_MODE_RAPID_SHOT              = 5;

// These represent the row in the difficulty 2da, rather than
// a difficulty value.
int ENCOUNTER_DIFFICULTY_VERY_EASY  = 0;
int ENCOUNTER_DIFFICULTY_EASY       = 1;
int ENCOUNTER_DIFFICULTY_NORMAL     = 2;
int ENCOUNTER_DIFFICULTY_HARD       = 3;
int ENCOUNTER_DIFFICULTY_IMPOSSIBLE = 4;

// Looping animation constants.
int ANIMATION_LOOPING_PAUSE         = 0;
int ANIMATION_LOOPING_PAUSE2        = 1;
int ANIMATION_LOOPING_LISTEN        = 2;
int ANIMATION_LOOPING_MEDITATE      = 3;
int ANIMATION_LOOPING_WORSHIP       = 4;
//int ANIMATION_LOOPING_LOOK_FAR    = 5;
//int ANIMATION_LOOPING_SIT_CHAIR   = 6;
//int ANIMATION_LOOPING_SIT_CROSS   = 7;
int ANIMATION_LOOPING_TALK_NORMAL   = 5;
int ANIMATION_LOOPING_TALK_PLEADING = 6;
int ANIMATION_LOOPING_TALK_FORCEFUL = 7;
int ANIMATION_LOOPING_TALK_LAUGHING = 8;
int ANIMATION_LOOPING_TALK_SAD      = 9;
int ANIMATION_LOOPING_GET_LOW       = 10;
int ANIMATION_LOOPING_GET_MID       = 11;
int ANIMATION_LOOPING_PAUSE_TIRED   = 12;
int ANIMATION_LOOPING_PAUSE_DRUNK   = 13;
int ANIMATION_LOOPING_FLIRT         = 14;
int ANIMATION_LOOPING_USE_COMPUTER  = 15;
int ANIMATION_LOOPING_DANCE         = 16;
int ANIMATION_LOOPING_DANCE1        = 17;
int ANIMATION_LOOPING_HORROR        = 18;
int ANIMATION_LOOPING_READY         = 19;
int ANIMATION_LOOPING_DEACTIVATE    = 20;
int ANIMATION_LOOPING_SPASM         = 21;
int ANIMATION_LOOPING_SLEEP         = 22;
int ANIMATION_LOOPING_PRONE         = 23;
int ANIMATION_LOOPING_PAUSE3        = 24;
int ANIMATION_LOOPING_WELD              = 25;
int ANIMATION_LOOPING_DEAD              = 26;
int ANIMATION_LOOPING_TALK_INJURED      = 27;
int ANIMATION_LOOPING_LISTEN_INJURED    = 28;
int ANIMATION_LOOPING_TREAT_INJURED     = 29;
int ANIMATION_LOOPING_DEAD_PRONE        = 30;
int ANIMATION_LOOPING_KNEEL_TALK_ANGRY  = 31;
int ANIMATION_LOOPING_KNEEL_TALK_SAD    = 32;
int ANIMATION_LOOPING_CHECK_BODY        = 33;
int ANIMATION_LOOPING_UNLOCK_DOOR       = 34;
int ANIMATION_LOOPING_SIT_AND_MEDITATE  = 35;

int ANIMATION_LOOPING_SIT_CHAIR         = 36;//AWD-OEI 07/06/2004
int ANIMATION_LOOPING_SIT_CHAIR_DRINK   = 37;//AWD-OEI 07/06/2004
int ANIMATION_LOOPING_SIT_CHAIR_PAZAK   = 38;//AWD-OEI 07/06/2004
int ANIMATION_LOOPING_SIT_CHAIR_COMP1   = 39;//AWD-OEI 07/06/2004
int ANIMATION_LOOPING_SIT_CHAIR_COMP2   = 40;//AWD-OEI 07/06/2004

int ANIMATION_LOOPING_RAGE              = 41;//JAB-OEI 07/15/2004
//int ANIMATION_LOOPING_DIVE_ROLL       = 42;//BMA-OEI 08/18/2004
int ANIMATION_LOOPING_CLOSED            = 43;//AWD-OEI 08/23/2004
int ANIMATION_LOOPING_STEALTH           = 44;//BMA-OEI 08/31/2004
int ANIMATION_LOOPING_CHOKE_WORKING     = 45;//DJS-OEI 09/09/2004
int ANIMATION_LOOPING_MEDITATE_STAND    = 46;//DJS-OEI 9/10/2004

// NOTE: Choke is really a looping animation.  The fire and forget constant has
//       been left in because it has already been used in many places.  Please
//       use this constant from now on.
int ANIMATION_LOOPING_CHOKE                    = 116;

// Fire and forget animation constants.
int ANIMATION_FIREFORGET_HEAD_TURN_LEFT     = 100;
int ANIMATION_FIREFORGET_HEAD_TURN_RIGHT    = 101;
int ANIMATION_FIREFORGET_PAUSE_SCRATCH_HEAD = 102;
int ANIMATION_FIREFORGET_PAUSE_BORED        = 103;
int ANIMATION_FIREFORGET_SALUTE             = 104;
int ANIMATION_FIREFORGET_BOW                = 105;
//int ANIMATION_FIREFORGET_STEAL            = 106;
int ANIMATION_FIREFORGET_GREETING           = 106;
int ANIMATION_FIREFORGET_TAUNT              = 107;
int ANIMATION_FIREFORGET_VICTORY1           = 108;
int ANIMATION_FIREFORGET_VICTORY2           = 109;
int ANIMATION_FIREFORGET_VICTORY3           = 110;
//int ANIMATION_FIREFORGET_READ             = 111;
int ANIMATION_FIREFORGET_INJECT             = 112;
int ANIMATION_FIREFORGET_USE_COMPUTER       = 113;
int ANIMATION_FIREFORGET_PERSUADE           = 114;
int ANIMATION_FIREFORGET_ACTIVATE           = 115;
// NOTE: Please do not use this choke constant anymore.  The choke is not a fire
//       and forget animation.  The looping choke constant above should be used
//       instead.
int ANIMATION_FIREFORGET_CHOKE              = 116;
int ANIMATION_FIREFORGET_THROW_HIGH         = 117;
int ANIMATION_FIREFORGET_THROW_LOW          = 118;
int ANIMATION_FIREFORGET_CUSTOM01           = 119;
int ANIMATION_FIREFORGET_TREAT_INJURED      = 120;
int ANIMATION_FIREFORGET_FORCE_CAST         = 121;
int ANIMATION_FIREFORGET_OPEN               = 122;//AWD-OEI 08/23/2004
int ANIMATION_FIREFORGET_DIVE_ROLL          = 123;//DJS-OEI 08/29/2004
int ANIMATION_FIREFORGET_SCREAM             = 124;//DJS-OEI 09/09/2004

// Placeable animation constants
int ANIMATION_PLACEABLE_ACTIVATE            = 200;
int ANIMATION_PLACEABLE_DEACTIVATE          = 201;
int ANIMATION_PLACEABLE_OPEN                = 202;
int ANIMATION_PLACEABLE_CLOSE               = 203;
int ANIMATION_PLACEABLE_ANIMLOOP01          = 204;
int ANIMATION_PLACEABLE_ANIMLOOP02          = 205;
int ANIMATION_PLACEABLE_ANIMLOOP03          = 206;
int ANIMATION_PLACEABLE_ANIMLOOP04          = 207;
int ANIMATION_PLACEABLE_ANIMLOOP05          = 208;
int ANIMATION_PLACEABLE_ANIMLOOP06          = 209;
int ANIMATION_PLACEABLE_ANIMLOOP07          = 210;
int ANIMATION_PLACEABLE_ANIMLOOP08          = 211;
int ANIMATION_PLACEABLE_ANIMLOOP09          = 212;
int ANIMATION_PLACEABLE_ANIMLOOP10          = 213;


// Room Animation Constants
int ANIMATION_ROOM_SCRIPTLOOP01            = 1;
int ANIMATION_ROOM_SCRIPTLOOP02            = 2;
int ANIMATION_ROOM_SCRIPTLOOP03            = 3;
int ANIMATION_ROOM_SCRIPTLOOP04            = 4;
int ANIMATION_ROOM_SCRIPTLOOP05            = 5;
int ANIMATION_ROOM_SCRIPTLOOP06            = 6;
int ANIMATION_ROOM_SCRIPTLOOP07            = 7;
int ANIMATION_ROOM_SCRIPTLOOP08            = 8;
int ANIMATION_ROOM_SCRIPTLOOP09            = 9;
int ANIMATION_ROOM_SCRIPTLOOP10            = 10;
int ANIMATION_ROOM_SCRIPTLOOP11            = 11;
int ANIMATION_ROOM_SCRIPTLOOP12            = 12;
int ANIMATION_ROOM_SCRIPTLOOP13            = 13;
int ANIMATION_ROOM_SCRIPTLOOP14            = 14;
int ANIMATION_ROOM_SCRIPTLOOP15            = 15;
int ANIMATION_ROOM_SCRIPTLOOP16            = 16;
int ANIMATION_ROOM_SCRIPTLOOP17            = 17;
int ANIMATION_ROOM_SCRIPTLOOP18            = 18;
int ANIMATION_ROOM_SCRIPTLOOP19            = 19;
int ANIMATION_ROOM_SCRIPTLOOP20            = 20;

int TALENT_TYPE_FORCE      = 0;
int TALENT_TYPE_SPELL      = 0;
int TALENT_TYPE_FEAT       = 1;
int TALENT_TYPE_SKILL      = 2;

int TALENT_EXCLUDE_ALL_OF_TYPE = -1;

int INVENTORY_DISTURB_TYPE_ADDED    = 0;
int INVENTORY_DISTURB_TYPE_REMOVED  = 1;
int INVENTORY_DISTURB_TYPE_STOLEN   = 2;

int GUI_PANEL_PLAYER_DEATH = 0;

int POLYMORPH_TYPE_WEREWOLF              = 0;
int POLYMORPH_TYPE_WERERAT               = 1;
int POLYMORPH_TYPE_WERECAT               = 2;
int POLYMORPH_TYPE_GIANT_SPIDER          = 3;
int POLYMORPH_TYPE_TROLL                 = 4;
int POLYMORPH_TYPE_UMBER_HULK            = 5;
int POLYMORPH_TYPE_PIXIE                 = 6;
int POLYMORPH_TYPE_ZOMBIE                = 7;
int POLYMORPH_TYPE_RED_DRAGON            = 8;
int POLYMORPH_TYPE_FIRE_GIANT            = 9;
int POLYMORPH_TYPE_BALOR                 = 10;
int POLYMORPH_TYPE_DEATH_SLAAD           = 11;
int POLYMORPH_TYPE_IRON_GOLEM            = 12;
int POLYMORPH_TYPE_HUGE_FIRE_ELEMENTAL   = 13;
int POLYMORPH_TYPE_HUGE_WATER_ELEMENTAL  = 14;
int POLYMORPH_TYPE_HUGE_EARTH_ELEMENTAL  = 15;
int POLYMORPH_TYPE_HUGE_AIR_ELEMENTAL    = 16;
int POLYMORPH_TYPE_ELDER_FIRE_ELEMENTAL  = 17;
int POLYMORPH_TYPE_ELDER_WATER_ELEMENTAL = 18;
int POLYMORPH_TYPE_ELDER_EARTH_ELEMENTAL = 19;
int POLYMORPH_TYPE_ELDER_AIR_ELEMENTAL   = 20;
int POLYMORPH_TYPE_BROWN_BEAR            = 21;
int POLYMORPH_TYPE_PANTHER               = 22;
int POLYMORPH_TYPE_WOLF                  = 23;
int POLYMORPH_TYPE_BOAR                  = 24;
int POLYMORPH_TYPE_BADGER                = 25;
int POLYMORPH_TYPE_PENGUIN               = 26;
int POLYMORPH_TYPE_COW                   = 27;
int POLYMORPH_TYPE_DOOM_KNIGHT           = 28;
int POLYMORPH_TYPE_YUANTI                = 29;
int POLYMORPH_TYPE_IMP                   = 30;
int POLYMORPH_TYPE_QUASIT                = 31;
int POLYMORPH_TYPE_SUCCUBUS              = 32;
int POLYMORPH_TYPE_DIRE_BROWN_BEAR       = 33;
int POLYMORPH_TYPE_DIRE_PANTHER          = 34;
int POLYMORPH_TYPE_DIRE_WOLF             = 35;
int POLYMORPH_TYPE_DIRE_BOAR             = 36;
int POLYMORPH_TYPE_DIRE_BADGER           = 37;

int INVISIBILITY_TYPE_NORMAL   = 1;
int INVISIBILITY_TYPE_DARKNESS = 2;
int INVISIBILITY_TYPE_IMPROVED = 4;

int CREATURE_SIZE_INVALID = 0;
int CREATURE_SIZE_TINY =    1;
int CREATURE_SIZE_SMALL =   2;
int CREATURE_SIZE_MEDIUM =  3;
int CREATURE_SIZE_LARGE =   4;
int CREATURE_SIZE_HUGE =    5;

int CAMERA_MODE_CHASE_CAMERA          = 0;
int CAMERA_MODE_TOP_DOWN              = 1;
int CAMERA_MODE_STIFF_CHASE_CAMERA    = 2;

int PROJECTILE_PATH_TYPE_DEFAULT        = 0;
int PROJECTILE_PATH_TYPE_HOMING         = 1;
int PROJECTILE_PATH_TYPE_BALLISTIC      = 2;
int PROJECTILE_PATH_TYPE_HIGH_BALLISTIC = 3;
int PROJECTILE_PATH_TYPE_ACCELERATING   = 4;

int GAME_DIFFICULTY_VERY_EASY   = 0;
int GAME_DIFFICULTY_EASY        = 1;
int GAME_DIFFICULTY_NORMAL      = 2;
int GAME_DIFFICULTY_CORE_RULES  = 3;
int GAME_DIFFICULTY_DIFFICULT   = 4;

int ACTION_MOVETOPOINT        = 0;
int ACTION_PICKUPITEM         = 1;
int ACTION_DROPITEM           = 2;
int ACTION_ATTACKOBJECT       = 3;
int ACTION_CASTSPELL          = 4;
int ACTION_OPENDOOR           = 5;
int ACTION_CLOSEDOOR          = 6;
int ACTION_DIALOGOBJECT       = 7;
int ACTION_DISABLETRAP        = 8;
int ACTION_RECOVERTRAP        = 9;
int ACTION_FLAGTRAP           = 10;
int ACTION_EXAMINETRAP        = 11;
int ACTION_SETTRAP            = 12;
int ACTION_OPENLOCK           = 13;
int ACTION_LOCK               = 14;
int ACTION_USEOBJECT          = 15;
int ACTION_ANIMALEMPATHY      = 16;
int ACTION_REST               = 17;
int ACTION_TAUNT              = 18;
int ACTION_ITEMCASTSPELL      = 19;
int ACTION_COUNTERSPELL       = 31;
int ACTION_HEAL               = 33;
int ACTION_PICKPOCKET         = 34;
int ACTION_FOLLOW             = 35;
int ACTION_WAIT               = 36;
int ACTION_SIT                = 37;
int ACTION_FOLLOWLEADER       = 38;
int ACTION_FOLLOWOWNER        = 43;


int ACTION_INVALID                = 65535;
int ACTION_QUEUEEMPTY             = 65534;

int TRAP_BASE_TYPE_FLASH_STUN_MINOR             = 0;
int TRAP_BASE_TYPE_FLASH_STUN_AVERAGE           = 1;
int TRAP_BASE_TYPE_FLASH_STUN_DEADLY            = 2;
int TRAP_BASE_TYPE_FRAGMENTATION_MINE_MINOR     = 3;
int TRAP_BASE_TYPE_FRAGMENTATION_MINE_AVERAGE   = 4;
int TRAP_BASE_TYPE_FRAGMENTATION_MINE_DEADLY    = 5;
int TRAP_BASE_TYPE_LASER_SLICING_MINOR          = 6;
int TRAP_BASE_TYPE_LASER_SLICING_AVERAGE        = 7;
int TRAP_BASE_TYPE_LASER_SLICING_DEADLY         = 8;
int TRAP_BASE_TYPE_POISON_GAS_MINOR             = 9;
int TRAP_BASE_TYPE_POISON_GAS_AVERAGE           = 10;
int TRAP_BASE_TYPE_POISON_GAS_DEADLY            = 11;
int TRAP_BASE_TYPE_SONIC_CHARGE_MINOR           = 14;
int TRAP_BASE_TYPE_SONIC_CHARGE_AVERAGE         = 15;
int TRAP_BASE_TYPE_SONIC_CHARGE_DEADLY          = 16;
// DJS-OEI 1/20/2004
int TRAP_BASE_TYPE_FLASH_STUN_STRONG            = 17;
int TRAP_BASE_TYPE_FLASH_STUN_DEVASTATING       = 18;
int TRAP_BASE_TYPE_FRAGMENTATION_MINE_STRONG    = 19;
int TRAP_BASE_TYPE_FRAGMENTATION_MINE_DEVASTATING  = 20;
int TRAP_BASE_TYPE_LASER_SLICING_STRONG         = 21;
int TRAP_BASE_TYPE_LASER_SLICING_DEVASTATING    = 22;
int TRAP_BASE_TYPE_POISON_GAS_STRONG            = 23;
int TRAP_BASE_TYPE_POISON_GAS_DEVASTATING       = 24;
int TRAP_BASE_TYPE_SONIC_CHARGE_STRONG          = 25;
int TRAP_BASE_TYPE_SONIC_CHARGE_DEVASTATING     = 26;

int SWMINIGAME_TRACKFOLLOWER_SOUND_ENGINE = 0;
int SWMINIGAME_TRACKFOLLOWER_SOUND_DEATH  = 1;

int CONVERSATION_TYPE_CINEMATIC = 0;
int CONVERSATION_TYPE_COMPUTER  = 1;

int PLANET_DANTOOINE        = 0;
int PLANET_DXUN             = 1;
int PLANET_EBON_HAWK        = 2;
int PLANET_KORRIBAN         = 3;
int PLANET_M4_78            = 4;
int PLANET_MALACHOR_V       = 5;
int PLANET_NAR_SHADDAA      = 6;
int PLANET_ONDERON          = 7;
int PLANET_PERAGUS          = 8;
int PLANET_TELOS            = 9;
int PLANET_HARBINGER        = 10;
int PLANET_LIVE_01          = 11;//The 'live' planets are just space fillers
int PLANET_LIVE_02          = 12;
int PLANET_LIVE_03          = 13;
int PLANET_LIVE_04          = 14;
int PLANET_LIVE_05          = 15;
int PLANET_LIVE_06          = 16;

int NPC_PLAYER          =-1;
int NPC_ATTON           = 0;
int NPC_BAO_DUR         = 1;
int NPC_CANDEROUS       = 2;
int NPC_G0T0            = 3;
int NPC_HANDMAIDEN      = 4;
int NPC_HK_47           = 5;
int NPC_KREIA           = 6;
int NPC_MIRA            = 7;
int NPC_T3_M4           = 8;
int NPC_VISAS           = 9;
int NPC_HANHARR          = 10;
int NPC_DISCIPLE        = 11;

int PUP_SENSORBALL      = 0;
int PUP_OTHER1          = 1;
int PUP_OTHER2          = 2;


int PARTY_AISTYLE_AGGRESSIVE    = 0;
int PARTY_AISTYLE_DEFENSIVE     = 1;
int PARTY_AISTYLE_PASSIVE       = 2;

int NPC_AISTYLE_DEFAULT_ATTACK  = 0;//Depricated, we don't use this anymore. RWT-OEI 08/18/04
int NPC_AISTYLE_RANGED_ATTACK   = 1;
int NPC_AISTYLE_MELEE_ATTACK    = 2;
int NPC_AISTYLE_AID             = 3;
int NPC_AISTYLE_GRENADE_THROWER = 4;//Depricated, we don't use this anymore. RWT-OEI 08/18/04
int NPC_AISTYLE_JEDI_SUPPORT    = 5;//Depricated, we don't use this anymore. RWT-OEI 08/18/04
int NPC_AISTYLE_HEALER          = 6;//RWT-OEI 03/18/04 - No fighting, just heals
int NPC_AISTYLE_SKIRMISH        = 7;//RWT-OEI 03/22/04 - This AI moves and shoots
int NPC_AISTYLE_TURTLE          = 8;//JAB-OEI 07/03/04 - Turtles then unleashes charged attack
int NPC_AISTYLE_PARTY_AGGRO     = 9;//RWT-OEI 08/18/04 - All out attacking party member
int NPC_AISTYLE_PARTY_DEFENSE   = 10;//RWT-OEI 08/18/04 - Attacks, but doesn't stray to far.
int NPC_AISTYLE_PARTY_RANGED    = 11;//RWT-OEI 08/18/04 - Doesn't run around a lot, but does heal.
int NPC_AISTYLE_PARTY_STATIONARY= 12;//RWT-OEI 08/18/04 - Uses healing and defensive force powers.
int NPC_AISTYLE_PARTY_SUPPORT   = 13;//RWT-OEI 08/28/04 - Revisiting party AI stuff
int NPC_AISTYLE_PARTY_REMOTE    = 14;//RWT-OEI 09/08/04 - Combat AI for the floating remote.
int NPC_AISTYLE_MONSTER_POWERS  = 15;//DJS-OEI 09/27/04 - Combat AI for the Malachor Storm Beasts and other ability-using monsters.

int DISGUISE_TYPE_TEST            = 1;
int DISGUISE_TYPE_P_T3M3          = 2;
int DISGUISE_TYPE_P_HK47          = 3;
int DISGUISE_TYPE_P_BASTILLA      = 4;
int DISGUISE_TYPE_P_CAND          = 5;
int DISGUISE_TYPE_P_CARTH         = 6;
int DISGUISE_TYPE_P_JOLEE         = 7;
int DISGUISE_TYPE_P_JUHANI        = 8;
int DISGUISE_TYPE_P_ZAALBAR       = 9;
int DISGUISE_TYPE_P_MISSION       = 10;
int DISGUISE_TYPE_N_ADMRLSAULKAR  = 11;
int DISGUISE_TYPE_N_BITH          = 12;
int DISGUISE_TYPE_N_CALONORD      = 13;
int DISGUISE_TYPE_N_COMMF         = 14;
int DISGUISE_TYPE_N_COMMKIDF      = 15;
int DISGUISE_TYPE_N_COMMKIDM      = 16;
int DISGUISE_TYPE_N_COMMM         = 17;
int DISGUISE_TYPE_N_CZERLAOFF     = 18;
int DISGUISE_TYPE_N_DARKJEDIF     = 19;
int DISGUISE_TYPE_N_DARKJEDIM     = 20;
int DISGUISE_TYPE_N_DARTHMALAK    = 21;
int DISGUISE_TYPE_N_DARTHREVAN    = 22;
int DISGUISE_TYPE_N_DODONNA       = 23;
int DISGUISE_TYPE_N_DUROS         = 24;
int DISGUISE_TYPE_N_FATCOMF       = 25;
int DISGUISE_TYPE_N_FATCOMM       = 26;
int DISGUISE_TYPE_N_SMUGGLER      = 27;
int DISGUISE_TYPE_N_SITHSOLDIER   = 28;
// int DISGUISE_TYPE_ = 29;
int DISGUISE_TYPE_N_JEDICOUNTF    = 30;
int DISGUISE_TYPE_N_JEDICOUNTM    = 31;
int DISGUISE_TYPE_N_JEDIMALEK     = 32;
int DISGUISE_TYPE_N_JEDIMEMF      = 33;
int DISGUISE_TYPE_N_JEDIMEMM      = 34;
int DISGUISE_TYPE_N_MANDALORIAN   = 35;
int DISGUISE_TYPE_N_RAKATA        = 36;
int DISGUISE_TYPE_N_REPOFF        = 37;
int DISGUISE_TYPE_N_REPSOLD       = 38;
int DISGUISE_TYPE_N_RODIAN        = 39;
int DISGUISE_TYPE_C_SELKATH       = 40;
int DISGUISE_TYPE_N_SITHAPPREN    = 41;
int DISGUISE_TYPE_N_SITHCOMF      = 42;
int DISGUISE_TYPE_N_SITHCOMM      = 43;
//int DISGUISE_TYPE_N_SITHSOLDIER   = 44;
int DISGUISE_TYPE_N_SWOOPGANG     = 45;
int DISGUISE_TYPE_N_TUSKEN        = 46;
int DISGUISE_TYPE_N_TWILEKF       = 47;
int DISGUISE_TYPE_N_TWILEKM       = 48;
int DISGUISE_TYPE_N_WALRUSMAN     = 49;
int DISGUISE_TYPE_N_WOOKIEF       = 50;
int DISGUISE_TYPE_N_WOOKIEM       = 51;
int DISGUISE_TYPE_N_YODA          = 52;
int DISGUISE_TYPE_C_BANTHA        = 53;
int DISGUISE_TYPE_C_BRITH         = 54;
int DISGUISE_TYPE_C_DEWBACK       = 55;
int DISGUISE_TYPE_C_DRDASSASSIN   = 56;
int DISGUISE_TYPE_C_DRDASTRO      = 57;
int DISGUISE_TYPE_C_DRDG          = 58;
int DISGUISE_TYPE_C_DRDMKFOUR     = 59;
int DISGUISE_TYPE_C_DRDMKONE      = 60;
int DISGUISE_TYPE_C_DRDMKTWO      = 61;
int DISGUISE_TYPE_C_DRDPROBE      = 62;
int DISGUISE_TYPE_C_DRDPROT       = 63;
int DISGUISE_TYPE_C_DRDSENTRY     = 64;
int DISGUISE_TYPE_C_DRDSPYDER     = 65;
int DISGUISE_TYPE_C_DRDWAR        = 66;
int DISGUISE_TYPE_C_FIRIXA        = 67;
int DISGUISE_TYPE_C_GAMMOREAN     = 68;
int DISGUISE_TYPE_C_GIZKA         = 69;
int DISGUISE_TYPE_C_HUTT          = 70;
int DISGUISE_TYPE_C_IRIAZ         = 71;
int DISGUISE_TYPE_C_ITHORIAN      = 72;
int DISGUISE_TYPE_C_JAWA          = 73;
int DISGUISE_TYPE_C_KATAARN       = 74;
int DISGUISE_TYPE_C_KHOUNDA       = 75;
int DISGUISE_TYPE_C_KHOUNDB       = 76;
int DISGUISE_TYPE_C_KRAYTDRAGON   = 77;
int DISGUISE_TYPE_C_MYKAL         = 78;
int DISGUISE_TYPE_C_RAKGHOUL      = 79;
int DISGUISE_TYPE_C_RANCOR        = 80;
int DISGUISE_TYPE_C_SEABEAST      = 81;
//int DISGUISE_TYPE_ = 82;
int DISGUISE_TYPE_C_TACH          = 83;
int DISGUISE_TYPE_C_TWOHEAD       = 84;
int DISGUISE_TYPE_C_VERKAAL       = 85;
int DISGUISE_TYPE_C_WRAID         = 86;
int DISGUISE_TYPE_C_RONTO         = 87;
int DISGUISE_TYPE_C_KINRATH       = 88;
int DISGUISE_TYPE_C_TUKATA        = 89;
int DISGUISE_TYPE_N_TUSKENF       = 90;
int DISGUISE_TYPE_P_FEM_A_SML_01  = 91;
int DISGUISE_TYPE_P_FEM_A_MED_01  = 92;
int DISGUISE_TYPE_P_FEM_A_LRG_01  = 93;
int DISGUISE_TYPE_P_FEM_A_SML_02  = 94;
int DISGUISE_TYPE_P_FEM_A_MED_02  = 95;
int DISGUISE_TYPE_P_FEM_A_LRG_02  = 96;
int DISGUISE_TYPE_P_FEM_A_SML_03  = 97;
int DISGUISE_TYPE_P_FEM_A_MED_03  = 98;
int DISGUISE_TYPE_P_FEM_A_LRG_03  = 99;
int DISGUISE_TYPE_P_FEM_A_SML_04  = 100;
int DISGUISE_TYPE_P_FEM_A_MED_04  = 101;
int DISGUISE_TYPE_P_FEM_A_LRG_04  = 102;
int DISGUISE_TYPE_P_FEM_A_SML_05  = 103;
int DISGUISE_TYPE_P_FEM_A_MED_05  = 104;
int DISGUISE_TYPE_P_FEM_A_LRG_05  = 105;
int DISGUISE_TYPE_P_FEM_B_SML_01  = 106;
int DISGUISE_TYPE_P_FEM_B_MED_01  = 107;
int DISGUISE_TYPE_P_FEM_B_LRG_01  = 108;
int DISGUISE_TYPE_P_FEM_B_SML_02  = 109;
int DISGUISE_TYPE_P_FEM_B_MED_02  = 110;
int DISGUISE_TYPE_P_FEM_B_LRG_02  = 111;
int DISGUISE_TYPE_P_FEM_B_SML_03  = 112;
int DISGUISE_TYPE_P_FEM_B_MED_03  = 113;
int DISGUISE_TYPE_P_FEM_B_LRG_03  = 114;
int DISGUISE_TYPE_P_FEM_B_SML_04  = 115;
int DISGUISE_TYPE_P_FEM_B_MED_04  = 116;
int DISGUISE_TYPE_P_FEM_B_LRG_04  = 117;
int DISGUISE_TYPE_P_FEM_B_SML_05  = 118;
int DISGUISE_TYPE_P_FEM_B_MED_05  = 119;
int DISGUISE_TYPE_P_FEM_B_LRG_05  = 120;
int DISGUISE_TYPE_P_FEM_C_SML_01  = 121;
int DISGUISE_TYPE_P_FEM_C_MED_01  = 122;
int DISGUISE_TYPE_P_FEM_C_LRG_01  = 123;
int DISGUISE_TYPE_P_FEM_C_SML_02  = 124;
int DISGUISE_TYPE_P_FEM_C_MED_02  = 125;
int DISGUISE_TYPE_P_FEM_C_LRG_02  = 126;
int DISGUISE_TYPE_P_FEM_C_SML_03  = 127;
int DISGUISE_TYPE_P_FEM_C_MED_03  = 128;
int DISGUISE_TYPE_P_FEM_C_LRG_03  = 129;
int DISGUISE_TYPE_P_FEM_C_SML_04  = 130;
int DISGUISE_TYPE_P_FEM_C_MED_04  = 131;
int DISGUISE_TYPE_P_FEM_C_LRG_04  = 132;
int DISGUISE_TYPE_P_FEM_C_SML_05  = 133;
int DISGUISE_TYPE_P_FEM_C_MED_05  = 134;
int DISGUISE_TYPE_P_FEM_C_LRG_05  = 135;
int DISGUISE_TYPE_P_MAL_A_SML_01  = 136;
int DISGUISE_TYPE_P_MAL_A_MED_01  = 137;
int DISGUISE_TYPE_P_MAL_A_LRG_01  = 138;
int DISGUISE_TYPE_P_MAL_A_SML_02  = 139;
int DISGUISE_TYPE_P_MAL_A_MED_02  = 140;
int DISGUISE_TYPE_P_MAL_A_LRG_02  = 141;
int DISGUISE_TYPE_P_MAL_A_SML_03  = 142;
int DISGUISE_TYPE_P_MAL_A_MED_03  = 143;
int DISGUISE_TYPE_P_MAL_A_LRG_03  = 144;
int DISGUISE_TYPE_P_MAL_A_SML_04  = 145;
int DISGUISE_TYPE_P_MAL_A_MED_04  = 146;
int DISGUISE_TYPE_P_MAL_A_LRG_04  = 147;
int DISGUISE_TYPE_P_MAL_A_SML_05  = 148;
int DISGUISE_TYPE_P_MAL_A_MED_05  = 149;
int DISGUISE_TYPE_P_MAL_A_LRG_05  = 150;
int DISGUISE_TYPE_P_MAL_B_SML_01  = 151;
int DISGUISE_TYPE_P_MAL_B_MED_01  = 152;
int DISGUISE_TYPE_P_MAL_B_LRG_01  = 153;
int DISGUISE_TYPE_P_MAL_B_SML_02  = 154;
int DISGUISE_TYPE_P_MAL_B_MED_02  = 155;
int DISGUISE_TYPE_P_MAL_B_LRG_02  = 156;
int DISGUISE_TYPE_P_MAL_B_SML_03  = 157;
int DISGUISE_TYPE_P_MAL_B_MED_03  = 158;
int DISGUISE_TYPE_P_MAL_B_LRG_03  = 159;
int DISGUISE_TYPE_P_MAL_B_SML_04  = 160;
int DISGUISE_TYPE_P_MAL_B_MED_04  = 161;
int DISGUISE_TYPE_P_MAL_B_LRG_04  = 162;
int DISGUISE_TYPE_P_MAL_B_SML_05  = 163;
int DISGUISE_TYPE_P_MAL_B_MED_05  = 164;
int DISGUISE_TYPE_P_MAL_B_LRG_05  = 165;
int DISGUISE_TYPE_P_MAL_C_SML_01  = 166;
int DISGUISE_TYPE_P_MAL_C_MED_01  = 167;
int DISGUISE_TYPE_P_MAL_C_LRG_01  = 168;
int DISGUISE_TYPE_P_MAL_C_SML_02  = 169;
int DISGUISE_TYPE_P_MAL_C_MED_02  = 170;
int DISGUISE_TYPE_P_MAL_C_LRG_02  = 171;
int DISGUISE_TYPE_P_MAL_C_SML_03  = 172;
int DISGUISE_TYPE_P_MAL_C_MED_03  = 173;
int DISGUISE_TYPE_P_MAL_C_LRG_03  = 174;
int DISGUISE_TYPE_P_MAL_C_SML_04  = 175;
int DISGUISE_TYPE_P_MAL_C_MED_04  = 176;
int DISGUISE_TYPE_P_MAL_C_LRG_04  = 177;
int DISGUISE_TYPE_P_MAL_C_SML_05  = 178;
int DISGUISE_TYPE_P_MAL_C_MED_05  = 179;
int DISGUISE_TYPE_P_MAL_C_LRG_05  = 180;
int DISGUISE_TYPE_ENVIRONMENTSUIT = 181;
int DISGUISE_TYPE_TURRET          = 182;
int DISGUISE_TYPE_TURRET2         = 183;
int DISGUISE_TYPE_N_DARTHBAND                    = 184;
int DISGUISE_TYPE_COMMONER_FEM_WHITE             = 185;
int DISGUISE_TYPE_COMMONER_FEM_BLACK             = 186;
int DISGUISE_TYPE_COMMONER_FEM_OLD_ASIAN         = 187;
int DISGUISE_TYPE_COMMONER_FEM_OLD_WHITE         = 188;
int DISGUISE_TYPE_COMMONER_FEM_OLD_BLACK         = 189;
int DISGUISE_TYPE_COMMONER_MAL_WHITE             = 190;
int DISGUISE_TYPE_COMMONER_MAL_BLACK             = 191;
int DISGUISE_TYPE_COMMONER_MAL_OLD_ASIAN         = 192;
int DISGUISE_TYPE_COMMONER_MAL_OLD_WHITE         = 193;
int DISGUISE_TYPE_COMMONER_MAL_OLD_BLACK         = 194;
int DISGUISE_TYPE_CZERKA_OFFICER_WHITE           = 195;
int DISGUISE_TYPE_CZERKA_OFFICER_BLACK           = 196;
int DISGUISE_TYPE_CZERKA_OFFICER_OLD_ASIAN       = 197;
int DISGUISE_TYPE_CZERKA_OFFICER_OLD_WHITE       = 198;
int DISGUISE_TYPE_CZERKA_OFFICER_OLD_BLACK       = 199;
int DISGUISE_TYPE_JEDI_WHITE_FEMALE_02           = 200;
int DISGUISE_TYPE_JEDI_WHITE_FEMALE_03           = 201;
int DISGUISE_TYPE_JEDI_WHITE_FEMALE_04           = 202;
int DISGUISE_TYPE_JEDI_WHITE_FEMALE_05           = 203;
int DISGUISE_TYPE_JEDI_ASIAN_FEMALE_01           = 204;
int DISGUISE_TYPE_JEDI_ASIAN_FEMALE_02           = 205;
int DISGUISE_TYPE_JEDI_ASIAN_FEMALE_03           = 206;
int DISGUISE_TYPE_JEDI_ASIAN_FEMALE_04           = 207;
int DISGUISE_TYPE_JEDI_ASIAN_FEMALE_05           = 208;
int DISGUISE_TYPE_JEDI_BLACK_FEMALE_01           = 209;
int DISGUISE_TYPE_JEDI_BLACK_FEMALE_02           = 210;
int DISGUISE_TYPE_JEDI_BLACK_FEMALE_03           = 211;
int DISGUISE_TYPE_JEDI_BLACK_FEMALE_04           = 212;
int DISGUISE_TYPE_JEDI_BLACK_FEMALE_05           = 213;
int DISGUISE_TYPE_JEDI_WHITE_MALE_02             = 214;
int DISGUISE_TYPE_JEDI_WHITE_MALE_03             = 215;
int DISGUISE_TYPE_JEDI_WHITE_MALE_04             = 216;
int DISGUISE_TYPE_JEDI_WHITE_MALE_05             = 217;
int DISGUISE_TYPE_JEDI_ASIAN_MALE_01             = 218;
int DISGUISE_TYPE_JEDI_ASIAN_MALE_02             = 219;
int DISGUISE_TYPE_JEDI_ASIAN_MALE_03             = 220;
int DISGUISE_TYPE_JEDI_ASIAN_MALE_04             = 221;
int DISGUISE_TYPE_JEDI_ASIAN_MALE_05             = 222;
int DISGUISE_TYPE_JEDI_BLACK_MALE_01             = 223;
int DISGUISE_TYPE_JEDI_BLACK_MALE_02             = 224;
int DISGUISE_TYPE_JEDI_BLACK_MALE_03             = 225;
int DISGUISE_TYPE_JEDI_BLACK_MALE_04             = 226;
int DISGUISE_TYPE_JEDI_BLACK_MALE_05             = 227;
int DISGUISE_TYPE_HUTT_02                        = 228;
int DISGUISE_TYPE_HUTT_03                        = 229;
int DISGUISE_TYPE_HUTT_04                        = 230;
int DISGUISE_TYPE_DROID_ASTRO_02                 = 231;
int DISGUISE_TYPE_DROID_ASTRO_03                 = 232;
int DISGUISE_TYPE_DROID_PROTOCOL_02              = 233;
int DISGUISE_TYPE_DROID_PROTOCOL_03              = 234;
int DISGUISE_TYPE_DROID_PROTOCOL_04              = 235;
int DISGUISE_TYPE_DROID_WAR_02                   = 236;
int DISGUISE_TYPE_DROID_WAR_03                   = 237;
int DISGUISE_TYPE_DROID_WAR_04                   = 238;
int DISGUISE_TYPE_DROID_WAR_05                   = 239;
int DISGUISE_TYPE_GAMMOREAN_02                   = 240;
int DISGUISE_TYPE_GAMMOREAN_03                   = 241;
int DISGUISE_TYPE_GAMMOREAN_04                   = 242;
int DISGUISE_TYPE_ITHORIAN_02                    = 243;
int DISGUISE_TYPE_ITHORIAN_03                    = 244;
int DISGUISE_TYPE_KATH_HOUND_A02                 = 245;
int DISGUISE_TYPE_KATH_HOUND_A03                 = 246;
int DISGUISE_TYPE_KATH_HOUND_A04                 = 247;
int DISGUISE_TYPE_KATH_HOUND_B02                 = 248;
int DISGUISE_TYPE_KATH_HOUND_B03                 = 249;
int DISGUISE_TYPE_KATH_HOUND_B04                 = 250;
int DISGUISE_TYPE_WRAID_02                       = 251;
int DISGUISE_TYPE_WRAID_03                       = 252;
int DISGUISE_TYPE_WRAID_04                       = 253;
int DISGUISE_TYPE_RAKATA_02                      = 254;
int DISGUISE_TYPE_RAKATA_03                      = 255;
int DISGUISE_TYPE_RODIAN_02                      = 256;
int DISGUISE_TYPE_RODIAN_03                      = 257;
int DISGUISE_TYPE_RODIAN_04                      = 258;
int DISGUISE_TYPE_SELKATH_02                     = 259;
int DISGUISE_TYPE_SELKATH_03                     = 260;
int DISGUISE_TYPE_SITH_SOLDIER_03                = 261;
int DISGUISE_TYPE_SWOOP_GANG_02                  = 262;
int DISGUISE_TYPE_SWOOP_GANG_03                  = 263;
int DISGUISE_TYPE_SWOOP_GANG_04                  = 264;
int DISGUISE_TYPE_SWOOP_GANG_05                  = 265;
int DISGUISE_TYPE_TUSKAN_RAIDER_02               = 266;
int DISGUISE_TYPE_TUSKAN_RAIDER_03               = 267;
int DISGUISE_TYPE_TUSKAN_RAIDER_04               = 268;
int DISGUISE_TYPE_TWILEK_MALE_02                 = 269;
int DISGUISE_TYPE_TWILEK_FEMALE_02               = 270;
int DISGUISE_TYPE_WOOKIE_MALE_02                 = 271;
int DISGUISE_TYPE_WOOKIE_MALE_03                 = 272;
int DISGUISE_TYPE_WOOKIE_MALE_04                 = 273;
int DISGUISE_TYPE_WOOKIE_MALE_05                 = 274;
int DISGUISE_TYPE_WOOKIE_FEMALE_02               = 275;
int DISGUISE_TYPE_WOOKIE_FEMALE_03               = 276;
int DISGUISE_TYPE_WOOKIE_FEMALE_04               = 277;
int DISGUISE_TYPE_WOOKIE_FEMALE_05               = 278;
int DISGUISE_TYPE_ENVIRONMENTSUIT_02             = 279;
int DISGUISE_TYPE_YUTHURA_BAN                    = 280;
int DISGUISE_TYPE_SHYRACK_01                     = 281;
int DISGUISE_TYPE_SHYRACK_02                     = 282;
int DISGUISE_TYPE_REPUBLIC_SOLDIER_MAL_BLACK     = 283;
int DISGUISE_TYPE_REPUBLIC_SOLDIER_MAL_OLD_ASIAN = 284;
int DISGUISE_TYPE_REPUBLIC_SOLDIER_MAL_OLD_WHITE = 285;
int DISGUISE_TYPE_REPUBLIC_SOLDIER_MAL_OLD_BLACK = 286;
int DISGUISE_TYPE_REPUBLIC_OFFICER_MAL_BLACK     = 287;
int DISGUISE_TYPE_REPUBLIC_OFFICER_MAL_OLD_ASIAN = 288;
int DISGUISE_TYPE_REPUBLIC_OFFICER_MAL_OLD_WHITE = 289;
int DISGUISE_TYPE_REPUBLIC_OFFICER_MAL_OLD_BLACK = 290;
int DISGUISE_TYPE_SITH_FEM_WHITE                 = 291;
int DISGUISE_TYPE_SITH_FEM_BLACK                 = 292;
int DISGUISE_TYPE_SITH_FEM_OLD_ASIAN             = 293;
int DISGUISE_TYPE_SITH_FEM_OLD_WHITE             = 294;
int DISGUISE_TYPE_SITH_FEM_OLD_BLACK             = 295;
int DISGUISE_TYPE_SITH_MAL_WHITE                 = 296;
int DISGUISE_TYPE_SITH_MAL_BLACK                 = 297;
int DISGUISE_TYPE_SITH_MAL_OLD_ASIAN             = 298;
int DISGUISE_TYPE_SITH_MAL_OLD_WHITE             = 299;
int DISGUISE_TYPE_SITH_MAL_OLD_BLACK             = 300;
int DISGUISE_TYPE_SITH_FEM_ASIAN                 = 301;
int DISGUISE_TYPE_SITH_MAL_ASIAN                 = 302;
int DISGUISE_TYPE_JEDI_WHITE_OLD_MALE            = 303;
int DISGUISE_TYPE_JEDI_ASIAN_OLD_MALE            = 304;
int DISGUISE_TYPE_JEDI_BLACK_OLD_MALE            = 305;
int DISGUISE_TYPE_JEDI_WHITE_OLD_FEM             = 306;
int DISGUISE_TYPE_JEDI_ASIAN_OLD_FEM             = 307;
int DISGUISE_TYPE_JEDI_BLACK_OLD_FEM             = 308;

int PLOT_O_DOOM         = 0;
int PLOT_O_SCARY_STUFF  = 1;
int PLOT_O_BIG_MONSTERS = 2;

int FORMATION_WEDGE = 0;
int FORMATION_LINE  = 1;

int SUBSCREEN_ID_NONE             = 0;
int SUBSCREEN_ID_EQUIP            = 1;
int SUBSCREEN_ID_ITEM             = 2;
int SUBSCREEN_ID_CHARACTER_RECORD = 3;
int SUBSCREEN_ID_ABILITY          = 4;
int SUBSCREEN_ID_MAP              = 5;
int SUBSCREEN_ID_QUEST            = 6;
int SUBSCREEN_ID_OPTIONS          = 7;
int SUBSCREEN_ID_MESSAGES         = 8;

int SHIELD_DROID_ENERGY_1         = 0;
int SHIELD_DROID_ENERGY_2         = 1;
int SHIELD_DROID_ENERGY_3         = 2;
int SHIELD_DROID_ENVIRO_1         = 3;
int SHIELD_DROID_ENVIRO_2         = 4;
int SHIELD_DROID_ENVIRO_3         = 5;
int SHIELD_ENERGY                 = 6;
int SHIELD_ENERGY_SITH            = 7;
int SHIELD_ENERGY_ARKANIAN        = 8;
int SHIELD_ECHANI                 = 9;
int SHIELD_MANDALORIAN_MELEE      = 10;
int SHIELD_MANDALORIAN_POWER      = 11;
int SHIELD_DUELING_ECHANI         = 12;
int SHIELD_DUELING_YUSANIS        = 13;
int SHIELD_VERPINE_PROTOTYPE      = 14;
int SHIELD_ANTIQUE_DROID          = 15;
int SHIELD_PLOT_TAR_M09AA         = 16;
int SHIELD_PLOT_UNK_M44AA         = 17;
int SHIELD_PLOT_MAN_M28AA         = 18;
int SHIELD_HEAT                   = 19;
int SHIELD_DREXL                  = 20; // JAB-OEI 7/2/04


int SUBRACE_NONE   = 0;
int SUBRACE_WOOKIE = 1;

int VIDEO_EFFECT_NONE              = -1;
int VIDEO_EFFECT_SECURITY_CAMERA   = 0;
int VIDEO_EFFECT_FREELOOK_T3M4     = 1;
int VIDEO_EFFECT_FREELOOK_HK47     = 2;
int VIDEO_EFFECT_CLAIRVOYANCE      = 3;
int VIDEO_EFFECT_FORCESIGHT        = 4;
int VIDEO_EFFECT_VISAS_FREELOOK    = 5;
int VIDEO_EFFECT_CLAIRVOYANCEFULL  = 6;
int VIDEO_EFFECT_FURY_1            = 7;
int VIDEO_EFFECT_FURY_2            = 8;
int VIDEO_EFFECT_FURY_3            = 9;
int VIDEO_FFECT_SECURITY_NO_LABEL  = 10;//RWT-OEI 05/05/04 - Same as the Security Camera, but turns off the 'Press A to...' label.

// DJS-OEI 1/14/2004
// Modified the way these work. The values
// listed here are now direct references to
// rows in Tutorial.2DA. Originally these
// would have to be converted to .2DA ids
// in the code.
int TUTORIAL_WINDOW_START_SWOOP_RACE = 9;
int TUTORIAL_WINDOW_RETURN_TO_BASE   = 40;
// DJS-OEI 11/21/2003
int TUTORIAL_WINDOW_TEMP1            = 42;
int TUTORIAL_WINDOW_TEMP2            = 43;
int TUTORIAL_WINDOW_TEMP3            = 44;
int TUTORIAL_WINDOW_TEMP4            = 45;
int TUTORIAL_WINDOW_TEMP5            = 46;
int TUTORIAL_WINDOW_TEMP6            = 47;
int TUTORIAL_WINDOW_TEMP7            = 48;
int TUTORIAL_WINDOW_TEMP8            = 49;
int TUTORIAL_WINDOW_TEMP9            = 50;
int TUTORIAL_WINDOW_TEMP10           = 51;
int TUTORIAL_WINDOW_TEMP11           = 52;
int TUTORIAL_WINDOW_TEMP12           = 53;
int TUTORIAL_WINDOW_TEMP13           = 54;
int TUTORIAL_WINDOW_TEMP14           = 55;
int TUTORIAL_WINDOW_TEMP15           = 56;

int AI_LEVEL_VERY_HIGH               =  4;  // AWD-OEI 7/08/2004
int AI_LEVEL_HIGH                    =  3;  // AWD-OEI 7/08/2004
int AI_LEVEL_NORMAL                  =  2;  // AWD-OEI 7/08/2004
int AI_LEVEL_LOW                     =  1;  // AWD-OEI 7/08/2004
int AI_LEVEL_VERY_LOW                =  0;  // AWD-OEI 7/08/2004

int MOVEMENT_SPEED_PC       = 0;
int MOVEMENT_SPEED_IMMOBILE     = 1;
int MOVEMENT_SPEED_VERYSLOW     = 2;
int MOVEMENT_SPEED_SLOW     = 3;
int MOVEMENT_SPEED_NORMAL   = 4;
int MOVEMENT_SPEED_FAST     = 5;
int MOVEMENT_SPEED_VERYFAST = 6;
int MOVEMENT_SPEED_DEFAULT      = 7;
int MOVEMENT_SPEED_DMFAST       = 8;

int LIVE_CONTENT_PKG1 = 1;
int LIVE_CONTENT_PKG2 = 2;
int LIVE_CONTENT_PKG3 = 3;
int LIVE_CONTENT_PKG4 = 4;
int LIVE_CONTENT_PKG5 = 5;
int LIVE_CONTENT_PKG6 = 6;

//RWT-OEI 12/16/03
//  These constants are for the Implant Swapping support in a_swapimplant
//  They correspond directly with the ACTIONIDs in the game for each of the
//  implant swapping actions.
int IMPLANT_NONE  = 0;
int IMPLANT_REGEN = 1;
int IMPLANT_STR   = 2;
int IMPLANT_END   = 3;
int IMPLANT_AGI   = 4;

// DJS-OEI 6/12/2004
// These constants can be OR'ed together and sent to SetForfeitConditions()
// in order to set up flagging situations that will alert the area script that
// the player has violated them. This is usually used for Battle Arena restrictions.
int FORFEIT_NO_FORCE_POWERS = 1;    // Player cannot cast any Force Powers
int FORFEIT_NO_ITEMS        = 2;    // Player cannot use any items (medpacs, grenades, stims, grenades)
int FORFEIT_NO_WEAPONS      = 4;    // Player must fight unarmed. Equipping a weapon is a forfeit.
int FORFEIT_DXUN_SWORD_ONLY = 8;    // Player can only use the sword with tag 'pl_sword' given to them at the start
                                    // of one of the Dxun Battle Circle fights, or no weapon at all.
int FORFEIT_NO_ARMOR        = 16;   // Player cannot use any armor.
int FORFEIT_NO_RANGED       = 32;   // Player cannot use ranged weapons.
int FORFEIT_NO_LIGHTSABER   = 64;   // Player cannot use lightsabers.
int FORFEIT_NO_ITEM_BUT_SHIELD  = 128;   // Player cannot use items except for shields.

string sLanguage = "nwscript";


// 0: Get an integer between 0 and nMaxInteger-1.
// Return value on error: 0
int Random(int nMaxInteger);

// 1: Output sString to the log file.
void PrintString(string sString);

// 2: Output a formatted float to the log file.
// - nWidth should be a value from 0 to 18 inclusive.
// - nDecimals should be a value from 0 to 9 inclusive.
void PrintFloat(float fFloat, int nWidth=18, int nDecimals=9);

// 3: Convert fFloat into a string.
// - nWidth should be a value from 0 to 18 inclusive.
// - nDecimals should be a value from 0 to 9 inclusive.
string FloatToString(float fFloat, int nWidth=18, int nDecimals=9);

// 4: Output nInteger to the log file.
void PrintInteger(int nInteger);

// 5: Output oObject's ID to the log file.
void PrintObject(object oObject);

// 6: Assign aActionToAssign to oActionSubject.
// * No return value, but if an error occurs, the log file will contain
//   "AssignCommand failed."
//   (If the object doesn't exist, nothing happens.)
void AssignCommand(object oActionSubject,action aActionToAssign);

// 7: Delay aActionToDelay by fSeconds.
// * No return value, but if an error occurs, the log file will contain
//   "DelayCommand failed.".
void DelayCommand(float fSeconds, action aActionToDelay);

// 8: Make oTarget run sScript and then return execution to the calling script.
// If sScript does not specify a compiled script, nothing happens.
// - nScriptVar: This value will be returned by calls to GetRunScriptVar.
void ExecuteScript(string sScript, object oTarget, int nScriptVar=-1);

// 9: Clear all the actions of the caller. (This will only work on Creatures)
// * No return value, but if an error occurs, the log file will contain
//   "ClearAllActions failed.".
void ClearAllActions();

// 10: Cause the caller to face fDirection.
// - fDirection is expressed as anticlockwise degrees from Due East.
//   DIRECTION_EAST, DIRECTION_NORTH, DIRECTION_WEST and DIRECTION_SOUTH are
//   predefined. (0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South)
void SetFacing(float fDirection);

// 11: Switches the main character to a specified NPC
//     -1 specifies to switch back to the original PC
int SwitchPlayerCharacter(int nNPC);

// 12: Set the time to the time specified.
// - nHour should be from 0 to 23 inclusive
// - nMinute should be from 0 to 59 inclusive
// - nSecond should be from 0 to 59 inclusive
// - nMillisecond should be from 0 to 999 inclusive
// 1) Time can only be advanced forwards; attempting to set the time backwards
//    will result in the day advancing and then the time being set to that
//    specified, e.g. if the current hour is 15 and then the hour is set to 3,
//    the day will be advanced by 1 and the hour will be set to 3.
// 2) If values larger than the max hour, minute, second or millisecond are
//    specified, they will be wrapped around and the overflow will be used to
//    advance the next field, e.g. specifying 62 hours, 250 minutes, 10 seconds
//    and 10 milliseconds will result in the calendar day being advanced by 2
//    and the time being set to 18 hours, 10 minutes, 10 milliseconds.
void SetTime(int nHour,int nMinute,int nSecond,int nMillisecond);

// 13: Sets (by NPC constant) which party member should be the controlled
//     character
int SetPartyLeader(int nNPC);

// 14: Sets whether the current area is escapable or not
// TRUE means you can not escape the area
// FALSE means you can escape the area
void SetAreaUnescapable(int bUnescapable);

// 15: Returns whether the current area is escapable or not
// TRUE means you can not escape the area
// FALSE means you can escape the area
int GetAreaUnescapable();

// 16: Get the current hour.
int GetTimeHour();

// 17: Get the current minute
int GetTimeMinute();

// 18: Get the current second
int GetTimeSecond();

// 19: Get the current millisecond
int GetTimeMillisecond();

// 20: The action subject will generate a random location near its current location
// and pathfind to it.  All commands will remove a RandomWalk() from the action
// queue if there is one in place.
// * No return value, but if an error occurs the log file will contain
//   "ActionRandomWalk failed."
void ActionRandomWalk();

// 21: The action subject will move to lDestination.
// - lDestination: The object will move to this location.  If the location is
//   invalid or a path cannot be found to it, the command does nothing.
// - bRun: If this is TRUE, the action subject will run rather than walk
// * No return value, but if an error occurs the log file will contain
//   "MoveToPoint failed."
void ActionMoveToLocation(location lDestination, int bRun=FALSE);

// 22: Cause the action subject to move to a certain distance from oMoveTo.
// If there is no path to oMoveTo, this command will do nothing.
// - oMoveTo: This is the object we wish the action subject to move to
// - bRun: If this is TRUE, the action subject will run rather than walk
// - fRange: This is the desired distance between the action subject and oMoveTo
// * No return value, but if an error occurs the log file will contain
//   "ActionMoveToObject failed."
void ActionMoveToObject(object oMoveTo, int bRun=FALSE, float fRange=1.0f);

// 23: Cause the action subject to move to a certain distance away from oFleeFrom.
// - oFleeFrom: This is the object we wish the action subject to move away from.
//   If oFleeFrom is not in the same area as the action subject, nothing will
//   happen.
// - bRun: If this is TRUE, the action subject will run rather than walk
// - fMoveAwayRange: This is the distance we wish the action subject to put
//   between themselves and oFleeFrom
// * No return value, but if an error occurs the log file will contain
//   "ActionMoveAwayFromObject failed."
void ActionMoveAwayFromObject(object oFleeFrom, int bRun=FALSE, float fMoveAwayRange=40.0f);

// 24: Get the area that oTarget is currently in
// * Return value on error: OBJECT_INVALID
object GetArea(object oTarget);

// 25: The value returned by this function depends on the object type of the caller:
// 1) If the caller is a door or placeable it returns the object that last
//    triggered it.
// 2) If the caller is a trigger, area of effect, module, area or encounter it
//    returns the object that last entered it.
// * Return value on error: OBJECT_INVALID
object GetEnteringObject();

// 26: Get the object that last left the caller.  This function works on triggers,
// areas of effect, modules, areas and encounters.
// * Return value on error: OBJECT_INVALID
object GetExitingObject();

// 27: Get the position of oTarget
// * Return value on error: vector (0.0f, 0.0f, 0.0f)
vector GetPosition(object oTarget);

// 28: Get the direction in which oTarget is facing, expressed as a float between
// 0.0f and 360.0f
// * Return value on error: -1.0f
float GetFacing(object oTarget);

// 29: Get the possessor of oItem
// * Return value on error: OBJECT_INVALID
object GetItemPossessor(object oItem);

// 30: Get the object possessed by oCreature with the tag sItemTag
// * Return value on error: OBJECT_INVALID
object GetItemPossessedBy(object oCreature, string sItemTag);

// 31: Create an item with the template sItemTemplate in oTarget's inventory.
// - nStackSize: This is the stack size of the item to be created
// * Return value: The object that has been created.  On error, this returns
//   OBJECT_INVALID.
//RWT-OEI 12/16/03 - Added the bHideMessage parameter
object CreateItemOnObject(string sItemTemplate, object oTarget=OBJECT_SELF, int nStackSize=1, int nHideMessage = 0);

// 32: Equip oItem into nInventorySlot.
// - nInventorySlot: INVENTORY_SLOT_*
// * No return value, but if an error occurs the log file will contain
//   "ActionEquipItem failed."
void ActionEquipItem(object oItem, int nInventorySlot, int bInstant=FALSE);

// 33: Unequip oItem from whatever slot it is currently in.
void ActionUnequipItem( object oItem, int bInstant = FALSE );

// 34: Pick up oItem from the ground.
// * No return value, but if an error occurs the log file will contain
//   "ActionPickUpItem failed."
void ActionPickUpItem(object oItem);

// 35: Put down oItem on the ground.
// * No return value, but if an error occurs the log file will contain
//   "ActionPutDownItem failed."
void ActionPutDownItem(object oItem);

// 36: Get the last attacker of oAttackee.  This should only be used ONLY in the
// OnAttacked events for creatures, placeables and doors.
// * Return value on error: OBJECT_INVALID
object GetLastAttacker(object oAttackee=OBJECT_SELF);

// 37: Attack oAttackee.
// - bPassive: If this is TRUE, attack is in passive mode.
void ActionAttack(object oAttackee, int bPassive=FALSE);

// 38: Get the creature nearest to oTarget, subject to all the criteria specified.
// - nFirstCriteriaType: CREATURE_TYPE_*
// - nFirstCriteriaValue:
//   -> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS
//   -> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT
//      or CREATURE_TYPE_HAS_SPELL_EFFECT
//   -> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE
//   -> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION
//   -> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was
//      CREATURE_TYPE_PLAYER_CHAR
//   -> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE
//   -> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION
//   For example, to get the nearest PC, use:
//   (CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)
// - oTarget: We're trying to find the creature of the specified type that is
//   nearest to oTarget
// - nNth: We don't have to find the first nearest: we can find the Nth nearest...
// - nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to
//   further specify the type of creature that we are looking for.
// - nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue
//   to further specify the type of creature that we are looking for.
// - nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to
//   further specify the type of creature that we are looking for.
// - nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to
//   further specify the type of creature that we are looking for.
// * Return value on error: OBJECT_INVALID
object GetNearestCreature(int nFirstCriteriaType, int nFirstCriteriaValue, object oTarget=OBJECT_SELF, int nNth=1, int nSecondCriteriaType=-1, int nSecondCriteriaValue=-1, int nThirdCriteriaType=-1,  int nThirdCriteriaValue=-1 );

// 39: Add a speak action to the action subject.
// - sStringToSpeak: String to be spoken
// - nTalkVolume: TALKVOLUME_*
void ActionSpeakString(string sStringToSpeak, int nTalkVolume=TALKVOLUME_TALK);

// 40: Cause the action subject to play an animation
// - nAnimation: ANIMATION_*
// - fSpeed: Speed of the animation
// - fDurationSeconds: Duration of the animation (this is not used for Fire and
//   Forget animations) If a time of -1.0f is specified for a looping animation
//   it will loop until the next animation is applied.
void ActionPlayAnimation(int nAnimation, float fSpeed=1.0, float fDurationSeconds=0.0);

// 41: Get the distance from the caller to oObject in metres.
// * Return value on error: -1.0f
float GetDistanceToObject(object oObject);

// 42: * Returns TRUE if oObject is a valid object.
int GetIsObjectValid(object oObject);

// 43: Cause the action subject to open oDoor
void ActionOpenDoor(object oDoor);

// 44: Cause the action subject to close oDoor
void ActionCloseDoor(object oDoor);

// 45: Change the direction in which the camera is facing
// - fDirection is expressed as anticlockwise degrees from Due East.
//   (0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South)
// This can be used to change the way the camera is facing after the player
// emerges from an area transition.
void SetCameraFacing(float fDirection);

// 46: Play sSoundName
// - sSoundName: TBD - SS
void PlaySound(string sSoundName);

// 47: Get the object at which the caller last cast a spell
// * Return value on error: OBJECT_INVALID
object GetSpellTargetObject();

// 48: This action casts a spell at oTarget.
// - nSpell: SPELL_*
// - oTarget: Target for the spell
// - nMetamagic: METAMAGIC_*
// - bCheat: If this is TRUE, then the executor of the action doesn't have to be
//   able to cast the spell.
// - nDomainLevel: TBD - SS
// - nProjectilePathType: PROJECTILE_PATH_TYPE_*
// - bInstantSpell: If this is TRUE, the spell is cast immediately. This allows
//   the end-user to simulate a high-level magic-user having lots of advance
//   warning of impending trouble
void ActionCastSpellAtObject(int nSpell, object oTarget, int nMetaMagic=0 , int bCheat=FALSE, int nDomainLevel=0, int nProjectilePathType=PROJECTILE_PATH_TYPE_DEFAULT, int bInstantSpell=FALSE);

// 49: Get the current hitpoints of oObject
// * Return value on error: 0
int GetCurrentHitPoints(object oObject=OBJECT_SELF);

// 50: Get the maximum hitpoints of oObject
// * Return value on error: 0
int GetMaxHitPoints(object oObject=OBJECT_SELF);

// 51: EffectAssuredHit
// Create an Assured Hit effect, which guarantees that all attacks are successful
effect EffectAssuredHit();

// 52:
// Returns the last item that was equipped by a creature.
object GetLastItemEquipped();

// 53:
// Returns the ID of the subscreen that is currently onscreen.  This will be one of the
// SUBSCREEN_ID_* constant values.
int GetSubScreenID();

// 54:
// Cancels combat for the specified creature.
void CancelCombat( object oidCreature );

// 55:
// returns the current force points for the creature
int GetCurrentForcePoints(object oObject=OBJECT_SELF);

// 56:
// returns the Max force points for the creature
int GetMaxForcePoints(object oObject=OBJECT_SELF);

// 57:
// Pauses the game if bPause is TRUE.  Unpauses if bPause is FALSE.
void PauseGame( int bPause );

// 58: SetPlayerRestrictMode
// Sets whether the player is currently in 'restricted' mode
void SetPlayerRestrictMode( int bRestrict );

// 59: Get the length of sString
// * Return value on error: -1
int GetStringLength(string sString);

// 60: Convert sString into upper case
// * Return value on error: ""
string GetStringUpperCase(string sString);

// 61: Convert sString into lower case
// * Return value on error: ""
string GetStringLowerCase(string sString);

// 62: Get nCount characters from the right end of sString
// * Return value on error: ""
string GetStringRight(string sString, int nCount);

// 63: Get nCounter characters from the left end of sString
// * Return value on error: ""
string GetStringLeft(string sString, int nCount);

// 64: Insert sString into sDestination at nPosition
// * Return value on error: ""
string InsertString(string sDestination, string sString, int nPosition);

// 65: Get nCount characters from sString, starting at nStart
// * Return value on error: ""
string GetSubString(string sString, int nStart, int nCount);

// 66: Find the position of sSubstring inside sString
// * Return value on error: -1
int FindSubString(string sString, string sSubString);

// 67: Maths operation: absolute value of fValue
float fabs(float fValue);

// 68: Maths operation: cosine of fValue
float cos(float fValue);

// 69: Maths operation: sine of fValue
float sin(float fValue);

// 70: Maths operation: tan of fValue
float tan(float fValue);

// 71: Maths operation: arccosine of fValue
// * Returns zero if fValue > 1 or fValue < -1
float acos(float fValue);

// 72: Maths operation: arcsine of fValue
// * Returns zero if fValue >1 or fValue < -1
float asin(float fValue);

// 73: Maths operation: arctan of fValue
float atan(float fValue);

// 74: Maths operation: log of fValue
// * Returns zero if fValue <= zero
float log(float fValue);

// 75: Maths operation: fValue is raised to the power of fExponent
// * Returns zero if fValue ==0 and fExponent <0
float pow(float fValue, float fExponent);

// 76: Maths operation: square root of fValue
// * Returns zero if fValue <0
float sqrt(float fValue);

// 77: Maths operation: integer absolute value of nValue
// * Return value on error: 0
int abs(int nValue);

// 78: Create a Heal effect. This should be applied as an instantaneous effect.
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nDamageToHeal < 0.
effect EffectHeal(int nDamageToHeal);

// 79: Create a Damage effect
// - nDamageAmount: amount of damage to be dealt. This should be applied as an
//   instantaneous effect.
// - nDamageType: DAMAGE_TYPE_*
// - nDamagePower: DAMAGE_POWER_*
effect EffectDamage(int nDamageAmount, int nDamageType=DAMAGE_TYPE_UNIVERSAL, int nDamagePower=DAMAGE_POWER_NORMAL);

// 80: Create an Ability Increase effect
// - bAbilityToIncrease: ABILITY_*
effect EffectAbilityIncrease(int nAbilityToIncrease, int nModifyBy);

// 81: Create a Damage Resistance effect that removes the first nAmount points of
// damage of type nDamageType, up to nLimit (or infinite if nLimit is 0)
// - nDamageType: DAMAGE_TYPE_*
// - nAmount
// - nLimit
effect EffectDamageResistance(int nDamageType, int nAmount, int nLimit=0);

// 82: Create a Resurrection effect. This should be applied as an instantaneous effect.
// DJS-OEI 8/26/2004
// Added a parameter for the percentage of HP the target
// should receive when they are revived.
effect EffectResurrection( int nHPPercent=0 );

// 83: GetPlayerRestrictMode
// returns the current player 'restricted' mode
int GetPlayerRestrictMode(object oObject = OBJECT_SELF);

// 84: Get the Caster Level of oCreature.
// * Return value on error: 0;
int GetCasterLevel(object oCreature);

// 85: Get the first in-game effect on oCreature.
effect GetFirstEffect(object oCreature);

// 86: Get the next in-game effect on oCreature.
effect GetNextEffect(object oCreature);

// 87: Remove eEffect from oCreature.
// * No return value
void RemoveEffect(object oCreature, effect eEffect);

// 88: * Returns TRUE if eEffect is a valid effect.
int GetIsEffectValid(effect eEffect);

// 89: Get the duration type (DURATION_TYPE_*) of eEffect.
// * Return value if eEffect is not valid: -1
int GetEffectDurationType(effect eEffect);

// 90: Get the subtype (SUBTYPE_*) of eEffect.
// * Return value on error: 0
int GetEffectSubType(effect eEffect);

// 91: Get the object that created eEffect.
// * Returns OBJECT_INVALID if eEffect is not a valid effect.
object GetEffectCreator(effect eEffect);

// 92: Convert nInteger into a string.
// * Return value on error: ""
string IntToString(int nInteger);

// 93: Get the first object in oArea.
// If no valid area is specified, it will use the caller's area.
// - oArea
// - nObjectFilter: OBJECT_TYPE_*
// * Return value on error: OBJECT_INVALID
object GetFirstObjectInArea(object oArea=OBJECT_INVALID, int nObjectFilter=OBJECT_TYPE_CREATURE);

// 94: Get the next object in oArea.
// If no valid area is specified, it will use the caller's area.
// - oArea
// - nObjectFilter: OBJECT_TYPE_*
// * Return value on error: OBJECT_INVALID
object GetNextObjectInArea(object oArea=OBJECT_INVALID, int nObjectFilter=OBJECT_TYPE_CREATURE);

// 95: Get the total from rolling (nNumDice x d2 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d2(int nNumDice=1);

// 96: Get the total from rolling (nNumDice x d3 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d3(int nNumDice=1);

// 97: Get the total from rolling (nNumDice x d4 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d4(int nNumDice=1);

// 98: Get the total from rolling (nNumDice x d6 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d6(int nNumDice=1);

// 99: Get the total from rolling (nNumDice x d8 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d8(int nNumDice=1);

// 100: Get the total from rolling (nNumDice x d10 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d10(int nNumDice=1);

// 101: Get the total from rolling (nNumDice x d12 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d12(int nNumDice=1);

// 102: Get the total from rolling (nNumDice x d20 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d20(int nNumDice=1);

// 103: Get the total from rolling (nNumDice x d100 dice).
// - nNumDice: If this is less than 1, the value 1 will be used.
int d100(int nNumDice=1);

// 104: Get the magnitude of vVector; this can be used to determine the
// distance between two points.
// * Return value on error: 0.0f
float VectorMagnitude(vector vVector);

// 105: Get the metamagic type (METAMAGIC_*) of the last spell cast by the caller
// * Return value if the caster is not a valid object: -1
int GetMetaMagicFeat();

// 106: Get the object type (OBJECT_TYPE_*) of oTarget
// * Return value if oTarget is not a valid object: -1
int GetObjectType(object oTarget);

// 107: Get the racial type (RACIAL_TYPE_*) of oCreature
// * Return value if oCreature is not a valid creature: RACIAL_TYPE_INVALID
int GetRacialType(object oCreature);

// 108: Do a Fortitude Save check for the given DC
// - oCreature
// - nDC: Difficulty check
// - nSaveType: SAVING_THROW_TYPE_*
// - oSaveVersus
// Returns: 0 if the saving throw roll failed
// Returns: 1 if the saving throw roll succeeded
// Returns: 2 if the target was immune to the save type specified
int FortitudeSave(object oCreature, int nDC, int nSaveType=SAVING_THROW_TYPE_NONE, object oSaveVersus=OBJECT_SELF);

// 109: Does a Reflex Save check for the given DC
// - oCreature
// - nDC: Difficulty check
// - nSaveType: SAVING_THROW_TYPE_*
// - oSaveVersus
// Returns: 0 if the saving throw roll failed
// Returns: 1 if the saving throw roll succeeded
// Returns: 2 if the target was immune to the save type specified
int ReflexSave(object oCreature, int nDC, int nSaveType=SAVING_THROW_TYPE_NONE, object oSaveVersus=OBJECT_SELF);

// 110: Does a Will Save check for the given DC
// - oCreature
// - nDC: Difficulty check
// - nSaveType: SAVING_THROW_TYPE_*
// - oSaveVersus
// Returns: 0 if the saving throw roll failed
// Returns: 1 if the saving throw roll succeeded
// Returns: 2 if the target was immune to the save type specified
int WillSave(object oCreature, int nDC, int nSaveType=SAVING_THROW_TYPE_NONE, object oSaveVersus=OBJECT_SELF);

// 111: Get the DC to save against for a spell (5 + spell level + CHA Mod + WIS Mod).
// This can be called by a creature or by an Area of Effect object.
int GetSpellSaveDC();

// 112: Set the subtype of eEffect to Magical and return eEffect.
// (Effects default to magical if the subtype is not set)
effect MagicalEffect(effect eEffect);

// 113: Set the subtype of eEffect to Supernatural and return eEffect.
// (Effects default to magical if the subtype is not set)
effect SupernaturalEffect(effect eEffect);

// 114: Set the subtype of eEffect to Extraordinary and return eEffect.
// (Effects default to magical if the subtype is not set)
effect ExtraordinaryEffect(effect eEffect);

// 115: Create an AC Increase effect
// - nValue: size of AC increase
// - nModifyType: AC_*_BONUS
// - nDamageType: DAMAGE_TYPE_*
//   * Default value for nDamageType should only ever be used in this function prototype.
effect EffectACIncrease(int nValue, int nModifyType=AC_DODGE_BONUS, int nDamageType=AC_VS_DAMAGE_TYPE_ALL);

// 116: If oObject is a creature, this will return that creature's armour class
// If oObject is an item, door or placeable, this will return zero.
// - nForFutureUse: this parameter is not currently used
// * Return value if oObject is not a creature, item, door or placeable: -1
int GetAC(object oObject, int nForFutureUse=0);

// 117: Create an AC Decrease effect
// - nSave: SAVING_THROW_* (not SAVING_THROW_TYPE_*)
// - nValue: size of AC decrease
// - nSaveType: SAVING_THROW_TYPE_*
effect EffectSavingThrowIncrease(int nSave, int nValue, int nSaveType=SAVING_THROW_TYPE_ALL);

// 118: Create an Attack Increase effect
// - nBonus: size of attack bonus
// - nModifierType: ATTACK_BONUS_*
effect EffectAttackIncrease(int nBonus, int nModifierType=ATTACK_BONUS_MISC);

// 119: Create a Damage Reduction effect
// - nAmount: amount of damage reduction
// - nDamagePower: DAMAGE_POWER_*
// - nLimit: How much damage the effect can absorb before disappearing.
//   Set to zero for infinite
effect EffectDamageReduction(int nAmount, int nDamagePower, int nLimit=0);

// 120: Create a Damage Increase effect
// - nBonus: DAMAGE_BONUS_*
// - nDamageType: DAMAGE_TYPE_*
effect EffectDamageIncrease(int nBonus, int nDamageType=DAMAGE_TYPE_UNIVERSAL);

// 121: Convert nRounds into a number of seconds
// A round is always 6.0 seconds
float RoundsToSeconds(int nRounds);

// 122: Convert nHours into a number of seconds
// The result will depend on how many minutes there are per hour (game-time)
float HoursToSeconds(int nHours);

// 123: Convert nTurns into a number of seconds
// A turn is always 60.0 seconds
float TurnsToSeconds(int nTurns);

// 124. SoundObjectSetFixedVariance
// Sets the constant variance at which to play the sound object
// This variance is a multiplier of the original sound
void SoundObjectSetFixedVariance( object oSound, float fFixedVariance );

// 125: Get an integer between 0 and 100 (inclusive) to represent oCreature's
// Good/Evil alignment
// (100=good, 0=evil)
// * Return value if oCreature is not a valid creature: -1
int GetGoodEvilValue(object oCreature);

// 126: GetPartyMemberCount
// Returns a count of how many members are in the party including the player character
int GetPartyMemberCount();

// 127: Return an ALIGNMENT_* constant to represent oCreature's good/evil alignment
// * Return value if oCreature is not a valid creature: -1
int GetAlignmentGoodEvil(object oCreature);

// 128: Get the first object in nShape
// - nShape: SHAPE_*
// - fSize:
//   -> If nShape == SHAPE_SPHERE, this is the radius of the sphere
//   -> If nShape == SHAPE_SPELLCYLINDER, this is the radius of the cylinder
//   -> If nShape == SHAPE_CONE, this is the widest radius of the cone
//   -> If nShape == SHAPE_CUBE, this is half the length of one of the sides of
//      the cube
// - lTarget: This is the centre of the effect, usually GetSpellTargetPosition(),
//   or the end of a cylinder or cone.
// - bLineOfSight: This controls whether to do a line-of-sight check on the
//   object returned.
//   (This can be used to ensure that spell effects do not go through walls.)
// - nObjectFilter: This allows you to filter out undesired object types, using
//   bitwise "or".
//   For example, to return only creatures and doors, the value for this
//   parameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR
// - vOrigin: This is only used for cylinders and cones, and specifies the
//   origin of the effect(normally the spell-caster's position).
// Return value on error: OBJECT_INVALID
object GetFirstObjectInShape(int nShape, float fSize, location lTarget, int bLineOfSight=FALSE, int nObjectFilter=OBJECT_TYPE_CREATURE, vector vOrigin=[0.0,0.0,0.0]);

// 129: Get the next object in nShape
// - nShape: SHAPE_*
// - fSize:
//   -> If nShape == SHAPE_SPHERE, this is the radius of the sphere
//   -> If nShape == SHAPE_SPELLCYLINDER, this is the radius of the cylinder
//   -> If nShape == SHAPE_CONE, this is the widest radius of the cone
//   -> If nShape == SHAPE_CUBE, this is half the length of one of the sides of
//      the cube
// - lTarget: This is the centre of the effect, usually GetSpellTargetPosition(),
//   or the end of a cylinder or cone.
// - bLineOfSight: This controls whether to do a line-of-sight check on the
//   object returned. (This can be used to ensure that spell effects do not go
//   through walls.)
// - nObjectFilter: This allows you to filter out undesired object types, using
//   bitwise "or". For example, to return only creatures and doors, the value for
//   this parameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR
// - vOrigin: This is only used for cylinders and cones, and specifies the origin
//   of the effect (normally the spell-caster's position).
// Return value on error: OBJECT_INVALID
object GetNextObjectInShape(int nShape, float fSize, location lTarget, int bLineOfSight=FALSE, int nObjectFilter=OBJECT_TYPE_CREATURE, vector vOrigin=[0.0,0.0,0.0]);

// 130: Create an Entangle effect
// When applied, this effect will restrict the creature's movement and apply a
// (-2) to all attacks and a -4 to AC.
effect EffectEntangle();

// 131: Cause oObject to run evToRun
void SignalEvent(object oObject, event evToRun);

// 132: Create an event of the type nUserDefinedEventNumber
event EventUserDefined(int nUserDefinedEventNumber);

// 133: Create a Death effect
// - nSpectacularDeath: if this is TRUE, the creature to which this effect is
//   applied will die in an extraordinary fashion
// - nDisplayFeedback
// - nNoFadeAway: Passing TRUE for this parameter will keep the bodies from fading after the creature
//                dies. Note that NO XP will be awarded if the creature is killed with this parameter.
effect EffectDeath(int nSpectacularDeath=FALSE, int nDisplayFeedback=TRUE, int nNoFadeAway=FALSE);

// 134: Create a Knockdown effect
// This effect knocks creatures off their feet, they will sit until the effect
// is removed. This should be applied as a temporary effect with a 3 second
// duration minimum (1 second to fall, 1 second sitting, 1 second to get up).
effect EffectKnockdown();

// 135: Give oItem to oGiveTo
// If oItem is not a valid item, or oGiveTo is not a valid object, nothing will
// happen.
void ActionGiveItem(object oItem, object oGiveTo);

// 136: Take oItem from oTakeFrom
// If oItem is not a valid item, or oTakeFrom is not a valid object, nothing
// will happen.
void ActionTakeItem(object oItem, object oTakeFrom);

// 137: Normalize vVector
vector VectorNormalize(vector vVector);

// 138:
// Gets the stack size of an item.
int GetItemStackSize( object oItem );

// 139: Get the ability score of type nAbility for a creature (otherwise 0)
// - oCreature: the creature whose ability score we wish to find out
// - nAbilityType: ABILITY_*
// Return value on error: 0
int GetAbilityScore(object oCreature, int nAbilityType);

// 140: * Returns TRUE if oCreature is a dead NPC, dead PC or a dying PC.
int GetIsDead(object oCreature);

// 141: Output vVector to the logfile.
// - vVector
// - bPrepend: if this is TRUE, the message will be prefixed with "PRINTVECTOR:"
void PrintVector(vector vVector, int bPrepend);

// 142: Create a vector with the specified values for x, y and z
vector Vector(float x=0.0f, float y=0.0f, float z=0.0f);

// 143: Cause the caller to face vTarget
void SetFacingPoint(vector vTarget);

// 144: Convert fAngle to a vector
vector AngleToVector(float fAngle);

// 145: Convert vVector to an angle
float VectorToAngle(vector vVector);

// 146: The caller will perform a Melee Touch Attack on oTarget
// This is not an action, and it assumes the caller is already within range of
// oTarget
// * Returns 0 on a miss, 1 on a hit and 2 on a critical hit
int TouchAttackMelee(object oTarget, int bDisplayFeedback=TRUE);

// 147: The caller will perform a Ranged Touch Attack on oTarget
// * Returns 0 on a miss, 1 on a hit and 2 on a critical hit
int TouchAttackRanged(object oTarget, int bDisplayFeedback=TRUE);

// 148: Create a Paralyze effect
effect EffectParalyze();

// 149: Create a Spell Immunity effect.
// There is a known bug with this function. There *must* be a parameter specified
// when this is called (even if the desired parameter is SPELL_ALL_SPELLS),
// otherwise an effect of type EFFECT_TYPE_INVALIDEFFECT will be returned.
// - nImmunityToSpell: SPELL_*
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nImmunityToSpell is
//   invalid.
effect EffectSpellImmunity(int nImmunityToSpell=FORCE_POWER_ALL_FORCE_POWERS);

// 150:
// Set the stack size of an item.
// NOTE: The stack size will be clamped to between 1 and the max stack size (as
//       specified in the base item).
void SetItemStackSize( object oItem, int nStackSize );

// 151: Get the distance in metres between oObjectA and oObjectB.
// * Return value if either object is invalid: 0.0f
float GetDistanceBetween(object oObjectA, object oObjectB);

// 152: SetReturnStrref
// This function will turn on/off the display of the 'return to ebon hawk' option
// on the map screen and allow the string to be changed to an arbitrary string ref
// srReturnQueryStrRef is the string ref that will be displayed in the query pop
// up confirming that you wish to return to the specified location.
void SetReturnStrref(int bShow, int srStringRef = 0, int srReturnQueryStrRef = 0);

// 153: EffectForceJump
// The effect required for force jumping
effect EffectForceJump(object oTarget, int nAdvanced = 0);

// 154: Create a Sleep effect
effect EffectSleep();

// 155: Get the object which is in oCreature's specified inventory slot
// - nInventorySlot: INVENTORY_SLOT_*
// - oCreature
// * Returns OBJECT_INVALID if oCreature is not a valid creature or there is no
//   item in nInventorySlot.
object GetItemInSlot(int nInventorySlot, object oCreature=OBJECT_SELF);

// 156: This was previously EffectCharmed();
effect EffectTemporaryForcePoints(int nTempForce);

// 157: Create a Confuse effect
effect EffectConfused();

// 158: Create a Frighten effect
effect EffectFrightened();

// 159: Choke the bugger...
effect EffectChoke( );

// 160: Sets a global string with the specified identifier.  This is an EXTREMELY
//      restricted function - do not use without expilicit permission.
//      This means if you are not Preston.  Then go see him if you're even thinking
//      about using this.
void SetGlobalString( string sIdentifier, string sValue );

// 161: Create a Stun effect
effect EffectStunned();

// 162: Set whether oTarget's action stack can be modified
void SetCommandable(int bCommandable, object oTarget=OBJECT_SELF);

// 163: Determine whether oTarget's action stack can be modified.
int GetCommandable(object oTarget=OBJECT_SELF);

// 164: Create a Regenerate effect.
// - nAmount: amount of damage to be regenerated per time interval
// - fIntervalSeconds: length of interval in seconds
effect EffectRegenerate(int nAmount, float fIntervalSeconds);

// 165: Create a Movement Speed Increase effect.
// - nNewSpeedPercent: This works in a dodgy way so please read this notes carefully.
//   If you supply an integer under 100, 100 gets added to it to produce the final speed.
//   e.g. if you supply 50, then the resulting speed is 150% of the original speed.
//   If you supply 100 or above, then this is used directly as the resulting speed.
//   e.g. if you specify 100, then the resulting speed is 100% of the original speed that is,
//        it is unchanged.
//        However if you specify 200, then the resulting speed is double the original speed.
effect EffectMovementSpeedIncrease(int nNewSpeedPercent);

// 166: Get the number of hitdice for oCreature.
// * Return value if oCreature is not a valid creature: 0
int GetHitDice(object oCreature);

// 167: The action subject will follow oFollow until a ClearAllActions() is called.
// - oFollow: this is the object to be followed
// - fFollowDistance: follow distance in metres
// * No return value
void ActionForceFollowObject(object oFollow, float fFollowDistance=0.0f);

// 168: Get the Tag of oObject
// * Return value if oObject is not a valid object: ""
string GetTag(object oObject);

// 169: Do a Force Resistance check between oSource and oTarget, returning TRUE if
// the force was resisted.
// * Return value if oSource or oTarget is an invalid object: FALSE
int ResistForce(object oSource, object oTarget);

// 170: Get the effect type (EFFECT_TYPE_*) of eEffect.
// * Return value if eEffect is invalid: EFFECT_INVALIDEFFECT
int GetEffectType(effect eEffect);

// 171: Create an Area Of Effect effect in the area of the creature it is applied to.
// If the scripts are not specified, default ones will be used.
effect EffectAreaOfEffect(int nAreaEffectId, string sOnEnterScript="", string sHeartbeatScript="", string sOnExitScript="");

// 172: * Returns TRUE if the Faction Ids of the two objects are the same
int GetFactionEqual(object oFirstObject, object oSecondObject=OBJECT_SELF);

// 173: Make oObjectToChangeFaction join the faction of oMemberOfFactionToJoin.
// NB. ** This will only work for two NPCs **
void ChangeFaction(object oObjectToChangeFaction, object oMemberOfFactionToJoin);

// 174: * Returns TRUE if oObject is listening for something
int GetIsListening(object oObject);

// 175: Set whether oObject is listening.
void SetListening(object oObject, int bValue);

// 176: Set the string for oObject to listen for.
// Note: this does not set oObject to be listening.
void SetListenPattern(object oObject, string sPattern, int nNumber=0);

// 177: * Returns TRUE if sStringToTest matches sPattern.
int TestStringAgainstPattern(string sPattern, string sStringToTest);

// 178: Get the appropriate matched string (this should only be used in
// OnConversation scripts).
// * Returns the appropriate matched string, otherwise returns ""
string GetMatchedSubstring(int nString);

// 179: Get the number of string parameters available.
// * Returns -1 if no string matched (this could be because of a dialogue event)
int GetMatchedSubstringsCount();

// 180: * Create a Visual Effect that can be applied to an object.
// - nVisualEffectId
// - nMissEffect: if this is TRUE, a random vector near or past the target will
//   be generated, on which to play the effect
effect EffectVisualEffect(int nVisualEffectId, int nMissEffect=FALSE);

// 181: Get the weakest member of oFactionMember's faction.
// * Returns OBJECT_INVALID if oFactionMember's faction is invalid.
object GetFactionWeakestMember(object oFactionMember=OBJECT_SELF, int bMustBeVisible=TRUE);

// 182: Get the strongest member of oFactionMember's faction.
// * Returns OBJECT_INVALID if oFactionMember's faction is invalid.
object GetFactionStrongestMember(object oFactionMember=OBJECT_SELF, int bMustBeVisible=TRUE);

// 183: Get the member of oFactionMember's faction that has taken the most hit points
// of damage.
// * Returns OBJECT_INVALID if oFactionMember's faction is invalid.
object GetFactionMostDamagedMember(object oFactionMember=OBJECT_SELF, int bMustBeVisible=TRUE);

// 184: Get the member of oFactionMember's faction that has taken the fewest hit
// points of damage.
// * Returns OBJECT_INVALID if oFactionMember's faction is invalid.
object GetFactionLeastDamagedMember(object oFactionMember=OBJECT_SELF, int bMustBeVisible=TRUE);

// 185: Get the amount of gold held by oFactionMember's faction.
// * Returns -1 if oFactionMember's faction is invalid.
int GetFactionGold(object oFactionMember);

// 186: Get an integer between 0 and 100 (inclusive) that represents how
// oSourceFactionMember's faction feels about oTarget.
// * Return value on error: -1
int GetFactionAverageReputation(object oSourceFactionMember, object oTarget);

// 187: Get an integer between 0 and 100 (inclusive) that represents the average
// good/evil alignment of oFactionMember's faction.
// * Return value on error: -1
int GetFactionAverageGoodEvilAlignment(object oFactionMember);

// 188. SoundObjectGetFixedVariance
// Gets the constant variance at which to play the sound object
float SoundObjectGetFixedVariance(object oSound);

// 189: Get the average level of the members of the faction.
// * Return value on error: -1
int GetFactionAverageLevel(object oFactionMember);

// 190: Get the average XP of the members of the faction.
// * Return value on error: -1
int GetFactionAverageXP(object oFactionMember);

// 191: Get the most frequent class in the faction - this can be compared with the
// constants CLASS_TYPE_*.
// * Return value on error: -1
int GetFactionMostFrequentClass(object oFactionMember);

// 192: Get the object faction member with the lowest armour class.
// * Returns OBJECT_INVALID if oFactionMember's faction is invalid.
object GetFactionWorstAC(object oFactionMember=OBJECT_SELF, int bMustBeVisible=TRUE);

// 193: Get the object faction member with the highest armour class.
// * Returns OBJECT_INVALID if oFactionMember's faction is invalid.
object GetFactionBestAC(object oFactionMember=OBJECT_SELF, int bMustBeVisible=TRUE);

// 194: Get a global string with the specified identifier
//      This is an EXTREMELY restricted function.  Use only with explicit permission.
//      This means if you are not Preston.  Then go see him if you're even thinking
//      about using this.
string GetGlobalString( string sIdentifier );

// 195: In an onConversation script this gets the number of the string pattern
// matched (the one that triggered the script).
// * Returns -1 if no string matched
int GetListenPatternNumber();

// 196: Jump to an object ID, or as near to it as possible.
void ActionJumpToObject(object oToJumpTo, int bWalkStraightLineToPoint=TRUE);

// 197: Get the first waypoint with the specified tag.
// * Returns OBJECT_INVALID if the waypoint cannot be found.
object GetWaypointByTag(string sWaypointTag);

// 198: Get the destination (a waypoint or a door) for a trigger or a door.
// * Returns OBJECT_INVALID if oTransition is not a valid trigger or door.
object GetTransitionTarget(object oTransition);

// 199: Link the two supplied effects, returning eChildEffect as a child of
// eParentEffect.
// Note: When applying linked effects if the target is immune to all valid
// effects all other effects will be removed as well. This means that if you
// apply a visual effect and a silence effect (in a link) and the target is
// immune to the silence effect that the visual effect will get removed as well.
// Visual Effects are not considered "valid" effects for the purposes of
// determining if an effect will be removed or not and as such should never be
// packaged *only* with other visual effects in a link.
effect EffectLinkEffects(effect eChildEffect, effect eParentEffect );

// 200: Get the nNth object with the specified tag.
// - sTag
// - nNth: the nth object with this tag may be requested
// * Returns OBJECT_INVALID if the object cannot be found.
object GetObjectByTag(string sTag, int nNth=0);

// 201: Adjust the alignment of oSubject.
// - oSubject
// - nAlignment:
//   -> ALIGNMENT_LIGHT_SIDE/ALIGNMENT_DARK_SIDE: oSubject's
//      alignment will be shifted in the direction specified
//   -> ALIGNMENT_NEUTRAL: nShift is applied to oSubject's dark side/light side
//      alignment value in the direction which is towards neutrality.
//     e.g. If oSubject has an alignment value of 80 (i.e. light side)
//          then if nShift is 15, the alignment value will become (80-15)=65
//     Furthermore, the shift will at most take the alignment value to 50 and
//     not beyond.
//     e.g. If oSubject has an alignment value of 40 then if nShift is 15,
//          the aligment value will become 50
// - nShift: this is the desired shift in alignment
// * No return value
// - bDontModifyNPCs - Defaults to 'FALSE', if you pass in 'TRUE' then you can adjust
//   the playercharacter's alignment without impacting the rest of the NPCs
void AdjustAlignment(object oSubject, int nAlignment, int nShift, int bDontModifyNPCs = FALSE);

// 202: Do nothing for fSeconds seconds.
void ActionWait(float fSeconds);

// 203: Set the transition bitmap of a player; this should only be called in area
// transition scripts. This action should be run by the person "clicking" the
// area transition via AssignCommand.
// - nPredefinedAreaTransition:
//   -> To use a predefined area transition bitmap, use one of AREA_TRANSITION_*
//   -> To use a custom, user-defined area transition bitmap, use
//      AREA_TRANSITION_USER_DEFINED and specify the filename in the second
//      parameter
// - sCustomAreaTransitionBMP: this is the filename of a custom, user-defined
//   area transition bitmap
void SetAreaTransitionBMP(int nPredefinedAreaTransition, string sCustomAreaTransitionBMP="");

// AMF: APRIL 28, 2003 - I HAVE CHANGED THIS FUNCTION AS PER DAN'S REQUEST
// 204: Starts a conversation with oObjectToConverseWith - this will cause their
// OnDialog event to fire.
// - oObjectToConverseWith
// - sDialogResRef: If this is blank, the creature's own dialogue file will be used
// - bPrivateConversation: If this is blank, the default is FALSE.
// - nConversationType - If this is blank the default will be Cinematic, ie. a normal conversation type
//                                  other choices inclue: CONVERSATION_TYPE_COMPUTER
//   UPDATE:  nConversationType actually has no meaning anymore.  This has been replaced by a flag in the dialog editor.  However
//                for backwards compatability it has been left here.  So when using this command place CONVERSATION_TYPE_CINEMATIC in here. - DJF
// - bIgnoreStartRange - If this is blank the default will be FALSE, ie. Start conversation ranges are in effect
//                                                                      Setting this to TRUE will cause creatures to start a conversation without requiring to close
//                                                                      the distance between the two object in dialog.
// - sNameObjectToIgnore1-6 - Normally objects in the animation list of the dialog editor have to be available for animations on that node to work
//                                        these 6 strings are to indicate 6 objects that don’t need to be available for things to proceed.  The string should be EXACTLY
//                                        the same as the string that it represents in the dialog editor.
// - nBarkX and nBarkY - These override the left, top corner position for the bark string if the conversation starting is a bark string.
//                       They only happen on a conversation by conversation basis and don't stay in effect in subsequent conversations.
void ActionStartConversation(object oObjectToConverse, string sDialogResRef = "", int bPrivateConversation = FALSE, int nConversationType = CONVERSATION_TYPE_CINEMATIC, int bIgnoreStartRange = FALSE, string sNameObjectToIgnore1 = "", string sNameObjectToIgnore2 = "", string sNameObjectToIgnore3 = "", string sNameObjectToIgnore4 = "", string sNameObjectToIgnore5 = "", string sNameObjectToIgnore6 = "", int bUseLeader = FALSE, int nBarkX = -1, int nBarkY = -1, int bDontClearAllActions = 0);

// 205: Pause the current conversation.
void ActionPauseConversation();

// 206: Resume a conversation after it has been paused.
void ActionResumeConversation();

// 207: Create a Beam effect.
// - nBeamVisualEffect: VFX_BEAM_*
// - oEffector: the beam is emitted from this creature
// - nBodyPart: BODY_NODE_*
// - bMissEffect: If this is TRUE, the beam will fire to a random vector near or
//   past the target
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nBeamVisualEffect is
//   not valid.
effect EffectBeam(int nBeamVisualEffect, object oEffector, int nBodyPart, int bMissEffect=FALSE);

// 208: Get an integer between 0 and 100 (inclusive) that represents how oSource
// feels about oTarget.
// -> 0-10 means oSource is hostile to oTarget
// -> 11-89 means oSource is neutral to oTarget
// -> 90-100 means oSource is friendly to oTarget
// * Returns -1 if oSource or oTarget does not identify a valid object
int GetReputation(object oSource, object oTarget);

// 209: Adjust how oSourceFactionMember's faction feels about oTarget by the
// specified amount.
// Note: This adjusts Faction Reputation, how the entire faction that
// oSourceFactionMember is in, feels about oTarget.
// * No return value
void AdjustReputation(object oTarget, object oSourceFactionMember, int nAdjustment);

// 210: Gets the actual file name of the current module
string GetModuleFileName();

// 211: Get the creature that is going to attack oTarget.
// Note: This value is cleared out at the end of every combat round and should
// not be used in any case except when getting a "going to be attacked" shout
// from the master creature (and this creature is a henchman)
// * Returns OBJECT_INVALID if oTarget is not a valid creature.
object GetGoingToBeAttackedBy(object oTarget);

// 212: Create a Force Resistance Increase effect.
// - nValue: size of Force Resistance increase
effect EffectForceResistanceIncrease(int nValue);

// 213: Get the location of oObject.
location GetLocation(object oObject);

// 214: The subject will jump to lLocation instantly (even between areas).
// If lLocation is invalid, nothing will happen.
void ActionJumpToLocation(location lLocation);

// 215: Create a location.
location Location(vector vPosition, float fOrientation);

// 216: Apply eEffect at lLocation.
void ApplyEffectAtLocation(int nDurationType, effect eEffect, location lLocation, float fDuration=0.0f);

// 217: * Returns TRUE if oCreature is a Player Controlled character.
int GetIsPC(object oCreature);

// 218: Convert fFeet into a number of meters.
float FeetToMeters(float fFeet);

// 219: Convert fYards into a number of meters.
float YardsToMeters(float fYards);

// 220: Apply eEffect to oTarget.
void ApplyEffectToObject(int nDurationType, effect eEffect, object oTarget, float fDuration=0.0f);

// 221: The caller will immediately speak sStringToSpeak (this is different from
// ActionSpeakString)
// - sStringToSpeak
// - nTalkVolume: TALKVOLUME_*
void SpeakString(string sStringToSpeak, int nTalkVolume=TALKVOLUME_TALK);

// 222: Get the location of the caller's last spell target.
location GetSpellTargetLocation();

// 223: Get the position vector from lLocation.
vector GetPositionFromLocation(location lLocation);

// 224: the effect of body fule.. convers HP -> FP i think
effect EffectBodyFuel( );

// 225: Get the orientation value from lLocation.
float GetFacingFromLocation(location lLocation);

// 226: Get the creature nearest to lLocation, subject to all the criteria specified.
// - nFirstCriteriaType: CREATURE_TYPE_*
// - nFirstCriteriaValue:
//   -> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS
//   -> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT
//      or CREATURE_TYPE_HAS_SPELL_EFFECT
//   -> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE
//   -> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION
//   -> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was
//      CREATURE_TYPE_PLAYER_CHAR
//   -> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE
//   -> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION
//   For example, to get the nearest PC, use
//   (CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)
// - lLocation: We're trying to find the creature of the specified type that is
//   nearest to lLocation
// - nNth: We don't have to find the first nearest: we can find the Nth nearest....
// - nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to
//   further specify the type of creature that we are looking for.
// - nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue
//   to further specify the type of creature that we are looking for.
// - nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to
//   further specify the type of creature that we are looking for.
// - nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to
//   further specify the type of creature that we are looking for.
// * Return value on error: OBJECT_INVALID
object GetNearestCreatureToLocation(int nFirstCriteriaType, int nFirstCriteriaValue,  location lLocation, int nNth=1, int nSecondCriteriaType=-1, int nSecondCriteriaValue=-1, int nThirdCriteriaType=-1,  int nThirdCriteriaValue=-1 );

// 227: Get the Nth object nearest to oTarget that is of the specified type.
// - nObjectType: OBJECT_TYPE_*
// - oTarget
// - nNth
// * Return value on error: OBJECT_INVALID
object GetNearestObject(int nObjectType=OBJECT_TYPE_ALL, object oTarget=OBJECT_SELF, int nNth=1);

// 228: Get the nNth object nearest to lLocation that is of the specified type.
// - nObjectType: OBJECT_TYPE_*
// - lLocation
// - nNth
// * Return value on error: OBJECT_INVALID
object GetNearestObjectToLocation(int nObjectType, location lLocation, int nNth=1);

// 229: Get the nth Object nearest to oTarget that has sTag as its tag.
// * Return value on error: OBJECT_INVALID
object GetNearestObjectByTag(string sTag, object oTarget=OBJECT_SELF, int nNth=1);

// 230: Convert nInteger into a floating point number.
float IntToFloat(int nInteger);

// 231: Convert fFloat into the nearest integer.
int FloatToInt(float fFloat);

// 232: Convert sNumber into an integer.
int StringToInt(string sNumber);

// 233: Convert sNumber into a floating point number.
float StringToFloat(string sNumber);

// 234: Cast spell nSpell at lTargetLocation.
// - nSpell: SPELL_*
// - lTargetLocation
// - nMetaMagic: METAMAGIC_*
// - bCheat: If this is TRUE, then the executor of the action doesn't have to be
//   able to cast the spell.
// - nProjectilePathType: PROJECTILE_PATH_TYPE_*
// - bInstantSpell: If this is TRUE, the spell is cast immediately; this allows
//   the end-user to simulate
//   a high-level magic user having lots of advance warning of impending trouble.
void   ActionCastSpellAtLocation(int nSpell, location lTargetLocation, int nMetaMagic=0, int bCheat=FALSE, int nProjectilePathType=PROJECTILE_PATH_TYPE_DEFAULT, int bInstantSpell=FALSE);

// 235: * Returns TRUE if oSource considers oTarget as an enemy.
int GetIsEnemy(object oTarget, object oSource=OBJECT_SELF);

// 236: * Returns TRUE if oSource considers oTarget as a friend.
int GetIsFriend(object oTarget, object oSource=OBJECT_SELF);

// 237: * Returns TRUE if oSource considers oTarget as neutral.
int GetIsNeutral(object oTarget, object oSource=OBJECT_SELF);

// 238: Get the PC that is involved in the conversation.
// * Returns OBJECT_INVALID on error.
object GetPCSpeaker();

// 239: Get a string from the talk table using nStrRef.
string GetStringByStrRef(int nStrRef);

// 240: Causes the creature to speak a translated string.
// - nStrRef: Reference of the string in the talk table
// - nTalkVolume: TALKVOLUME_*
void ActionSpeakStringByStrRef(int nStrRef, int nTalkVolume=TALKVOLUME_TALK);

// 241: Destroy oObject (irrevocably).
// This will not work on modules and areas.
// The bNoFade and fDelayUntilFade are for creatures and placeables only
void DestroyObject(object oDestroy, float fDelay=0.0f, int bNoFade = FALSE, float fDelayUntilFade = 0.0f, int nHideFeedback = 0);

// 242: Get the module.
// * Return value on error: OBJECT_INVALID
object GetModule();

// 243: Create an object of the specified type at lLocation.
// - nObjectType: OBJECT_TYPE_ITEM, OBJECT_TYPE_CREATURE, OBJECT_TYPE_PLACEABLE,
//   OBJECT_TYPE_STORE
// - sTemplate
// - lLocation
// - bUseAppearAnimation
// Waypoints can now also be created using the CreateObject function.
// nObjectType is: OBJECT_TYPE_WAYPOINT
// sTemplate will be the tag of the waypoint
// lLocation is where the waypoint will be placed
// bUseAppearAnimation is ignored
object CreateObject(int nObjectType, string sTemplate, location lLocation, int bUseAppearAnimation=FALSE);

// 244: Create an event which triggers the "SpellCastAt" script
event EventSpellCastAt(object oCaster, int nSpell, int bHarmful=TRUE);

// 245: This is for use in a "Spell Cast" script, it gets who cast the spell.
// The spell could have been cast by a creature, placeable or door.
// * Returns OBJECT_INVALID if the caller is not a creature, placeable or door.
object GetLastSpellCaster();

// 246: This is for use in a "Spell Cast" script, it gets the ID of the spell that
// was cast.
int GetLastSpell();

// 247: This is for use in a user-defined script, it gets the event number.
int GetUserDefinedEventNumber();

// 248: This is for use in a Spell script, it gets the ID of the spell that is being
// cast (SPELL_*).
int GetSpellId();

// 249: Generate a random name.
string RandomName();

// 250: Create a Poison effect.
// - nPoisonType: POISON_*
effect EffectPoison(int nPoisonType);

// 251: Returns whether this script is being run
//      while a load game is in progress
int GetLoadFromSaveGame();

// 252: Assured Deflection
// This effect ensures that all projectiles shot at a jedi will be deflected
// without doing an opposed roll.  It takes an optional parameter to say whether
// the deflected projectile will return to the attacker and cause damage
effect EffectAssuredDeflection(int nReturn = 0);

// 253: Get the name of oObject.
string GetName(object oObject);

// 254: Use this in a conversation script to get the person with whom you are conversing.
// * Returns OBJECT_INVALID if the caller is not a valid creature.
object GetLastSpeaker();

// 255: Use this in an OnDialog script to start up the dialog tree.
// - sResRef: if this is not specified, the default dialog file will be used
// - oObjectToDialog: if this is not specified the person that triggered the
//   event will be used
int BeginConversation(string sResRef="", object oObjectToDialog=OBJECT_INVALID);

// 256: Use this in an OnPerception script to get the object that was perceived.
// * Returns OBJECT_INVALID if the caller is not a valid creature.
object GetLastPerceived();

// 257: Use this in an OnPerception script to determine whether the object that was
// perceived was heard.
int GetLastPerceptionHeard();

// 258: Use this in an OnPerception script to determine whether the object that was
// perceived has become inaudible.
int GetLastPerceptionInaudible();

// 259: Use this in an OnPerception script to determine whether the object that was
// perceived was seen.
int GetLastPerceptionSeen();

// 260: Use this in an OnClosed script to get the object that closed the door or placeable.
// * Returns OBJECT_INVALID if the caller is not a valid door or placeable.
object GetLastClosedBy();

// 261: Use this in an OnPerception script to determine whether the object that was
// perceived has vanished.
int GetLastPerceptionVanished();

// 262: Get the first object within oPersistentObject.
// - oPersistentObject
// - nResidentObjectType: OBJECT_TYPE_*
// - nPersistentZone: PERSISTENT_ZONE_ACTIVE. [This could also take the value
//   PERSISTENT_ZONE_FOLLOW, but this is no longer used.]
// * Returns OBJECT_INVALID if no object is found.
object GetFirstInPersistentObject(object oPersistentObject=OBJECT_SELF, int nResidentObjectType=OBJECT_TYPE_CREATURE, int nPersistentZone=PERSISTENT_ZONE_ACTIVE);

// 263: Get the next object within oPersistentObject.
// - oPersistentObject
// - nResidentObjectType: OBJECT_TYPE_*
// - nPersistentZone: PERSISTENT_ZONE_ACTIVE. [This could also take the value
//   PERSISTENT_ZONE_FOLLOW, but this is no longer used.]
// * Returns OBJECT_INVALID if no object is found.
object GetNextInPersistentObject(object oPersistentObject=OBJECT_SELF, int nResidentObjectType=OBJECT_TYPE_CREATURE, int nPersistentZone=PERSISTENT_ZONE_ACTIVE);

// 264: This returns the creator of oAreaOfEffectObject.
// * Returns OBJECT_INVALID if oAreaOfEffectObject is not a valid Area of Effect object.
object GetAreaOfEffectCreator(object oAreaOfEffectObject=OBJECT_SELF);

// 265: Brings up the level up GUI for the player.  The GUI will only show up
//      if the player has gained enough experience points to level up.
// * Returns TRUE if the GUI was successfully brought up; FALSE if not.
int ShowLevelUpGUI();

// 266: Flag the specified item as being non-equippable or not.  Set bNonEquippable
//      to TRUE to prevent this item from being equipped, and FALSE to allow
//      the normal equipping checks to determine if the item can be equipped.
// NOTE: This will do nothing if the object passed in is not an item.  Items that
//       are already equipped when this is called will not automatically be
//       unequipped.  These items will just be prevented from being re-equipped
//       should they be unequipped.
void SetItemNonEquippable( object oItem, int bNonEquippable );

// 267: GetButtonMashCheck
// This function returns whether the button mash check, used for the combat tutorial, is on
int GetButtonMashCheck();

// 268: SetButtonMashCheck
// This function sets the button mash check variable, and is used for turning the check on and off
void SetButtonMashCheck(int nCheck);

// 269: EffectForcePushTargeted
// This effect is exactly the same as force push, except it takes a location parameter that specifies
// where the location of the force push is to be done from.  All orientations are also based on this location.
// AMF:  The new ignore test direct line variable should be used with extreme caution
// It overrides geometry checks for force pushes, so that the object that the effect is applied to
// is guaranteed to move that far, ignoring collisions.  It is best used for cutscenes.
effect EffectForcePushTargeted(location lCentre, int nIgnoreTestDirectLine = 0);

// 270: Create a Haste effect.
effect EffectHaste();

// 271: Give oItem to oGiveTo (instant; for similar Action use ActionGiveItem)
// If oItem is not a valid item, or oGiveTo is not a valid object, nothing will
// happen.
void GiveItem(object oItem, object oGiveTo);

// 272: Convert oObject into a hexadecimal string.
string ObjectToString(object oObject);

// 273: Create an Immunity effect.
// - nImmunityType: IMMUNITY_TYPE_*
effect EffectImmunity(int nImmunityType);

// 274: - oCreature
// - nImmunityType: IMMUNITY_TYPE_*
// - oVersus: if this is specified, then we also check for the race and
//   alignment of oVersus
// * Returns TRUE if oCreature has immunity of type nImmunity versus oVersus.
int GetIsImmune(object oCreature, int nImmunityType, object oVersus=OBJECT_INVALID);

// 275: Creates a Damage Immunity Increase effect.
// - nDamageType: DAMAGE_TYPE_*
// - nPercentImmunity
effect EffectDamageImmunityIncrease(int nDamageType, int nPercentImmunity);

// 276: Determine whether oEncounter is active.
int  GetEncounterActive(object oEncounter=OBJECT_SELF);

// 277: Set oEncounter's active state to nNewValue.
// - nNewValue: TRUE/FALSE
// - oEncounter
void SetEncounterActive(int nNewValue, object oEncounter=OBJECT_SELF);

// 278: Get the maximum number of times that oEncounter will spawn.
int GetEncounterSpawnsMax(object oEncounter=OBJECT_SELF);

// 279: Set the maximum number of times that oEncounter can spawn
void SetEncounterSpawnsMax(int nNewValue, object oEncounter=OBJECT_SELF);

// 280: Get the number of times that oEncounter has spawned so far
int  GetEncounterSpawnsCurrent(object oEncounter=OBJECT_SELF);

// 281: Set the number of times that oEncounter has spawned so far
void SetEncounterSpawnsCurrent(int nNewValue, object oEncounter=OBJECT_SELF);

// 282: Use this in an OnItemAcquired script to get the item that was acquired.
// * Returns OBJECT_INVALID if the module is not valid.
object GetModuleItemAcquired();

// 283: Use this in an OnItemAcquired script to get the creatre that previously
// possessed the item.
// * Returns OBJECT_INVALID if the item was picked up from the ground.
object GetModuleItemAcquiredFrom();

// 284: Set the value for a custom token.
void SetCustomToken(int nCustomTokenNumber, string sTokenValue);

// 285: Determine whether oCreature has nFeat, and nFeat is useable.
// PLEASE NOTE!!! - This function will return FALSE if the target
// is not currently able to use the feat due to daily limits or
// other restrictions. Use GetFeatAcquired() if you just want to
// know if they've got it or not.
// - nFeat: FEAT_*
// - oCreature
int GetHasFeat(int nFeat, object oCreature=OBJECT_SELF);

// 286: Determine whether oCreature has nSkill, and nSkill is useable.
// - nSkill: SKILL_*
// - oCreature
int GetHasSkill(int nSkill, object oCreature=OBJECT_SELF);

// 287: Use nFeat on oTarget.
// - nFeat: FEAT_*
// - oTarget
void ActionUseFeat(int nFeat, object oTarget);

// 288: Runs the action "UseSkill" on the current creature
// Use nSkill on oTarget.
// - nSkill: SKILL_*
// - oTarget
// - nSubSkill: SUBSKILL_*
// - oItemUsed: Item to use in conjunction with the skill
void ActionUseSkill(int nSkill, object oTarget, int nSubSkill=0, object oItemUsed=OBJECT_INVALID );

// 289: Determine whether oSource sees oTarget.
int GetObjectSeen(object oTarget, object oSource=OBJECT_SELF);

// 290: Determine whether oSource hears oTarget.
int GetObjectHeard(object oTarget, object oSource=OBJECT_SELF);

// 291: Use this in an OnPlayerDeath module script to get the last player that died.
object GetLastPlayerDied();

// 292: Use this in an OnItemLost script to get the item that was lost/dropped.
// * Returns OBJECT_INVALID if the module is not valid.
object GetModuleItemLost();

// 293: Use this in an OnItemLost script to get the creature that lost the item.
// * Returns OBJECT_INVALID if the module is not valid.
object GetModuleItemLostBy();

// 294: Do aActionToDo.
void ActionDoCommand(action aActionToDo);

// 295: Conversation event.
event EventConversation();

// 296: Set the difficulty level of oEncounter.
// - nEncounterDifficulty: ENCOUNTER_DIFFICULTY_*
// - oEncounter
void SetEncounterDifficulty(int nEncounterDifficulty, object oEncounter=OBJECT_SELF);

// 297: Get the difficulty level of oEncounter.
int GetEncounterDifficulty(object oEncounter=OBJECT_SELF);

// 298: Get the distance between lLocationA and lLocationB.
float GetDistanceBetweenLocations(location lLocationA, location lLocationB);

// 299: Use this in spell scripts to get nDamage adjusted by oTarget's reflex and
// evasion saves.
// - nDamage
// - oTarget
// - nDC: Difficulty check
// - nSaveType: SAVING_THROW_TYPE_*
// - oSaveVersus
int GetReflexAdjustedDamage(int nDamage, object oTarget, int nDC, int nSaveType=SAVING_THROW_TYPE_NONE, object oSaveVersus=OBJECT_SELF);

// 300: Play nAnimation immediately.
// - nAnimation: ANIMATION_*
// - fSpeed
// - fSeconds: Duration of the animation (this is not used for Fire and
//   Forget animations) If a time of -1.0f is specified for a looping animation
//   it will loop until the next animation is applied.
void PlayAnimation(int nAnimation, float fSpeed=1.0, float fSeconds=0.0);

// 301: Create a Spell Talent.
// - nSpell: SPELL_*
talent TalentSpell(int nSpell);

// 302: Create a Feat Talent.
// - nFeat: FEAT_*
talent TalentFeat(int nFeat);

// 303: Create a Skill Talent.
// - nSkill: SKILL_*
talent TalentSkill(int nSkill);

// 304: Determine if oObject has effects originating from nSpell.
// - nSpell: SPELL_*
// - oObject
int GetHasSpellEffect(int nSpell, object oObject=OBJECT_SELF);

// 305: Get the spell (SPELL_*) that applied eSpellEffect.
// * Returns -1 if eSpellEffect was applied outside a spell script.
int GetEffectSpellId(effect eSpellEffect);

// 306: Determine whether oCreature has tTalent.
int GetCreatureHasTalent(talent tTalent, object oCreature=OBJECT_SELF);

// 307: Get a random talent of oCreature, within nCategory.
// - nCategory: TALENT_CATEGORY_*
// - oCreature
// - nInclusion: types of talent to include
talent GetCreatureTalentRandom(int nCategory, object oCreature=OBJECT_SELF, int nInclusion=0);

// 308: Get the best talent (i.e. closest to nCRMax without going over) of oCreature,
// within nCategory.
// - nCategory: TALENT_CATEGORY_*
// - nCRMax: Challenge Rating of the talent
// - oCreature
// - nInclusion: types of talent to include
// - nExcludeType: TALENT_TYPE_FEAT or TALENT_TYPE_FORCE, type of talent that we wish to ignore
// - nExcludeId: Talent ID of the talent we wish to ignore.
//   A value of TALENT_EXCLUDE_ALL_OF_TYPE for this parameter will mean that all talents of
//   type nExcludeType are ignored.
talent GetCreatureTalentBest(int nCategory, int nCRMax, object oCreature=OBJECT_SELF, int nInclusion=0, int nExcludeType = -1, int nExcludeId = -1);

// 309: Use tChosenTalent on oTarget.
void ActionUseTalentOnObject(talent tChosenTalent, object oTarget);

// 310: Use tChosenTalent at lTargetLocation.
void ActionUseTalentAtLocation(talent tChosenTalent, location lTargetLocation);

// 311: Get the gold piece value of oItem.
// * Returns 0 if oItem is not a valid item.
int GetGoldPieceValue(object oItem);

// 312: * Returns TRUE if oCreature is of a playable racial type.
int GetIsPlayableRacialType(object oCreature);

// 313: Jump to lDestination.  The action is added to the TOP of the action queue.
void JumpToLocation(location lDestination);

// 314: Create a Temporary Hitpoints effect.
// - nHitPoints: a positive integer
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nHitPoints < 0.
effect EffectTemporaryHitpoints(int nHitPoints);

// 315: Get the number of ranks that oTarget has in nSkill.
// - nSkill: SKILL_*
// - oTarget
// * Returns -1 if oTarget doesn't have nSkill.
// * Returns 0 if nSkill is untrained.
int GetSkillRank(int nSkill, object oTarget=OBJECT_SELF);

// 316: Get the attack target of oCreature.
// This only works when oCreature is in combat.
object GetAttackTarget(object oCreature=OBJECT_SELF);

// 317: Get the attack type (SPECIAL_ATTACK_*) of oCreature's last attack.
// This only works when oCreature is in combat.
int GetLastAttackType(object oCreature=OBJECT_SELF);

// 318: Get the attack mode (COMBAT_MODE_*) of oCreature's last attack.
// This only works when oCreature is in combat.
int GetLastAttackMode(object oCreature=OBJECT_SELF);

// 319: Get the distance in metres between oObjectA and oObjectB in 2D.
// * Return value if either object is invalid: 0.0f
float GetDistanceBetween2D(object oObjectA, object oObjectB);

// 320: * Returns TRUE if oCreature is in combat.
//RWT-OEI 09/30/04 - If you pass TRUE in as the second parameter then
//this function will only return true if the character is in REAL combat.
//If you don't know what that means, don't pass in TRUE.
int GetIsInCombat(object oCreature=OBJECT_SELF, int bOnlyCountReal = FALSE);

// 321: Get the last command (ASSOCIATE_COMMAND_*) issued to oAssociate.
int GetLastAssociateCommand(object oAssociate=OBJECT_SELF);

// 322: Give nGP gold to oCreature.
void GiveGoldToCreature(object oCreature, int nGP);

// 323: Set the destroyable status of the caller.
// - bDestroyable: If this is FALSE, the caller does not fade out on death, but
//   sticks around as a corpse.
// - bRaiseable: If this is TRUE, the caller can be raised via resurrection.
// - bSelectableWhenDead: If this is TRUE, the caller is selectable after death.
void SetIsDestroyable(int bDestroyable, int bRaiseable=TRUE, int bSelectableWhenDead=FALSE);

// 324: Set the locked state of oTarget, which can be a door or a placeable object.
void SetLocked(object oTarget, int bLocked);

// 325: Get the locked state of oTarget, which can be a door or a placeable object.
int GetLocked(object oTarget);

// 326: Use this in a trigger's OnClick event script to get the object that last
// clicked on it.
// This is identical to GetEnteringObject.
object GetClickingObject();

// 327: Initialise oTarget to listen for the standard Associates commands.
void SetAssociateListenPatterns(object oTarget=OBJECT_SELF);

// 328: Get the last weapon that oCreature used in an attack.
// * Returns OBJECT_INVALID if oCreature did not attack, or has no weapon equipped.
object GetLastWeaponUsed(object oCreature);

// 329: Use oPlaceable.
void ActionInteractObject(object oPlaceable);

// 330: Get the last object that used the placeable object that is calling this function.
// * Returns OBJECT_INVALID if it is called by something other than a placeable or
//   a door.
object GetLastUsedBy();

// 331: Returns the ability modifier for the specified ability
// Get oCreature's ability modifier for nAbility.
// - nAbility: ABILITY_*
// - oCreature
int GetAbilityModifier(int nAbility, object oCreature=OBJECT_SELF);

// 332: Determined whether oItem has been identified.
int GetIdentified(object oItem);

// 333: Set whether oItem has been identified.
void SetIdentified(object oItem, int bIdentified);

// 334: Get the distance between lLocationA and lLocationB. in 2D
float GetDistanceBetweenLocations2D(location lLocationA, location lLocationB);

// 335: Get the distance from the caller to oObject in metres.
// * Return value on error: -1.0f
float GetDistanceToObject2D(object oObject);

// 336: Get the last blocking door encountered by the caller of this function.
// * Returns OBJECT_INVALID if the caller is not a valid creature.
object GetBlockingDoor();

// 337: - oTargetDoor
// - nDoorAction: DOOR_ACTION_*
// * Returns TRUE if nDoorAction can be performed on oTargetDoor.
int GetIsDoorActionPossible(object oTargetDoor, int nDoorAction);

// 338: Perform nDoorAction on oTargetDoor.
void DoDoorAction(object oTargetDoor, int nDoorAction);

// 339: Get the first item in oTarget's inventory (start to cycle through oTarget's
// inventory).
// * Returns OBJECT_INVALID if the caller is not a creature, item, placeable or store,
//   or if no item is found.
object GetFirstItemInInventory(object oTarget=OBJECT_SELF);

// 340: Get the next item in oTarget's inventory (continue to cycle through oTarget's
// inventory).
// * Returns OBJECT_INVALID if the caller is not a creature, item, placeable or store,
//   or if no item is found.
object GetNextItemInInventory(object oTarget=OBJECT_SELF);

// 341: A creature can have up to three classes.  This function determines the
// creature's class (CLASS_TYPE_*) based on nClassPosition.
// - nClassPosition: 1, 2 or 3
// - oCreature
// * Returns CLASS_TYPE_INVALID if the oCreature does not have a class in
//   nClassPosition (i.e. a single-class creature will only have a value in
//   nClassLocation=1) or if oCreature is not a valid creature.
int GetClassByPosition(int nClassPosition, object oCreature=OBJECT_SELF);

// 342: A creature can have up to three classes.  This function determines the
// creature's class level based on nClass Position.
// - nClassPosition: 1, 2 or 3
// - oCreature
// * Returns 0 if oCreature does not have a class in nClassPosition
//   (i.e. a single-class creature will only have a value in nClassLocation=1)
//   or if oCreature is not a valid creature.
int GetLevelByPosition(int nClassPosition, object oCreature=OBJECT_SELF);

// 343: Determine the levels that oCreature holds in nClassType.
// - nClassType: CLASS_TYPE_*
// - oCreature
int GetLevelByClass(int nClassType, object oCreature=OBJECT_SELF);

// 344: Get the amount of damage of type nDamageType that has been dealt to the caller.
// - nDamageType: DAMAGE_TYPE_*
int GetDamageDealtByType(int nDamageType);

// 345: Get the total amount of damage that has been dealt to the caller.
int GetTotalDamageDealt();

// 346: Get the last object that damaged the caller.
// * Returns OBJECT_INVALID if the caller is not a valid object.
object GetLastDamager();

// 347: Get the last object that disarmed the trap on the caller.
// * Returns OBJECT_INVALID if the caller is not a valid placeable, trigger or
//   door.
object GetLastDisarmed();

// 348: Get the last object that disturbed the inventory of the caller.
// * Returns OBJECT_INVALID if the caller is not a valid creature or placeable.
object GetLastDisturbed();

// 349: Get the last object that locked the caller.
// * Returns OBJECT_INVALID if the caller is not a valid door or placeable.
object GetLastLocked();

// 350: Get the last object that unlocked the caller.
// * Returns OBJECT_INVALID if the caller is not a valid door or placeable.
object GetLastUnlocked();

// 351: Create a Skill Increase effect.
// - nSkill: SKILL_*
// - nValue
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.
effect EffectSkillIncrease(int nSkill, int nValue);

// 352: Get the type of disturbance (INVENTORY_DISTURB_*) that caused the caller's
// OnInventoryDisturbed script to fire.  This will only work for creatures and
// placeables.
int GetInventoryDisturbType();

// 353: get the item that caused the caller's OnInventoryDisturbed script to fire.
// * Returns OBJECT_INVALID if the caller is not a valid object.
object GetInventoryDisturbItem();

// 354: Displays the upgrade screen where the player can modify weapons and armor
// If oItem is NOT invalid, then the player will be forced to upgrade oItem and only oItem.
// If oCharacter is NOT invalid, then that character's various skills will be used... *NOT IMPLEMENTED*
// If nDisableItemCreation = TRUE, then the player will not be able to access the item creation screen
// If nDisableUpgrade = TRUE, then the player will be forced straight to item creation and not be able
//      to access Item Upgrading.
void ShowUpgradeScreen(object oItem = OBJECT_INVALID, object oCharacter = OBJECT_INVALID, int nDisableItemCreation = FALSE, int nDisableUpgrade = FALSE, string sOverride2DA = "");

// 355: Set eEffect to be versus a specific alignment.
// - eEffect
// - nLawChaos: ALIGNMENT_LAWFUL/ALIGNMENT_CHAOTIC/ALIGNMENT_ALL
// - nGoodEvil: ALIGNMENT_GOOD/ALIGNMENT_EVIL/ALIGNMENT_ALL
effect VersusAlignmentEffect(effect eEffect, int nLawChaos=ALIGNMENT_ALL, int nGoodEvil=ALIGNMENT_ALL);

// 356: Set eEffect to be versus nRacialType.
// - eEffect
// - nRacialType: RACIAL_TYPE_*
effect VersusRacialTypeEffect(effect eEffect, int nRacialType);

// 357: Set eEffect to be versus traps.
effect VersusTrapEffect(effect eEffect);

// 358: Get the gender of oCreature.
int GetGender(object oCreature);

// 359: * Returns TRUE if tTalent is valid.
int GetIsTalentValid(talent tTalent);

// 360: Causes the action subject to move away from lMoveAwayFrom.
void ActionMoveAwayFromLocation(location lMoveAwayFrom, int bRun=FALSE, float fMoveAwayRange=40.0f);

// 361: Get the target that the caller attempted to attack - this should be used in
// conjunction with GetAttackTarget(). This value is set every time an attack is
// made, and is reset at the end of combat.
// * Returns OBJECT_INVALID if the caller is not a valid creature.
object GetAttemptedAttackTarget();

// 362: Get the type (TALENT_TYPE_*) of tTalent.
int GetTypeFromTalent(talent tTalent);

// 363: Get the ID of tTalent.  This could be a SPELL_*, FEAT_* or SKILL_*.
int GetIdFromTalent(talent tTalent);

// 364: Starts a game of pazaak.
// - nOpponentPazaakDeck: Index into PazaakDecks.2da; specifies which deck the opponent will use.
// - sEndScript: Script to be run when game finishes.
// - nMaxWager: Max player wager.  If <= 0, the player's credits won't be modified by the result of the game and the wager screen will not show up.
// - bShowTutorial: Plays in tutorial mode (nMaxWager should be 0).
void PlayPazaak(int nOpponentPazaakDeck, string sEndScript, int nMaxWager, int bShowTutorial=FALSE, object oOpponent=OBJECT_INVALID);

// 365: Returns result of last Pazaak game.  Should be used only in an EndScript sent to PlayPazaak.
// * Returns 0 if player loses, 1 if player wins.
int GetLastPazaakResult();

// 366:  displays a feed back string for the object spicified and the constant
// repersents the string to be displayed see:FeedBackText.2da
void DisplayFeedBackText(object oCreature, int nTextConstant);

// 367: Add a journal quest entry to the player.
// - szPlotID: the plot identifier used in the toolset's Journal Editor
// - nState: the state of the plot as seen in the toolset's Journal Editor
// - bAllowOverrideHigher: If this is TRUE, you can set the state to a lower
//   number than the one it is currently on
void AddJournalQuestEntry(string szPlotID, int nState, int bAllowOverrideHigher=FALSE);

// 368: Remove a journal quest entry from the player.
// - szPlotID: the plot identifier used in the toolset's Journal Editor
void RemoveJournalQuestEntry(string szPlotID);

// 369: Gets the State value of a journal quest.  Returns 0 if no quest entry has been added for this szPlotID.
// - szPlotID: the plot identifier used in the toolset's Journal Editor
int GetJournalEntry(string szPlotID);

// 370: PlayRumblePattern
// Starts a defined rumble pattern playing
int PlayRumblePattern(int nPattern);

// 371: StopRumblePattern
// Stops a defined rumble pattern
int StopRumblePattern(int nPattern);

// 372: Damages the creatures force points
effect EffectDamageForcePoints(int nDamage);

// 373: Heals the creatures force points
effect EffectHealForcePoints(int nHeal);


// 374: Send a server message (szMessage) to the oPlayer.
void SendMessageToPC(object oPlayer, string szMessage);

// 375: Get the target at which the caller attempted to cast a spell.
// This value is set every time a spell is cast and is reset at the end of
// combat.
// * Returns OBJECT_INVALID if the caller is not a valid creature.
object GetAttemptedSpellTarget();

// 376: Get the last creature that opened the caller.
// * Returns OBJECT_INVALID if the caller is not a valid door or placeable.
object GetLastOpenedBy();

// 377: Determine whether oCreature has nSpell memorised.
// PLEASE NOTE!!! - This function will return FALSE if the target
// is not currently able to use the spell due to lack of sufficient
// Force Points. Use GetSpellAcquired() if you just want to
// know if they've got it or not.
// - nSpell: SPELL_*
// - oCreature
int GetHasSpell(int nSpell, object oCreature=OBJECT_SELF);

// 378: Open oStore for oPC.
void OpenStore(object oStore, object oPC, int nBonusMarkUp=0, int nBonusMarkDown=0);

// 379:
void ActionSurrenderToEnemies();

// 380: Get the first member of oMemberOfFaction's faction (start to cycle through
// oMemberOfFaction's faction).
// * Returns OBJECT_INVALID if oMemberOfFaction's faction is invalid.
object GetFirstFactionMember(object oMemberOfFaction, int bPCOnly=TRUE);

// 381: Get the next member of oMemberOfFaction's faction (continue to cycle through
// oMemberOfFaction's faction).
// * Returns OBJECT_INVALID if oMemberOfFaction's faction is invalid.
object GetNextFactionMember(object oMemberOfFaction, int bPCOnly=TRUE);

// 382: Force the action subject to move to lDestination.
void ActionForceMoveToLocation(location lDestination, int bRun=FALSE, float fTimeout=30.0f);

// 383: Force the action subject to move to oMoveTo.
void ActionForceMoveToObject(object oMoveTo, int bRun=FALSE, float fRange=1.0f, float fTimeout=30.0f);

// 384: Get the experience assigned in the journal editor for szPlotID.
int GetJournalQuestExperience(string szPlotID);

// 385: Jump to oToJumpTo (the action is added to the top of the action queue).
void JumpToObject(object oToJumpTo, int nWalkStraightLineToPoint=1);

// 386: Set whether oMapPin is enabled.
// - oMapPin
// - nEnabled: 0=Off, 1=On
void SetMapPinEnabled(object oMapPin, int nEnabled);

// 387: Create a Hit Point Change When Dying effect.
// - fHitPointChangePerRound: this can be positive or negative, but not zero.
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if fHitPointChangePerRound is 0.
effect EffectHitPointChangeWhenDying(float fHitPointChangePerRound);

// 388: Spawn a GUI panel for the client that controls oPC.
// - oPC
// - nGUIPanel: GUI_PANEL_*
// * Nothing happens if oPC is not a player character or if an invalid value is
//   used for nGUIPanel.
void PopUpGUIPanel(object oPC, int nGUIPanel);

// 389: This allows you to add a new class to any creature object
void AddMultiClass(int nClassType, object oSource);

// 390: Tests a linked effect to see if the target is immune to it.
// If the target is imune to any of the linked effect then he is immune to all of it
int GetIsLinkImmune(object oTarget, effect eEffect );

// 391: Stunn the droid
effect EffectDroidStun( );

// 392: Force push the creature...
effect EffectForcePushed();

// 393: Gives nXpAmount to oCreature.
void GiveXPToCreature(object oCreature, int nXpAmount);

// 394: Sets oCreature's experience to nXpAmount.
void SetXP(object oCreature, int nXpAmount);

// 395: Get oCreature's experience.
int GetXP(object oCreature);

// 396: Convert nInteger to hex, returning the hex value as a string.
// * Return value has the format "0x????????" where each ? will be a hex digit
//   (8 digits in total).
string IntToHexString(int nInteger);

// 397: Get the base item type (BASE_ITEM_*) of oItem.
// * Returns BASE_ITEM_INVALID if oItem is an invalid item.
int GetBaseItemType(object oItem);

// 398: Determines whether oItem has nProperty.
// - oItem
// - nProperty: ITEM_PROPERTY_*
// * Returns FALSE if oItem is not a valid item, or if oItem does not have
//   nProperty.
int GetItemHasItemProperty(object oItem, int nProperty);

// 399: The creature will equip the melee weapon in its possession that can do the
// most damage. If no valid melee weapon is found, it will equip the most
// damaging range weapon. This function should only ever be called in the
// EndOfCombatRound scripts, because otherwise it would have to stop the combat
// round to run simulation.
// - oVersus: You can try to get the most damaging weapon against oVersus
// - bOffHand
void ActionEquipMostDamagingMelee(object oVersus=OBJECT_INVALID, int bOffHand=FALSE);

// 400: The creature will equip the range weapon in its possession that can do the
// most damage.
// If no valid range weapon can be found, it will equip the most damaging melee
// weapon.
// - oVersus: You can try to get the most damaging weapon against oVersus
void ActionEquipMostDamagingRanged(object oVersus=OBJECT_INVALID);

// 401: Get the Armour Class of oItem.
// * Return 0 if the oItem is not a valid item, or if oItem has no armour value.
int GetItemACValue(object oItem);

// 402:
// Effect that will play an animation and display a visual effect to indicate the
// target has resisted a force power.
effect EffectForceResisted( object oSource );

// 403: Expose the entire map of oArea to oPlayer.
void ExploreAreaForPlayer(object oArea, object oPlayer);

// 404: The creature will equip the armour in its possession that has the highest
// armour class.
void ActionEquipMostEffectiveArmor();

// 405: * Returns TRUE if it is currently day.
int GetIsDay();

// 406: * Returns TRUE if it is currently night.
int GetIsNight();

// 407: * Returns TRUE if it is currently dawn.
int GetIsDawn();

// 408: * Returns TRUE if it is currently dusk.
int GetIsDusk();

// 409: * Returns TRUE if oCreature was spawned from an encounter.
int GetIsEncounterCreature(object oCreature=OBJECT_SELF);

// 410: Use this in an OnPlayerDying module script to get the last player who is dying.
object GetLastPlayerDying();

// 411: Get the starting location of the module.
location GetStartingLocation();

// 412: Make oCreatureToChange join one of the standard factions.
// ** This will only work on an NPC **
// - nStandardFaction: STANDARD_FACTION_*
void ChangeToStandardFaction(object oCreatureToChange, int nStandardFaction);

// 413: Play oSound.
void SoundObjectPlay(object oSound);

// 414: Stop playing oSound.
void SoundObjectStop(object oSound);

// 415: Set the volume of oSound.
// - oSound
// - nVolume: 0-127
void SoundObjectSetVolume(object oSound, int nVolume);

// 416: Set the position of oSound.
void SoundObjectSetPosition(object oSound, vector vPosition);

// 417: Immediately speak a conversation one-liner.
// - sDialogResRef
// - oTokenTarget: This must be specified if there are creature-specific tokens
//   in the string.
void SpeakOneLinerConversation(string sDialogResRef="", object oTokenTarget=OBJECT_TYPE_INVALID);

// 418: Get the amount of gold possessed by oTarget.
int GetGold(object oTarget=OBJECT_SELF);

// 419: Use this in an OnRespawnButtonPressed module script to get the object id of
// the player who last pressed the respawn button.
object GetLastRespawnButtonPresser();

// 420:
// Effect that will display a visual effect on the specified object's hand to
// indicate a force power has fizzled out.
effect EffectForceFizzle();

// 421: SetLightsaberPowered
// Allows a script to set the state of the lightsaber.  This will override any
// game determined lightsaber powerstates.
void SetLightsaberPowered( object oCreature, int bOverride, int bPowered = TRUE, int bShowTransition = FALSE);

// 422: * Returns TRUE if the weapon equipped is capable of damaging oVersus.
int GetIsWeaponEffective(object oVersus=OBJECT_INVALID, int bOffHand=FALSE);

// 423: Use this in a SpellCast script to determine whether the spell was considered
// harmful.
// * Returns TRUE if the last spell cast was harmful.
int GetLastSpellHarmful();

// 424: Activate oItem.
event EventActivateItem(object oItem, location lTarget, object oTarget=OBJECT_INVALID);

// 425: Play the background music for oArea.
void MusicBackgroundPlay(object oArea);

// 426: Stop the background music for oArea.
void MusicBackgroundStop(object oArea);

// 427: Set the delay for the background music for oArea.
// - oArea
// - nDelay: delay in milliseconds
void MusicBackgroundSetDelay(object oArea, int nDelay);

// 428: Change the background day track for oArea to nTrack.
// - oArea
// - nTrack
void MusicBackgroundChangeDay(object oArea, int nTrack, int nStreamingMusic = FALSE);

// 429: Change the background night track for oArea to nTrack.
// - oArea
// - nTrack
void MusicBackgroundChangeNight(object oArea, int nTrack, int nStreamingMusic = FALSE);

// 430: Play the battle music for oArea.
void MusicBattlePlay(object oArea);

// 431: Stop the battle music for oArea.
void MusicBattleStop(object oArea);

// 432: Change the battle track for oArea.
// - oArea
// - nTrack
void MusicBattleChange(object oArea, int nTrack);

// 433: Play the ambient sound for oArea.
void AmbientSoundPlay(object oArea);

// 434: Stop the ambient sound for oArea.
void AmbientSoundStop(object oArea);

// 435: Change the ambient day track for oArea to nTrack.
// - oArea
// - nTrack
void AmbientSoundChangeDay(object oArea, int nTrack);

// 436: Change the ambient night track for oArea to nTrack.
// - oArea
// - nTrack
void AmbientSoundChangeNight(object oArea, int nTrack);

// 437: Get the object that killed the caller.
object GetLastKiller();

// 438: Use this in a spell script to get the item used to cast the spell.
object GetSpellCastItem();

// 439: Use this in an OnItemActivated module script to get the item that was activated.
object GetItemActivated();

// 440: Use this in an OnItemActivated module script to get the creature that
// activated the item.
object GetItemActivator();

// 441: Use this in an OnItemActivated module script to get the location of the item's
// target.
location GetItemActivatedTargetLocation();

// 442: Use this in an OnItemActivated module script to get the item's target.
object GetItemActivatedTarget();

// 443: * Returns TRUE if oObject (which is a placeable or a door) is currently open.
int GetIsOpen(object oObject);

// 444: Take nAmount of gold from oCreatureToTakeFrom.
// - nAmount
// - oCreatureToTakeFrom: If this is not a valid creature, nothing will happen.
// - bDestroy: If this is TRUE, the caller will not get the gold.  Instead, the
//   gold will be destroyed and will vanish from the game.
void TakeGoldFromCreature(int nAmount, object oCreatureToTakeFrom, int bDestroy=FALSE);

// 445: Determine whether oObject is in conversation.
int GetIsInConversation(object oObject);

// 446: Create an Ability Decrease effect.
// - nAbility: ABILITY_*
// - nModifyBy: This is the amount by which to decrement the ability
effect EffectAbilityDecrease(int nAbility, int nModifyBy);

// 447: Create an Attack Decrease effect.
// - nPenalty
// - nModifierType: ATTACK_BONUS_*
effect EffectAttackDecrease(int nPenalty, int nModifierType=ATTACK_BONUS_MISC);

// 448: Create a Damage Decrease effect.
// - nPenalty
// - nDamageType: DAMAGE_TYPE_*
effect EffectDamageDecrease(int nPenalty, int nDamageType=DAMAGE_TYPE_UNIVERSAL);

// 449: Create a Damage Immunity Decrease effect.
// - nDamageType: DAMAGE_TYPE_*
// - nPercentImmunity
effect EffectDamageImmunityDecrease(int nDamageType, int nPercentImmunity);

// 450: Create an AC Decrease effect.
// - nValue
// - nModifyType: AC_*
// - nDamageType: DAMAGE_TYPE_*
//   * Default value for nDamageType should only ever be used in this function prototype.
effect EffectACDecrease(int nValue, int nModifyType=AC_DODGE_BONUS, int nDamageType=AC_VS_DAMAGE_TYPE_ALL);

// 451: Create a Movement Speed Decrease effect.
// - nPercentChange: This is expected to be a positive integer between 1 and 99 inclusive.
//   If a negative integer is supplied then a movement speed increase will result,
//   and if a number >= 100 is supplied then the effect is deleted.
effect EffectMovementSpeedDecrease(int nPercentChange);

// 452: Create a Saving Throw Decrease effect.
// - nSave
// - nValue
// - nSaveType: SAVING_THROW_TYPE_*
effect EffectSavingThrowDecrease(int nSave, int nValue, int nSaveType=SAVING_THROW_TYPE_ALL);

// 453: Create a Skill Decrease effect.
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.
effect EffectSkillDecrease(int nSkill, int nValue);

// 454: Create a Force Resistance Decrease effect.
effect EffectForceResistanceDecrease(int nValue);

// 455: Determine whether oTarget is a plot object.
int GetPlotFlag(object oTarget=OBJECT_SELF);

// 456: Set oTarget's plot object status.
void SetPlotFlag(object oTarget, int nPlotFlag);

// 457: Create an Invisibility effect.
// - nInvisibilityType: INVISIBILITY_TYPE_*
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nInvisibilityType
//   is invalid.
effect EffectInvisibility(int nInvisibilityType);

// 458: Create a Concealment effect.
// - nPercentage: 1-100 inclusive
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or
//   nPercentage > 100.
effect EffectConcealment(int nPercentage);

// 459: Create a Force Shield that has parameters from the guven index into the forceshields.2da
effect EffectForceShield(int nShield);

// 460: Create a Dispel Magic All effect.
effect EffectDispelMagicAll(int nCasterLevel);

// 461: Cut immediately to placeable camera 'nCameraId' during dialog.  nCameraId must be
//      an existing Placeable Camera ID.  Function only works during Dialog.
void SetDialogPlaceableCamera( int nCameraId );


// 462:
// Returns: TRUE if the player is in 'solo mode' (ie. the party is not supposed to follow the player).
//          FALSE otherwise.
int GetSoloMode();

// 463: Create a Disguise effect.
// - * nDisguiseAppearance: DISGUISE_TYPE_*s
effect EffectDisguise(int nDisguiseAppearance);

// 464:
// Returns the maximum amount of stealth xp available in the area.
int GetMaxStealthXP();

// 465: Create a True Seeing effect.
effect EffectTrueSeeing();

// 466: Create a See Invisible effect.
effect EffectSeeInvisible();

// 467: Create a Time Stop effect.
effect EffectTimeStop();

// 468:
// Set the maximum amount of stealth xp available in the area.
void SetMaxStealthXP( int nMax );

// 469: Increase the blaster deflection rate, i think...
effect EffectBlasterDeflectionIncrease(int nChange);

// 470:decrease the blaster deflection rate
effect EffectBlasterDeflectionDecrease(int nChange);

// 471: Make the creature horified. BOO!
effect EffectHorrified( );

// 472: Create a Spell Level Absorption effect.
// - nMaxSpellLevelAbsorbed: maximum spell level that will be absorbed by the
//   effect
// - nTotalSpellLevelsAbsorbed: maximum number of spell levels that will be
//   absorbed by the effect
// - nSpellSchool: SPELL_SCHOOL_*
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if:
//   nMaxSpellLevelAbsorbed is not between -1 and 9 inclusive, or nSpellSchool
//   is invalid.
effect EffectSpellLevelAbsorption(int nMaxSpellLevelAbsorbed, int nTotalSpellLevelsAbsorbed=0, int nSpellSchool=0 );

// 473: Create a Dispel Magic Best effect.
effect EffectDispelMagicBest(int nCasterLevel);

// 474:
// Returns the current amount of stealth xp available in the area.
int GetCurrentStealthXP();

// 475: Get the number of stacked items that oItem comprises.
int GetNumStackedItems(object oItem);

// 476: Use this on an NPC to cause all creatures within a 10-metre radius to stop
// what they are doing and sets the NPC's enemies within this range to be
// neutral towards the NPC. If this command is run on a PC or an object that is
// not a creature, nothing will happen.
void SurrenderToEnemies();

// 477: Create a Miss Chance effect.
// - nPercentage: 1-100 inclusive
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or
//   nPercentage > 100.
effect EffectMissChance(int nPercentage);

// 478:
// Set the current amount of stealth xp available in the area.
void SetCurrentStealthXP( int nCurrent );

// 479: Get the size (CREATURE_SIZE_*) of oCreature.
int GetCreatureSize(object oCreature);

// 480:
// Award the stealth xp to the given oTarget.  This will only work on creatures.
void AwardStealthXP( object oTarget );

// 481:
// Returns whether or not the stealth xp bonus is enabled (ie. whether or not
// AwardStealthXP() will actually award any available stealth xp).
int GetStealthXPEnabled();

// 482:
// Sets whether or not the stealth xp bonus is enabled (ie. whether or not
// AwardStealthXP() will actually award any available stealth xp).
void SetStealthXPEnabled( int bEnabled );

// 483: The action subject will unlock oTarget, which can be a door or a placeable
// object.
void ActionUnlockObject(object oTarget);

// 484: The action subject will lock oTarget, which can be a door or a placeable
// object.
void ActionLockObject(object oTarget);

// 485: Create a Modify Attacks effect to add attacks.
// - nAttacks: maximum is 5, even with the effect stacked
// * Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nAttacks > 5.
effect EffectModifyAttacks(int nAttacks);

// 486: Get the last trap detected by oTarget.
// * Return value on error: OBJECT_INVALID
object GetLastTrapDetected(object oTarget=OBJECT_SELF);

// 487: Create a Damage Shield effect which does (nDamageAmount + nRandomAmount)
// damage to any melee attacker on a successful attack of damage type nDamageType.
// - nDamageAmount: an integer value
// - nRandomAmount: DAMAGE_BONUS_*
// - nDamageType: DAMAGE_TYPE_*
effect EffectDamageShield(int nDamageAmount, int nRandomAmount, int nDamageType);

// 488: Get the trap nearest to oTarget.
// Note : "trap objects" are actually any trigger, placeable or door that is
// trapped in oTarget's area.
// - oTarget
// - nTrapDetected: if this is TRUE, the trap returned has to have been detected
//   by oTarget.
object GetNearestTrapToObject(object oTarget=OBJECT_SELF, int nTrapDetected=TRUE);

// 489: the will get the last attmpted movment target
object GetAttemptedMovementTarget();


// 490: this function returns the bloking creature for the k_def_CBTBlk01 script
object GetBlockingCreature(object oTarget=OBJECT_SELF);

// 491: Get oTarget's base fortitude saving throw value (this will only work for
// creatures, doors, and placeables).
// * Returns 0 if oTarget is invalid.
int GetFortitudeSavingThrow(object oTarget);

// 492: Get oTarget's base will saving throw value (this will only work for creatures,
// doors, and placeables).
// * Returns 0 if oTarget is invalid.
int GetWillSavingThrow(object oTarget);

// 493: Get oTarget's base reflex saving throw value (this will only work for
// creatures, doors, and placeables).
// * Returns 0 if oTarget is invalid.
int GetReflexSavingThrow(object oTarget);

// 494: Get oCreature's challenge rating.
// * Returns 0.0 if oCreature is invalid.
float GetChallengeRating(object oCreature);

// 495: Returns the found enemy creature on a pathfind.
object GetFoundEnemyCreature(object oTarget=OBJECT_SELF);

// 496: Get oCreature's movement rate.
// * Returns 0 if oCreature is invalid.
int GetMovementRate(object oCreature);

// 497: GetSubRace of oCreature
// Returns SUBRACE_*
int GetSubRace(object oCreature);

// 498:
// Returns the amount the stealth xp bonus gets decreased each time the player is detected.
int GetStealthXPDecrement();

// 499:
// Sets the amount the stealth xp bonus gets decreased each time the player is detected.
void SetStealthXPDecrement( int nDecrement );

// 500:
void DuplicateHeadAppearance(object oidCreatureToChange, object oidCreatureToMatch);

// 501: The action subject will fake casting a spell at oTarget; the conjure and cast
// animations and visuals will occur, nothing else.
// - nSpell
// - oTarget
// - nProjectilePathType: PROJECTILE_PATH_TYPE_*
void ActionCastFakeSpellAtObject(int nSpell, object oTarget, int nProjectilePathType=PROJECTILE_PATH_TYPE_DEFAULT);

// 502: The action subject will fake casting a spell at lLocation; the conjure and
// cast animations and visuals will occur, nothing else.
// - nSpell
// - lTarget
// - nProjectilePathType: PROJECTILE_PATH_TYPE_*
void ActionCastFakeSpellAtLocation(int nSpell, location lTarget, int nProjectilePathType=PROJECTILE_PATH_TYPE_DEFAULT);

// 503: CutsceneAttack
// This function allows the designer to specify exactly what's going to happen in a combat round
// There are no guarentees made that the animation specified here will be correct - only that it will be played,
// so it is up to the designer to ensure that they have selected the right animation
// It relies upon constants specified above for the attack result
void CutsceneAttack(object oTarget, int nAnimation, int nAttackResult, int nDamage);

// 504: Set the camera mode for oPlayer.
// - oPlayer
// - nCameraMode: CAMERA_MODE_*
// * If oPlayer is not player-controlled or nCameraMode is invalid, nothing
//   happens.
void SetCameraMode(object oPlayer, int nCameraMode);

// 505: SetLockOrientationInDialog
// Allows the locking and unlocking of orientation changes for an object in dialog
// - oObject - Object
// - nValue - TRUE or FALSE
void SetLockOrientationInDialog(object oObject, int nValue);

// 506: SetLockHeadFollowInDialog
// Allows the locking and undlocking of head following for an object in dialog
// - oObject - Object
// - nValue - TRUE or FALSE
void SetLockHeadFollowInDialog(object oObject, int nValue);

// 507: CutsceneMoveToPoint
// Used by the cutscene system to allow designers to script combat
void CutsceneMove(object oObject, vector vPosition, int nRun);

// 508: EnableVideoEffect
// Enables the video frame buffer effect specified by nEffectType, which is
// an index into VideoEffects.2da. This video effect will apply indefinitely,
// and so it should *always* be cleared by a call to DisableVideoEffect().
void EnableVideoEffect(int nEffectType);

// 509: Shut down the currently loaded module and start a new one (moving all
// currently-connected players to the starting point.
void StartNewModule(string sModuleName, string sWayPoint="", string sMovie1="", string sMovie2="", string sMovie3="", string sMovie4="", string sMovie5="", string sMovie6="");

// 510: DisableVideoEffect
// Disables any video frame buffer effect that may be running. See
// EnableVideoEffect() to see how to use them.
void DisableVideoEffect();

// 511: * Returns TRUE if oItem is a ranged weapon.
int GetWeaponRanged(object oItem);

// 512: Only if we are in a single player game, AutoSave the game.
void DoSinglePlayerAutoSave();

// 513: Get the game difficulty (GAME_DIFFICULTY_*).
int GetGameDifficulty();

// 514:
// This will test the combat action queu to see if the user has placed any actions on the queue.
// will only work during combat.
int GetUserActionsPending();

// 515: RevealMap
// Reveals the map at the given WORLD point 'vPoint' with a MAP Grid Radius 'nRadius'
// If this function is called with no parameters it will reveal the entire map.
// (NOTE: if this function is called with a valid point but a default radius, ie. 'nRadius' of -1
//        then the entire map will be revealed)
void RevealMap(vector vPoint=[0.0,0.0,0.0],int nRadius=-1);

// 516: SetTutorialWindowsEnabled
// Sets whether or not the tutorial windows are enabled (ie. whether or not they will
// appear when certain things happen for the first time).
void SetTutorialWindowsEnabled( int bEnabled );

// 517: ShowTutorialWindow
// nWindow - A row index from Tutorial.2DA specifying the message to display.
// Pops up the specified tutorial window.  If the tutorial window has already popped
// up once before, this will do nothing.
void ShowTutorialWindow( int nWindow );

// 518: StartCreditSequence
// Starts the credits sequence.  If bTransparentBackground is TRUE, the credits will be displayed
// with a transparent background, allowing whatever is currently onscreen to show through.  If it
// is set to FALSE, the credits will be displayed on a black background.
void StartCreditSequence( int bTransparentBackground );

// 519: IsCreditSequenceInProgress
// Returns TRUE if the credits sequence is currently in progress, FALSE otherwise.
int IsCreditSequenceInProgress();

// 520: Sets the minigame lateral acceleration/sec value
void SWMG_SetLateralAccelerationPerSecond(float fLAPS);

// 521: Returns the minigame lateral acceleration/sec value
float SWMG_GetLateralAccelerationPerSecond();

// 522: Get the current action (ACTION_*) that oObject is executing.
int GetCurrentAction(object oObject=OBJECT_SELF);

// 523:
float GetDifficultyModifier();

// 524: Returns the appearance type of oCreature (0 if creature doesn't exist)
// - oCreature
int GetAppearanceType(object oCreature);

// 525: Display floaty text above the specified creature.
// The text will also appear in the chat buffer of each player that receives the
// floaty text.
// - nStrRefToDisplay: String ref (therefore text is translated)
// - oCreatureToFloatAbove
// - bBroadcastToFaction: If this is TRUE then only creatures in the same faction
//   as oCreatureToFloatAbove
//   will see the floaty text, and only if they are within range (30 metres).
void FloatingTextStrRefOnCreature(int nStrRefToDisplay, object oCreatureToFloatAbove, int bBroadcastToFaction=TRUE);

// 526: Display floaty text above the specified creature.
// The text will also appear in the chat buffer of each player that receives the
// floaty text.
// - sStringToDisplay: String
// - oCreatureToFloatAbove
// - bBroadcastToFaction: If this is TRUE then only creatures in the same faction
//   as oCreatureToFloatAbove
//   will see the floaty text, and only if they are within range (30 metres).
void FloatingTextStringOnCreature(string sStringToDisplay, object oCreatureToFloatAbove, int bBroadcastToFaction=TRUE);

// 527: - oTrapObject: a placeable, door or trigger
// * Returns TRUE if oTrapObject is disarmable.
int GetTrapDisarmable(object oTrapObject);

// 528: - oTrapObject: a placeable, door or trigger
// * Returns TRUE if oTrapObject is detectable.
int GetTrapDetectable(object oTrapObject);

// 529: - oTrapObject: a placeable, door or trigger
// - oCreature
// * Returns TRUE if oCreature has detected oTrapObject
int GetTrapDetectedBy(object oTrapObject, object oCreature);

// 530: - oTrapObject: a placeable, door or trigger
// * Returns TRUE if oTrapObject has been flagged as visible to all creatures.
int GetTrapFlagged(object oTrapObject);

// 531: Get the trap base type (TRAP_BASE_TYPE_*) of oTrapObject.
// - oTrapObject: a placeable, door or trigger
int GetTrapBaseType(object oTrapObject);

// 532: - oTrapObject: a placeable, door or trigger
// * Returns TRUE if oTrapObject is one-shot (i.e. it does not reset itself
//   after firing.
int GetTrapOneShot(object oTrapObject);

// 533: Get the creator of oTrapObject, the creature that set the trap.
// - oTrapObject: a placeable, door or trigger
// * Returns OBJECT_INVALID if oTrapObject was created in the toolset.
object GetTrapCreator(object oTrapObject);

// 534: Get the tag of the key that will disarm oTrapObject.
// - oTrapObject: a placeable, door or trigger
string GetTrapKeyTag(object oTrapObject);

// 535: Get the DC for disarming oTrapObject.
// - oTrapObject: a placeable, door or trigger
int GetTrapDisarmDC(object oTrapObject);

// 536: Get the DC for detecting oTrapObject.
// - oTrapObject: a placeable, door or trigger
int GetTrapDetectDC(object oTrapObject);

// 537: * Returns TRUE if a specific key is required to open the lock on oObject.
int GetLockKeyRequired(object oObject);

// 538: Get the tag of the key that will open the lock on oObject.
int GetLockKeyTag(object oObject);

// 539: * Returns TRUE if the lock on oObject is lockable.
int GetLockLockable(object oObject);

// 540: Get the DC for unlocking oObject.
int GetLockUnlockDC(object oObject);

// 541: Get the DC for locking oObject.
int GetLockLockDC(object oObject);

// 542: Get the last PC that levelled up.
object GetPCLevellingUp();

// 543: - nFeat: FEAT_*
// - oObject
// * Returns TRUE if oObject has effects on it originating from nFeat.
int GetHasFeatEffect(int nFeat, object oObject=OBJECT_SELF);

// 544: Set the status of the illumination for oPlaceable.
// - oPlaceable
// - bIlluminate: if this is TRUE, oPlaceable's illumination will be turned on.
//   If this is FALSE, oPlaceable's illumination will be turned off.
// Note: You must call RecomputeStaticLighting() after calling this function in
// order for the changes to occur visually for the players.
// SetPlaceableIllumination() buffers the illumination changes, which are then
// sent out to the players once RecomputeStaticLighting() is called.  As such,
// it is best to call SetPlaceableIllumination() for all the placeables you wish
// to set the illumination on, and then call RecomputeStaticLighting() once after
// all the placeable illumination has been set.
// * If oPlaceable is not a placeable object, or oPlaceable is a placeable that
//   doesn't have a light, nothing will happen.
void SetPlaceableIllumination(object oPlaceable=OBJECT_SELF, int bIlluminate=TRUE);

// 545: * Returns TRUE if the illumination for oPlaceable is on
int GetPlaceableIllumination(object oPlaceable=OBJECT_SELF);

// 546: - oPlaceable
// - nPlaceableAction: PLACEABLE_ACTION_*
// * Returns TRUE if nPlacebleAction is valid for oPlaceable.
int GetIsPlaceableObjectActionPossible(object oPlaceable, int nPlaceableAction);

// 547: The caller performs nPlaceableAction on oPlaceable.
// - oPlaceable
// - nPlaceableAction: PLACEABLE_ACTION_*
void DoPlaceableObjectAction(object oPlaceable, int nPlaceableAction);

// 548: Get the first PC in the player list.
// This resets the position in the player list for GetNextPC().
object GetFirstPC();

// 549: Get the next PC in the player list.
// This picks up where the last GetFirstPC() or GetNextPC() left off.
object GetNextPC();

// 550: Set oDetector to have detected oTrap.
int SetTrapDetectedBy(object oTrap, object oDetector);

// 551: Note: Only placeables, doors and triggers can be trapped.
// * Returns TRUE if oObject is trapped.
int GetIsTrapped(object oObject);

// 552: SetEffectIcon
// This will link the specified effect icon to the specified effect.  The
// effect returned will contain the link to the effect icon and applying this
// effect will cause an effect icon to appear on the portrait/charsheet gui.
// eEffect: The effect which should cause the effect icon to appear.
// nIcon: Index into effecticon.2da of the effect icon to use.
effect SetEffectIcon( effect eEffect, int nIcon );

// 553: FaceObjectAwayFromObject
// This will cause the object oFacer to face away from oObjectToFaceAwayFrom.
// The objects must be in the same area for this to work.
void FaceObjectAwayFromObject( object oFacer, object oObjectToFaceAwayFrom );

// 554: Spawn in the Death GUI.
// The default (as defined by BioWare) can be spawned in by PopUpGUIPanel, but
// if you want to turn off the "Respawn" or "Wait for Help" buttons, this is the
// function to use.
// - oPC
// - bRespawnButtonEnabled: if this is TRUE, the "Respawn" button will be enabled
//   on the Death GUI.
// - bWaitForHelpButtonEnabled: if this is TRUE, the "Wait For Help" button will
//   be enabled on the Death GUI.
// - nHelpStringReference
// - sHelpString
void PopUpDeathGUIPanel(object oPC, int bRespawnButtonEnabled=TRUE, int bWaitForHelpButtonEnabled=TRUE, int nHelpStringReference=0, string sHelpString="");

// 555: Disable oTrap.
// - oTrap: a placeable, door or trigger.
void SetTrapDisabled(object oTrap);

// 556: Get the last object that was sent as a GetLastAttacker(), GetLastDamager(),
// GetLastSpellCaster() (for a hostile spell), or GetLastDisturbed() (when a
// creature is pickpocketed).
// Note: Return values may only ever be:
// 1) A Creature
// 2) Plot Characters will never have this value set
// 3) Area of Effect Objects will return the AOE creator if they are registered
//    as this value, otherwise they will return INVALID_OBJECT_ID
// 4) Traps will not return the creature that set the trap.
// 5) This value will never be overwritten by another non-creature object.
// 6) This value will never be a dead/destroyed creature
object GetLastHostileActor(object oVictim=OBJECT_SELF);

// 557: Force all the characters of the players who are currently in the game to
// be exported to their respective directories i.e. LocalVault/ServerVault/ etc.
void ExportAllCharacters();

// 558: Get the Day Track for oArea.
int MusicBackgroundGetDayTrack(object oArea);

// 559: Get the Night Track for oArea.
int MusicBackgroundGetNightTrack(object oArea);

// 560: Write sLogEntry as a timestamped entry into the log file
void WriteTimestampedLogEntry(string sLogEntry);

// 561: Get the module's name in the language of the server that's running it.
// * If there is no entry for the language of the server, it will return an
//   empty string
string GetModuleName();

// 562: Get the leader of the faction of which oMemberOfFaction is a member.
// * Returns OBJECT_INVALID if oMemberOfFaction is not a valid creature.
object GetFactionLeader(object oMemberOfFaction);

// 563: Turns on or off the speed blur effect in rendered scenes.
// bEnabled: Set TRUE to turn it on, FALSE to turn it off.
// fRatio: Sets the frame accumulation ratio.
void SWMG_SetSpeedBlurEffect( int bEnabled, float fRatio=0.75f );

// 564: Immediately ends the currently running game and returns to the start screen.
// nShowEndGameGui: Set TRUE to display the death gui.
void EndGame( int nShowEndGameGui=TRUE );

// 565: Get a variable passed when calling console debug runscript
int GetRunScriptVar();

// 566: This function returns a value that matches one of the MOVEMENT_SPEED_... constants
//      if the OID passed in is not found or not a creature then it will return
//  MOVEMENT_SPEED_IMMOBILE.
int GetCreatureMovmentType(object oidCreature);

// 567: Set the ambient day volume for oArea to nVolume.
// - oArea
// - nVolume: 0 - 100
void AmbientSoundSetDayVolume(object oArea, int nVolume);

// 568: Set the ambient night volume for oArea to nVolume.
// - oArea
// - nVolume: 0 - 100
void AmbientSoundSetNightVolume(object oArea, int nVolume);

// 569: Get the Battle Track for oArea.
int MusicBackgroundGetBattleTrack(object oArea);

// 570: Determine whether oObject has an inventory.
// * Returns TRUE for creatures and stores, and checks to see if an item or placeable object is a container.
// * Returns FALSE for all other object types.
int GetHasInventory(object oObject);

// 571: Get the duration (in seconds) of the sound attached to nStrRef
// * Returns 0.0f if no duration is stored or if no sound is attached
float GetStrRefSoundDuration(int nStrRef);

// 572: Add oPC to oPartyLeader's party.  This will only work on two PCs.
// - oPC: player to add to a party
// - oPartyLeader: player already in the party
void AddToParty(object oPC, object oPartyLeader);

// 573: Remove oPC from their current party. This will only work on a PC.
// - oPC: removes this player from whatever party they're currently in.
void RemoveFromParty(object oPC);

// 574: Adds a creature to the party
// Returns whether the addition was successful
// AddPartyMember
int AddPartyMember(int nNPC, object oCreature);

// 575: Removes a creature from the party
// Returns whether the removal was syccessful
// RemovePartyMember
int RemovePartyMember(int nNPC);

// 576: Returns whether a specified creature is a party member
// IsObjectPartyMember
int IsObjectPartyMember(object oCreature);

// 577: Returns the party member at a given index in the party.
// The order of members in the party can vary based on
// who the current leader is (member 0 is always the current
// party leader).
// GetPartyMemberByIndex
object GetPartyMemberByIndex(int nIndex);

// 578: GetGlobalBoolean
// This function returns the value of a global boolean (TRUE or FALSE) scripting variable.
int GetGlobalBoolean( string sIdentifier );

// 579: SetGlobalBoolean
// This function sets the value of a global boolean (TRUE or FALSE) scripting variable.
void SetGlobalBoolean( string sIdentifier, int nValue );

// 580: GetGlobalNumber
// This function returns the value of a global number (-128 to +127) scripting variable.
int GetGlobalNumber( string sIdentifier );

// 581: SetGlobalNumber
// This function sets the value of a global number (-128 to +127) scripting variable.
void SetGlobalNumber( string sIdentifier, int nValue );

// post a string to the screen at column nX and row nY for fLife seconds
// 582. AurPostString
void AurPostString(string sString, int nX, int nY, float fLife);

// 583: OnAnimKey
// get the event and the name of the model on which the event happened
// SWMG_GetLastEvent
string SWMG_GetLastEvent();

// 584: SWMG_GetLastEventModelName
string SWMG_GetLastEventModelName();

// 585: gets an object by its name (duh!)
// SWMG_GetObjectByName
object SWMG_GetObjectByName(string sName);

// 586: plays an animation on an object
// SWMG_PlayAnimation
void SWMG_PlayAnimation(object oObject, string sAnimName, int bLooping=1, int bQueue=0, int bOverlay=0);

// 587: OnHitBullet
// get the damage, the target type (see TARGETflags), and the shooter
// SWMG_GetLastBulletHitDamage
int SWMG_GetLastBulletHitDamage();

// 588: SWMG_GetLastBulletHitTarget
int SWMG_GetLastBulletHitTarget();

// 589: SWMG_GetLastBulletHitShooter
object SWMG_GetLastBulletHitShooter();

// 590: adjusts a followers hit points, can specify the absolute value to set to
// SWMG_AdjustFollowerHitPoints
int SWMG_AdjustFollowerHitPoints(object oFollower, int nHP, int nAbsolute=0);

// 591: the default implementation of OnBulletHit
// SWMG_OnBulletHit
void SWMG_OnBulletHit();

// 592: the default implementation of OnObstacleHit
// SWMG_OnObstacleHit
void SWMG_OnObstacleHit();

// 593: returns the last follower and obstacle hit
// SWMG_GetLastFollowerHit
object SWMG_GetLastFollowerHit();

// 594: SWMG_GetLastObstacleHit
object SWMG_GetLastObstacleHit();

// 595: gets information about the last bullet fired
// SWMG_GetLastBulletFiredDamage
int SWMG_GetLastBulletFiredDamage();

// 596: SWMG_GetLastBulletFiredTarget
int SWMG_GetLastBulletFiredTarget();

// 597: gets an objects name
// SWMG_GetObjectName
string SWMG_GetObjectName(object oid=OBJECT_SELF);

// 598: the default implementation of OnDeath
// SWMG_OnDeath
void SWMG_OnDeath();

// 599: a bunch of Is functions for your pleasure
// SWMG_IsFollower
int SWMG_IsFollower(object oid=OBJECT_SELF);

// 600: SWMG_IsPlayer
int SWMG_IsPlayer(object oid=OBJECT_SELF);

// 601: SWMG_IsEnemy
int SWMG_IsEnemy(object oid=OBJECT_SELF);

// 602: SWMG_IsTrigger
int SWMG_IsTrigger(object oid=OBJECT_SELF);

// 603: SWMG_IsObstacle
int SWMG_IsObstacle(object oid=OBJECT_SELF);

// 604: SWMG_SetFollowerHitPoints
void SWMG_SetFollowerHitPoints(object oFollower, int nHP);

// 605: SWMG_OnDamage
void SWMG_OnDamage();

// 606: SWMG_GetLastHPChange
int SWMG_GetLastHPChange();

// 607: SWMG_RemoveAnimation
void SWMG_RemoveAnimation(object oObject, string sAnimName);

// 608: SWMG_GetCameraNearClip
float SWMG_GetCameraNearClip();

// 609: SWMG_GetCameraFarClip
float SWMG_GetCameraFarClip();

// 610: SWMG_SetCameraClip
void SWMG_SetCameraClip(float fNear, float fFar);

// 611: SWMG_GetPlayer
object SWMG_GetPlayer();

// 612: SWMG_GetEnemyCount
int SWMG_GetEnemyCount();

// 613: SWMG_GetEnemy
object SWMG_GetEnemy(int nEntry);

// 614: SWMG_GetObstacleCount
int SWMG_GetObstacleCount();

// 615: SWMG_GetObstacle
object SWMG_GetObstacle(int nEntry);

// 616: SWMG_GetHitPoints
int SWMG_GetHitPoints(object oFollower);

// 617: SWMG_GetMaxHitPoints
int SWMG_GetMaxHitPoints(object oFollower);

// 618: SWMG_SetMaxHitPoints
void SWMG_SetMaxHitPoints(object oFollower, int nMaxHP);

// 619: SWMG_GetSphereRadius
float SWMG_GetSphereRadius(object oFollower);

// 620: SWMG_SetSphereRadius
void SWMG_SetSphereRadius(object oFollower, float fRadius);

// 621: SWMG_GetNumLoops
int SWMG_GetNumLoops(object oFollower);

// 622: SWMG_SetNumLoops
void SWMG_SetNumLoops(object oFollower, int nNumLoops);

// 623: SWMG_GetPosition
vector SWMG_GetPosition(object oFollower);

// 624: SWMG_GetGunBankCount
int SWMG_GetGunBankCount(object oFollower);

// 625: SWMG_GetGunBankBulletModel
string SWMG_GetGunBankBulletModel(object oFollower, int nGunBank);

// 626: SWMG_GetGunBankGunModel
string SWMG_GetGunBankGunModel(object oFollower, int nGunBank);

// 627: SWMG_GetGunBankDamage
int SWMG_GetGunBankDamage(object oFollower, int nGunBank);

// 628: SWMG_GetGunBankTimeBetweenShots
float SWMG_GetGunBankTimeBetweenShots(object oFollower, int nGunBank);

// 629: SWMG_GetGunBankLifespan
float SWMG_GetGunBankLifespan(object oFollower, int nGunBank);

// 630: SWMG_GetGunBankSpeed
float SWMG_GetGunBankSpeed(object oFollower, int nGunBank);

// 631: SWMG_GetGunBankTarget
int SWMG_GetGunBankTarget(object oFollower, int nGunBank);

// 632: SWMG_SetGunBankBulletModel
void SWMG_SetGunBankBulletModel(object oFollower, int nGunBank, string sBulletModel);

// 633: SWMG_SetGunBankGunModel
void SWMG_SetGunBankGunModel(object oFollower, int nGunBank, string sGunModel);

// 634: SWMG_SetGunBankDamage
void SWMG_SetGunBankDamage(object oFollower, int nGunBank, int nDamage);

// 635: SWMG_SetGunBankTimeBetweenShots
void SWMG_SetGunBankTimeBetweenShots(object oFollower, int nGunBank, float fTBS);

// 636: SWMG_SetGunBankLifespan
void SWMG_SetGunBankLifespan(object oFollower, int nGunBank, float fLifespan);

// 637: SWMG_SetGunBankSpeed
void SWMG_SetGunBankSpeed(object oFollower, int nGunBank, float fSpeed);

// 638: SWMG_SetGunBankTarget
void SWMG_SetGunBankTarget(object oFollower, int nGunBank, int nTarget);

// 639: SWMG_GetLastBulletHitPart
string SWMG_GetLastBulletHitPart();

// 640: SWMG_IsGunBankTargetting
int SWMG_IsGunBankTargetting(object oFollower, int nGunBank);

// 641: SWMG_GetPlayerOffset
// returns a vector with the player rotation for rotation minigames
// returns a vector with the player translation for translation minigames
vector SWMG_GetPlayerOffset();

// 642: SWMG_GetPlayerInvincibility
float SWMG_GetPlayerInvincibility();

// 643: SWMG_GetPlayerSpeed
float SWMG_GetPlayerSpeed();

// 644: SWMG_GetPlayerMinSpeed
float SWMG_GetPlayerMinSpeed ();

// 645: SWMG_GetPlayerAccelerationPerSecond
float SWMG_GetPlayerAccelerationPerSecond();

// 646: SWMG_GetPlayerTunnelPos
vector SWMG_GetPlayerTunnelPos();

// 647: SWMG_SetPlayerOffset
void SWMG_SetPlayerOffset(vector vOffset);

// 648: SWMG_SetPlayerInvincibility
void SWMG_SetPlayerInvincibility(float fInvincibility);

// 649: SWMG_SetPlayerSpeed
void SWMG_SetPlayerSpeed(float fSpeed);

// 650: SWMG_SetPlayerMinSpeed
void SWMG_SetPlayerMinSpeed(float fMinSpeed);

// 651: SWMG_SetPlayerAccelerationPerSecond
void SWMG_SetPlayerAccelerationPerSecond(float fAPS);

// 652: SWMG_SetPlayerTunnelPos
void SWMG_SetPlayerTunnelPos(vector vTunnel);

// 653: SWMG_GetPlayerTunnelNeg
vector SWMG_GetPlayerTunnelNeg();

// 654: SWMG_SetPlayerTunnelNeg
void SWMG_SetPlayerTunnelNeg(vector vTunnel);

// 655: SWMG_GetPlayerOrigin
vector SWMG_GetPlayerOrigin();

// 656: SWMG_SetPlayerOrigin
void SWMG_SetPlayerOrigin(vector vOrigin);

// 657: SWMG_GetGunBankHorizontalSpread
float SWMG_GetGunBankHorizontalSpread(object oEnemy, int nGunBank);

// 658: SWMG_GetGunBankVerticalSpread
float SWMG_GetGunBankVerticalSpread(object oEnemy, int nGunBank);

// 659: SWMG_GetGunBankSensingRadius
float SWMG_GetGunBankSensingRadius(object oEnemy, int nGunBank);

// 660: SWMG_GetGunBankInaccuracy
float SWMG_GetGunBankInaccuracy(object oEnemy, int nGunBank);

// 661: SWMG_SetGunBankHorizontalSpread
void SWMG_SetGunBankHorizontalSpread(object oEnemy, int nGunBank, float fHorizontalSpread);

// 662: SWMG_SetGunBankVerticalSpread
void SWMG_SetGunBankVerticalSpread(object oEnemy, int nGunBank, float fVerticalSpread);

// 663: SWMG_SetGunBankSensingRadius
void SWMG_SetGunBankSensingRadius(object oEnemy, int nGunBank, float fSensingRadius);

// 664: SWMG_SetGunBankInaccuracy
void SWMG_SetGunBankInaccuracy(object oEnemy, int nGunBank, float fInaccuracy);

// 665: GetIsInvulnerable
// This returns whether the follower object is currently invulnerable to damage
int SWMG_GetIsInvulnerable( object oFollower );

// 666: StartInvulnerability
// This will begin a period of invulnerability (as defined by Invincibility)
void SWMG_StartInvulnerability( object oFollower );

// 667: GetPlayerMaxSpeed
// This returns the player character's max speed
float SWMG_GetPlayerMaxSpeed();

// 668: SetPlayerMaxSpeed
// This sets the player character's max speed
void SWMG_SetPlayerMaxSpeed( float fMaxSpeed );

// 669: AddJournalWorldEntry
// Adds a user entered entry to the world notices
void AddJournalWorldEntry( int nIndex, string szEntry, string szTitle = "World Entry" );

// 670: AddJournalWorldEntryStrref
// Adds an entry to the world notices using stringrefs
void AddJournalWorldEntryStrref ( int strref, int strrefTitle );

// 671: BarkString
// this will cause a creature to bark the strRef from the talk table
// If creature is specefied as OBJECT_INVALID a general bark is made.
void BarkString(object oCreature,int strRef, int nBarkX = -1, int nBarkY = -1);


// 672: DeleteJournalWorldAllEntries
// Nuke's 'em all, user entered or otherwise.
void DeleteJournalWorldAllEntries();

// 673: DeleteJournalWorldEntry
// Deletes a user entered world notice
void DeleteJournalWorldEntry( int nIndex );

// 674: DeleteJournalWorldEntryStrref
// Deletes the world notice pertaining to the string ref
void DeleteJournalWorldEntryStrref( int strref );

// 675: EffectForceDrain
// This command will reduce the force points of a creature.
effect EffectForceDrain( int nDamage );

// 676: EffectTemporaryForcePoints
//
effect EffectPsychicStatic();

// 677: PlayVisualAreaEffect
void PlayVisualAreaEffect(int nEffectID, location lTarget);

// 678: SetJournalQuestEntryPicture
// Sets the picture for the quest entry on this object (creature)
void SetJournalQuestEntryPicture(string szPlotID, object oObject, int nPictureIndex, int bAllPartyMemebers=TRUE, int bAllPlayers=FALSE);

// 679. GetLocalBoolean
// This gets a boolean flag on an object
// currently the index is a range between 20 and 63
int GetLocalBoolean( object oObject, int nIndex );

// 680. SetLocalBoolean
// This sets a boolean flag on an object
// currently the index is a range between 20 and 63
void SetLocalBoolean( object oObject, int nIndex, int nValue );

// 681. GetLocalNumber
// This gets a number on an object
// currently the index is a range between 12 and 28
int GetLocalNumber( object oObject, int nIndex );

// 682. SetLocalNumber
// This sets a number on an object
// currently the index is a range between 12 and 28
// the value range is 0 to 255
void SetLocalNumber( object oObject, int nIndex, int nValue );

// 683. SWMG_GetSoundFrequency
// Gets the frequency of a trackfollower sound
int SWMG_GetSoundFrequency( object oFollower, int nSound );

// 684. SWMG_SetSoundFrequency
// Sets the frequency of a trackfollower sound
void SWMG_SetSoundFrequency( object oFollower, int nSound, int nFrequency );

// 685. SWMG_GetSoundFrequencyIsRandom
// Gets whether the frequency of a trackfollower sound is using the random model
int SWMG_GetSoundFrequencyIsRandom( object oFollower, int nSound );

// 686. SWMG_SetSoundFrequencyIsRandom
// Sets whether the frequency of a trackfollower sound is using the random model
void SWMG_SetSoundFrequencyIsRandom( object oFollower, int nSound, int bIsRandom );

// 687. SWMG_GetSoundVolume
// Gets the volume of a trackfollower sound
int SWMG_GetSoundVolume( object oFollower, int nSound );

// 688. SWMG_SetSoundVolume
// Sets the volume of a trackfollower sound
void SWMG_SetSoundVolume( object oFollower, int nSound, int nVolume );

// 689. SoundObjectGetPitchVariance
// Gets the pitch variance of a placeable sound object
float SoundObjectGetPitchVariance( object oSound );

// 690. SoundObjectSetPitchVariance
// Sets the pitch variance of a placeable sound object
void SoundObjectSetPitchVariance( object oSound, float fVariance );

// 691. SoundObjectGetVolume
// Gets the volume of a placeable sound object
int SoundObjectGetVolume( object oSound );

// 692: GetGlobalLocation
// This function returns the a global location scripting variable.
location GetGlobalLocation( string sIdentifier );

// 693: SetGlobalLocation
// This function sets the a global location scripting variable.
void SetGlobalLocation( string sIdentifier, location lValue );

// 694. AddAvailableNPCByObject
// This adds a NPC to the list of available party members using
// a game object as the template
// Returns if true if successful, false if the NPC had already
// been added or the object specified is invalid
int AddAvailableNPCByObject( int nNPC, object oCreature );

// 695. RemoveAvailableNPC
// This removes a NPC from the list of available party members
// Returns whether it was successful or not
int RemoveAvailableNPC( int nNPC );

// 696. IsAvailableNPC
// This returns whether a NPC is in the list of available party members
int IsAvailableCreature( int nNPC );

// 697. AddAvailableNPCByTemplate
// This adds a NPC to the list of available party members using
// a template
// Returns if true if successful, false if the NPC had already
// been added or the template specified is invalid
int AddAvailableNPCByTemplate( int nNPC, string sTemplate );

// 698. SpawnAvailableNPC
// This spawns a NPC from the list of available creatures
// Returns a pointer to the creature object
object SpawnAvailableNPC( int nNPC, location lPosition );

// 699. IsNPCPartyMember
// Returns if a given NPC constant is in the party currently
int IsNPCPartyMember( int nNPC );

// 700. ActionBarkString
// this will cause a creature to bark the strRef from the talk table.
void ActionBarkString(int strRef);

// 701. GetIsConversationActive
// Checks to see if any conversations are currently taking place
int GetIsConversationActive();

// 702. EffectLightsaberThrow
// This function throws a lightsaber at a target
// If multiple targets are specified, then the lightsaber travels to them
// sequentially, returning to the first object specified
// This effect is applied to an object, so an effector is not needed
effect EffectLightsaberThrow(object oTarget1, object oTarget2 = OBJECT_INVALID, object oTarget3 = OBJECT_INVALID, int nAdvancedDamage = 0);

// 703.
// creates the effect of a whirl wind.
effect EffectWhirlWind();

// 704.
// Returns the party ai style
int GetPartyAIStyle();

// 705.
// Returns the party members ai style
int GetNPCAIStyle(object oCreature);

// 706.
// Sets the party ai style
void SetPartyAIStyle(int nStyle);

// 707.
// Sets the party members ai style
void SetNPCAIStyle(object oCreature, int nStyle);

// 708: SetNPCSelectability
void SetNPCSelectability(int nNPC, int nSelectability);

// 709: GetNPCSelectability
// nNPC - NPC_
// returns 1 if in current party, 0 if selectable as a party member
// -1 if not in party at all
int GetNPCSelectability(int nNPC);

// 710: Clear all the effects of the caller.
// * No return value, but if an error occurs, the log file will contain
//   "ClearAllEffects failed.".
void ClearAllEffects();

// 711: GetLastConversation
// Gets the last conversation string.
string GetLastConversation();
//

// 712: ShowPartySelectionGUI
// Brings up the party selection GUI for the player to
// select the members of the party from
// if exit script is specified, will be executed when
// the GUI is exited
// RWT-OEI 08/23/04 - New parameter = nAllowCancel. Passing in TRUE
//  to this parameter makes it possible for the player to cancel out
//  of the party selection GUI, so be careful that you are okay with
//  them cancelling out of it before you pass TRUE.
//  Also, in the sExitScript that gets called after the Party Select
//  GUI exits, you can use GetRunScriptVar to find out if they
//  cancelled. If it returns TRUE, they didn't cancel. If it returns
//  FALSE, they cancelled.  See me if there's questions.
void ShowPartySelectionGUI(string sExitScript = "", int nForceNPC1 = -1, int nForceNPC2 = -1, int nAllowCancel = FALSE);

// 713: GetStandardFaction
// Find out which standard faction oObject belongs to.
// * Returns INVALID_STANDARD_FACTION if oObject does not belong to
//   a Standard Faction, or an error has occurred.
int GetStandardFaction(object oObject);

// 714: GivePlotXP
// Give nPercentage% of the experience associated with plot sPlotName
// to the party
// - sPlotName
// - nPercentage
void GivePlotXP(string sPlotName, int nPercentage);

// 715. GetMinOneHP
// Checks to see if oObject has the MinOneHP Flag set on them.
int GetMinOneHP(object oObject);

// 716. SetMinOneHP
// Sets/Removes the MinOneHP Flag on oObject.
void SetMinOneHP(object oObject,int nMinOneHP);

// 717. SWMG_GetPlayerTunnelInfinite
// Gets whether each of the dimensions is infinite
vector SWMG_GetPlayerTunnelInfinite();

// 718. SWMG_SetPlayerTunnelInfinite
// Sets whether each of the dimensions is infinite
void SWMG_SetPlayerTunnelInfinite(vector vInfinite);

// 719. SetGlobalFadeIn
// Sets a Fade In that starts after fWait seconds and fades for fLength Seconds.
// The Fade will be from a color specified by the RGB values fR, fG, and fB.
// Note that fR, fG, and fB are normalized values.
// The default values are an immediate cut in from black.
void SetGlobalFadeIn(float fWait = 0.0f, float fLength = 0.0f, float fR=0.0f, float fG=0.0f, float fB=0.0f);

// 720. SetGlobalFadeOut
// Sets a Fade Out that starts after fWait seconds and fades for fLength Seconds.
// The Fade will be to a color specified by the RGB values fR, fG, and fB.
// Note that fR, fG, and fB are normalized values.
// The default values are an immediate cut to from black.
void SetGlobalFadeOut(float fWait = 0.0f, float fLength = 0.0f, float fR=0.0f, float fG=0.0f, float fB=0.0f);


// 721. GetLastAttackTarget
// Returns the last attack target for a given object
object GetLastHostileTarget(object oAttacker = OBJECT_SELF);

// 722. GetLastAttackAction
// Returns the last attack action for a given object
int GetLastAttackAction(object oAttacker = OBJECT_SELF);

// 723. GetLastForcePowerUsed
// Returns the last force power used (as a spell number that indexes the Spells.2da) by the given object
int GetLastForcePowerUsed(object oAttacker = OBJECT_SELF);

// 724. GetLastCombatFeatUsed
// Returns the last feat used (as a feat number that indexes the Feats.2da) by the given object
int GetLastCombatFeatUsed(object oAttacker = OBJECT_SELF);

// 725. GetLastAttackResult
// Returns the result of the last attack
int GetLastAttackResult(object oAttacker = OBJECT_SELF);

// 726. GetWasForcePowerSuccessful
// Returns whether the last force power used was successful or not
int GetWasForcePowerSuccessful(object oAttacker = OBJECT_SELF);

// 727. GetFirstAttacker
// Returns the first object in the area that is attacking oCreature
object GetFirstAttacker(object oCreature = OBJECT_SELF);

// 728. GetNextAttacker
// Returns the next object in the area that is attacking oCreature
object GetNextAttacker(object oCreature = OBJECT_SELF);

// 729. SetFormation
// Put oCreature into the nFormationPattern about oAnchor at position nPosition
// - oAnchor: The formation is set relative to this object
// - oCreature: This is the creature that you wish to join the formation
// - nFormationPattern: FORMATION_*
// - nPosition: Integer from 1 to 10 to specify which position in the formation
//   oCreature is supposed to take.
void SetFormation(object oAnchor, object oCreature, int nFormationPattern, int nPosition);

// 730. ActionFollowLeader
// this action has a party member follow the leader.
// DO NOT USE ON A CREATURE THAT IS NOT IN THE PARTY!!
void ActionFollowLeader();

// 731. SetForcePowerUnsuccessful
// Sets the reason (through a constant) for why a force power failed
void SetForcePowerUnsuccessful(int nResult, object oCreature = OBJECT_SELF);

// 732. GetIsDebilitated
// Returns whether the given object is debilitated or not
int GetIsDebilitated(object oCreature = OBJECT_SELF);

// 733. PlayMovie
// Playes a Movie.
void PlayMovie( string sMovie, int nStreamingMusic = FALSE );

// 734. SaveNPCState
// Tells the party table to save the state of a party member NPC
void SaveNPCState( int nNPC );

// 735: Get the Category of tTalent.
int GetCategoryFromTalent(talent tTalent);

// 736: This affects all creatures in the area that are in faction nFactionFrom...
// - Makes them join nFactionTo
// - Clears all actions
// - Disables combat mode
void SurrenderByFaction(int nFactionFrom, int nFactionTo);

// 737: This affects all creatures in the area that are in faction nFactionFrom.
// making them change to nFactionTo
void ChangeFactionByFaction(int nFactionFrom, int nFactionTo);

// 738: PlayRoomAnimation
// Plays a looping animation on a room
void PlayRoomAnimation(string sRoom, int nAnimation);

// 739: ShowGalaxyMap
// Brings up the Galaxy Map Gui, with 'nPlanet' selected.  'nPlanet' can only be a planet
// that has already been set available and selectable.
void ShowGalaxyMap(int nPlanet);

// 740: SetPlanetSelectable
// Sets 'nPlanet' selectable on the Galaxy Map Gui.
void SetPlanetSelectable(int nPlanet, int bSelectable);

// 741: GetPlanetSelectable
// Returns wheter or not 'nPlanet' is selectable.
int GetPlanetSelectable(int nPlanet);

// 742: SetPlanetAvailable
// Sets 'nPlanet' available on the Galaxy Map Gui.
void SetPlanetAvailable(int nPlanet, int bAvailable);

// 743: GetPlanetAvailable
// Returns wheter or not 'nPlanet' is available.
int GetPlanetAvailable(int nPlanet);

// 744: GetSelectedPlanet
// Returns the ID of the currently selected planet.  Check Planetary.2da
// for which planet the return value corresponds to. If the return is -1
// no planet is selected.
int GetSelectedPlanet();

// 745: SoundObjectFadeAndStop
// Fades a sound object for 'fSeconds' and then stops it.
void SoundObjectFadeAndStop(object oSound,float fSeconds);

// 746: SetAreaFogColor
// Set the fog color for the area oArea.
void SetAreaFogColor( object oArea, float fRed, float fGreen, float fBlue );

// 747: ChangeItemCost
// Change the cost of an item
void ChangeItemCost( string sItem, float fCostMultiplier );

// 748: GetIsLiveContentAvailable
// Determines whether a given live content package is available
// nPkg = LIVE_CONTENT_PKG1, LIVE_CONTENT_PKG2, ..., LIVE_CONTENT_PKG6
int GetIsLiveContentAvailable(int nPkg);

// 749: ResetDialogState
// Resets the GlobalDialogState for the engine.
// NOTE: NEVER USE THIS UNLESS YOU KNOW WHAT ITS FOR!
//       only to be used for a failing OnDialog script
void ResetDialogState();

// 750: SetAlignmentGoodEvil
// Set oCreature's alignment value
void SetGoodEvilValue( object oCreature, int nAlignment );

// 751: GetIsPoisoned
// Returns TRUE if the object specified is poisoned.
int GetIsPoisoned( object oObject );

// 752: GetSpellTarget
// Returns the object id of the spell target
object GetSpellTarget(object oCreature=OBJECT_SELF);

// 753: SetSoloMode
// Activates/Deactivates solo mode for the player's party.
void SetSoloMode( int bActivate );

// 754: EffectCutSceneHorrified
// Get a horrified effect for cutscene purposes (ie. this effect will ignore immunities).
effect EffectCutSceneHorrified();

// 755: EffectCutSceneParalyze
// Get a paralyze effect for cutscene purposes (ie. this effect will ignore immunities).
effect EffectCutSceneParalyze();

// 756: EffectCutSceneStunned
// Get a stun effect for cutscene purposes (ie. this effect will ignore immunities).
effect EffectCutSceneStunned();

// 757: CancelPostDialogCharacterSwitch()
// If a dialog has been started by an NPC on a Non PartyMemeberCanInteract object
// calling this function will cancel the Post Dialog switching back to the NPC
// that did the initiating.
void CancelPostDialogCharacterSwitch();

// 758: SetMaxHitPoints
// Set the maximum hitpoints of oObject
// The objects maximum AND current hitpoints will be nMaxHP after the function is called
void SetMaxHitPoints(object oObject, int nMaxHP);

// 759: NoClicksFor()
// This command will not allow clicking on anything for 'fDuration' seconds
void NoClicksFor(float fDuration);

// 760: HoldWorldFadeInForDialog()
// This will hold the fade in at the begining of a module until a dialog starts
void HoldWorldFadeInForDialog();

// 761: ShipBuild()
// This will return if this is a shipping build. this should be used to disable all debug output.
int ShipBuild();

// 762: SurrenderRetainBuffs()
// This will do the same as SurrenderToEnemies, except that affected creatures will not
// lose effects which they have put on themselves
void SurrenderRetainBuffs();

// 763. SuppressStatusSummaryEntry
// This will prevent the next n entries that should have shown up in the status summary
// from being added
// This will not add on to any existing summary suppressions, but rather replace it.  So
// to clear the supression system pass 0 as the entry value
void SuppressStatusSummaryEntry(int nNumEntries = 1);

// 764. GetCheatCode
// Returns true if cheat code has been enabled
int GetCheatCode(int nCode);

// 765. SetMusicVolume
// NEVER USE THIS!
void SetMusicVolume(float fVolume = 1.0f);

// 766. CreateItemOnFloor
// Should only be used for items that have been created on the ground, and will
// be destroyed without ever being picked up or equipped.  Returns true if successful
object CreateItemOnFloor(string sTemplate, location lLocation, int bUseAppearAnimation=FALSE);

// 767. SetAvailableNPCId
// This will set the object id that should be used for a specific available NPC
void SetAvailableNPCId(int nNPC, object oidNPC);

// DJS-OEI
// 768. GetScriptParameter
// This function will take the index of a script parameter
// and return the value associated with it. The index
// of the first parameter is 1.
int GetScriptParameter( int nIndex );

//RWT-OEI 12/10/03
// 769. SetFadeUntilScript
// This script function will make it so that the fade cannot be lifted under any circumstances
// other than a call to the SetGlobalFadeIn() script.
// This function should be called AFTER the fade has already been called. For example, you would
// do a SetGlobalFadeOut() first, THEN do SetFadeUntilScript()
// The exception to this if it's used in an OnModuleLoad() script, where instead of starting a new
// fade you are just extending the LevelLoad fade indefinitely. You can just call SetFadeUntilScript
// in such cases and the game will stay faded until a GlobalSetFadeIn() is called.
void SetFadeUntilScript();

// DJS-OEI 12/15/2003
// 770: Create a Force Body effect
// - nLevel: The level of the Force Body effect.
//    0 = Force Body
//    1 = Improved Force Body
//    2 = Master Force Body
effect EffectForceBody(int nLevel);

// FAK-OEI 12/15/2003
// 771: Get the number of components for an item
int GetItemComponent( );

// FAK-OEI 12/15/2003
// 771: Get the number of components for an item in pieces
int GetItemComponentPieceValue( );

// FAK-OEI 12/15/2003
// 773: Start the GUI for Chemical Workshop
void ShowChemicalUpgradeScreen(object oCharacter );

// FAK-OEI 12/15/2003
// 774: Get the number of chemicals for an item
int GetChemicals( );

// FAK-OEI 12/15/2003
// 775: Get the number of chemicals for an item in pieces
int GetChemicalPieceValue( );

// DJS-OEI 12/30/2003
// 776: Get the number of Force Points that were required to
// cast this spell. This includes modifiers such as Room Force
// Ratings and the Force Body power.
// * Return value on error: 0
int GetSpellForcePointCost( );

// DJS-OEI 1/2/2004
// 777: Create a Fury effect.
effect EffectFury();

// DJS-OEI 1/3/2004
// 778: Create a Blind effect.
effect EffectBlind();

// DJS-OEI 1/4/2004
// 779: Create an FP regeneration modifier effect.
effect EffectFPRegenModifier( int nPercent );

// DJS-OEI 1/4/2004
// 780: Create a VP regeneration modifier effect.
effect EffectVPRegenModifier( int nPercent );

// DJS-OEI 1/9/2004
// 781: Create a Force Crush effect.
effect EffectCrush();

// FAK - OEI 1/12/04
// 782: Minigame grabs a swoop bike upgrade
int SWMG_GetSwoopUpgrade( int nSlot );

// DJS-OEI 1/12/2004
// 783: Returns whether or not the target has access to a feat,
// even if they can't use it right now due to daily limits or
// other restrictions.
int GetFeatAcquired( int nFeat, object oCreature=OBJECT_SELF );

// DJS-OEI 1/12/2004
// 784: Returns whether or not the target has access to a spell,
// even if they can't use it right now due to lack of Force Points.
int GetSpellAcquired( int nSpell, object oCreature=OBJECT_SELF );

// FAK-OEI 1/12/2004
// 785: Displays the Swoop Bike upgrade screen.
void ShowSwoopUpgradeScreen( );

// DJS-OEI 1/13/2004
// 786: Grants the target a feat without regard for prerequisites.
void GrantFeat( int nFeat, object oCreature );

// DJS-OEI 1/13/2004
// 787: Grants the target a spell without regard for prerequisites.
void GrantSpell( int nSpell, object oCreature );

// DJS-OEI 1/13/2004
// 788: Places an active mine on the map.
// nMineType - Mine Type from Traps.2DA
// lPoint - The location in the world to place the mine.
// nDetectDCBase - This value, plus the "DetectDCMod" column in Traps.2DA
// results in the final DC for creatures to detect this mine.
// nDisarmDCBase - This value, plus the "DisarmDCMod" column in Traps.2DA
// results in the final DC for creatures to disarm this mine.
// oCreator - The object that should be considered the owner of the mine.
// If oCreator is set to OBJECT_INVALID, the faction of the mine will be
// considered Hostile1, meaning the party will be vulnerable to it.
void SpawnMine( int nMineType, location lPoint, int nDetectDCBase, int nDisarmDCBase, object oCreator );

// FAK - OEI 1/15/04
// 789: Yet another minigame function. Returns the object's track's position.
vector SWMG_GetTrackPosition(object oFollower);

// FAK - OEI 1/15/04
// 790: minigame function that lets you psuedo-set the position of a follower object
vector SWMG_SetFollowerPosition(vector vPos);

//RWT-OEI 01/16/04
// 791: A function to put the character into a true combat state but the reason set to
//      not real combat. This should help us control animations in cutscenes with a bit
//      more precision. -- Not totally sure this is doing anything just yet. Seems
//      the combat condition gets cleared shortly after anyway.
//      If nEnable is 1, it enables fake combat mode. If 0, it disables it.
//      WARNING: Whenever using this function to enable fake combat mode, you should
//               have a matching call to it to disable it. (pass 0 for nEnable).
void SetFakeCombatState( object oObject, int nEnable );

// FAK - OEI 1/23/04
// 792: minigame function that deletes a minigame object
void SWMG_DestroyMiniGameObject(object oObject);

// DJS-OEI 1/26/2004
// 793: Returns the Demolitions skill of the creature that
// placed this mine. This will often be 0. This function accepts
// the object that the mine is attached to (Door, Placeable, or Trigger)
// and will determine which one it actually is at runtime.
int GetOwnerDemolitionsSkill( object oObject );

// RWT-OEI 01/29/04
// 794: Disables or Enables the Orient On Click behavior in creatures. If
//      disabled, they will not orient to face the player when clicked on
//      for dialogue. The default behavior is TRUE.
void SetOrientOnClick( object oCreature = OBJECT_SELF, int nState = TRUE );

// DJS-OEI 1/29/2004
// 795: Gets the PC's influence on the alignment of a CNPC.
// Parameters:
// nNPC - NPC_* constant identifying the CNPC we're interested in.
// If this character is not an available party member, the return
// value with be 0. If the character is in the party, but has an
// attitude of Ambivalent, this will be -1.
int GetInfluence( int nNPC );

// DJS-OEI 1/29/2004
// 796: Sets the PC's influence on the alignment of a CNPC.
// Parameters:
// nNPC - NPC_* constant identifying the CNPC we're interested in.
// If this character is not an available party member, nothing
// will happen.
// nInfluence - The new value for the influence on this CNPC.
void SetInfluence( int nNPC, int nInfluence );

// DJS-OEI 1/29/2004
// 797: Modifies the PC's influence on the alignment of a CNPC.
// Parameters:
// nNPC - NPC_* constant identifying the CNPC we're interested in.
// If this character is not an available party member, nothing
// will happen.
// nModifier - The modifier to the current influence on this CNPC.
// This may be a negative value to reduce the influence.
void ModifyInfluence( int nNPC, int nModifier );

// FAK - OEI 2/3/04
// 798: returns the racial sub-type of the oTarget object
int GetRacialSubType(object oTarget);

// DJS-OEI 2/3/2004
// 799: Increases the value of the given global number by the given amount.
// This function only works with Number type globals, not booleans. It
// will fail with a warning if the final amount is greater than the max
// of 127.
void IncrementGlobalNumber( string sIdentifier, int nAmount );

// DJS-OEI 2/3/2004
// 800: Decreases the value of the given global number by the given amount.
// This function only works with Number type globals, not booleans. It
// will fail with a warning if the final amount is less than the minimum
// of -128.
void DecrementGlobalNumber( string sIdentifier, int nAmount );

// RWT-OEI 02/06/04
// 801: SetBonusForcePoints - This sets the number of bonus force points
//      that will always be added to that character's total calculated
//      force points.
void SetBonusForcePoints( object oCreature, int nBonusFP );

// RWT-OEI 02/06/04
// 802: AddBonusForcePoints - This adds nBonusFP to the current total
//      bonus that the player has. The Bonus Force Points are a pool
//      of force points that will always be added after the player's
//      total force points are calculated (based on level, force dice,
//      etc.)
void AddBonusForcePoints( object oCreature, int nBonusFP );

// RWT-OEI 02/06/04
// 803: GetBonusForcePoints - This returns the total number of bonus
//      force points a player has. Bonus Force Points are a pool of
//      points that are always added to a player's Max Force Points.
// ST: Please explain how a function returning VOID could return a
//     numerical value? Hope it works changing the return type...
// void GetBonusForcePoints( object oCreature );
int GetBonusForcePoints( object oCreature );

// FAK - OEI 2/11/04
// 804: SWMG_SetJumpSpeed -- the sets the 'jump speed' for the swoop
//      bike races. Gravity will act upon this velocity.
void SWMG_SetJumpSpeed(float fSpeed);

// PC CODE MERGER
// 805. IsMoviePlaying--dummy func so we can compile
int IsMoviePlaying();

// 806 QueueMovie
void QueueMovie(string sMovie, int nSkippable = TRUE);

// 807
void PlayMovieQueue(int nAllowSkips = TRUE);

// 808
void YavinHackDoorClose(object oCreature);

// 809
// new function for droid confusion so inherint mind immunity can be
// avoided.
effect EffectDroidConfused();
// END PC CODE MERGER

// 810
// DJS-OEI 3/8/2004
// Determines if the given creature is in Stealth mode or not.
// 0 = Creature is not stealthed.
// 1 = Creature is stealthed.
// This function will return 0 for any non-creature.
int IsStealthed( object oCreature );

// 811
// DJS-OEI 3/12/2004
// Determines if the given creature is using any Meditation Tree
// Force Power.
// 0 = Creature is not meditating.
// 1 = Creature is meditating.
// This function will return 0 for any non-creature.
int IsMeditating( object oCreature );

// 812
// DJS-OEI 3/16/2004
// Determines if the given creature is using the Total Defense
// Stance.
// 0 = Creature is not in Total Defense.
// 1 = Creature is in Total Defense.
// This function will return 0 for any non-creature.
int IsInTotalDefense( object oCreature );

// 813
// RWT-OEI 03/19/04
// Stores a Heal Target for the Healer AI script. Should probably
// not be used outside of the Healer AI script.
void SetHealTarget( object oidHealer, object oidTarget );

// 814
// RWT-OEI 03/19/04
// Retrieves the Heal Target for the Healer AI script. Should probably
// not be used outside of the Healer AI script.
object GetHealTarget( object oidHealer );

// 815
// RWT-OEI 03/23/04
// Returns a vector containing a random destination that the
// given creature can walk to that's within the range of the
// passed parameter.
vector GetRandomDestination( object oCreature, int rangeLimit );

// 816
// DJS-OEI 3/25/2004
// Returns whether the given creature is currently in the
// requested Lightsaber/Consular Form and can make use of
// its benefits. This function will perform trumping checks
// and lightsaber-wielding checks for those Forms that require
// them.
int IsFormActive( object oCreature, int nFormID );

// 817
// DJS-OEI 3/28/2004
// Returns the Form Mask of the requested spell. This is used
// to determine if a spell is affected by various Forms, usually
// Consular forms that modify duration/range.
int GetSpellFormMask( int nSpellID );

// 818
// DJS-OEI 3/29/2004
// Return the base number of Force Points required to cast
// the given spell. This does not take into account modifiers
// of any kind.
int GetSpellBaseForcePointCost( int nSpellID );

// 819
// RWT-OEI 04/05/04
// Setting this to TRUE makes it so that the Stealth status is
// left on characters even when entering cutscenes. By default,
// stealth is removed from anyone taking part in a cutscene.
// ALWAYS set this back to FALSE on every End Dialog node in
// the cutscene you wanted to stay stealthed in. This isn't a
// flag that should be left on indefinitely. In fact, it isn't
// saved, so needs to be set/unset on a case by case basis.
void SetKeepStealthInDialog( int nStealthState );

// 820
// RWT-OEI 04/06/04
// This returns TRUE or FALSE if there is a clear line of sight from
// the source vector to the target vector. This is used in the AI to
// help the creatures using ranged weapons find better places to shoot
// when the player moves out of sight.
int HasLineOfSight( vector vSource, vector vTarget, object oSource = OBJECT_INVALID, object oTarget = OBJECT_INVALID );

// 821
// FAK - OEI 5/3/04
// ShowDemoScreen, displays a texture, timeout, string and xy for string
int ShowDemoScreen(string sTexture, int nTimeout, int nDisplayString, int nDisplayX, int nDisplayY );

// 822
// DJS-OEI 5/4/2004
// Forces a Heartbeat on the given creature. THIS ONLY WORKS FOR CREATURES
// AT THE MOMENT. This heartbeat should force perception updates to occur.
void ForceHeartbeat( object oCreature );

// 823
// DJS-OEI 5/5/2004
// Creates a Force Sight effect.
effect EffectForceSight();

// 824
// FAK - OEI 5/7/04
// gets the walk state of the creature: 0 walk or standing, 1 is running
int IsRunning( object oCreature );

// 825
// FAK - OEI 5/24/04
// applies a velocity to the player object
void SWMG_PlayerApplyForce(vector vForce);

// 826
// DJS-OEI 6/12/2004
// This function allows a script to set the conditions which constitute
// a combat forfeit by a member of the player's party. This is typically
// used to handle Battle Circle behavior or other challenge-based combats.
// nForfeitFlags: This is an OR'ed together series of FORFEIT_* defines.
void SetForfeitConditions( int nForfeitFlags );

// 827
// DJS-OEI 6/12/2004
// This function returns the last FORFEIT_* condition that the player
// has violated.
int GetLastForfeitViolation();

// 828
// AWD-OEI 6/21/2004
// This function does not return a value.
// This function modifies the BASE value of the REFLEX saving throw for aObject
void ModifyReflexSavingThrowBase(object aObject, int aModValue);

// 829
// AWD-OEI 6/21/2004
// This function does not return a value.
// This function modifies the BASE value of the FORTITUDE saving throw for aObject
void ModifyFortitudeSavingThrowBase(object aObject, int aModValue);

// 830
// AWD-OEI 6/21/2004
// This function does not return a value.
// This function modifies the BASE value of the WILL saving throw for aObject
void ModifyWillSavingThrowBase(object aObject, int aModValue);

// DJS-OEI 6/21/2004
// 831
// This function will return the one CExoString parameter
// allowed for the currently running script.
string GetScriptStringParameter();

// 832
// AWD-OEI 6/29/2004
// This function returns the personal space value of an object
float GetObjectPersonalSpace(object aObject);

// 833
// AWD-OEI 7/06/2004
// This function adjusts a creatures stats.
// oObject is the creature that will have it's attribute adjusted
// The following constants are acceptable for the nAttribute parameter:
// ABILITY_STRENGTH
// ABILITY_DEXTERITY
// ABILITY_CONSTITUTION
// ABILITY_INTELLIGENCE
// ABILITY_WISDOM
// ABILITY_CHARISMA
// nAmount is the integer vlaue to adjust the stat by (negative values will work).
void AdjustCreatureAttributes(object oObject, int nAttribute, int nAmount);

// 834
// AWD-OEI 7/08/2004
// This function raises a creature's priority level.
void SetCreatureAILevel(object oObject, int nPriority);

// 835
// AWD-OEI 7/08/2004
// This function raises a creature's priority level.
void ResetCreatureAILevel(object oObject);

// 836
// RWT-OEI 07/17/04
// This function adds a Puppet to the Puppet Table by
// template.
// Returns 1 if successful, 0 if there was an error
// This does not spawn the puppet or anything. It just
// adds it to the party table and makes it available for
// use down the line. Exactly like AddAvailableNPCByTemplate
int AddAvailablePUPByTemplate( int nPUP, string sTemplate );

// 837
// RWT-OEI 07/17/04
// This function adds a Puppet to the Puppet Table by
// creature ID
// Returns 1 if successful, 0 if there was an error
// This does not spawn the puppet or anything. It just
// adds it to the party table and makes it available for
// use down the line. Exactly like AddAvailableNPCByTemplate
int AddAvailablePUPByObject( int nPUP, object oPuppet );

// 838
// RWT-OEI 07/17/04
// This function assigns a PUPPET constant to a
// Party NPC.  The party NPC -MUST- be in the game
// before calling this.
// Both the PUP and the NPC have
// to be available in their respective tables
// Returns 1 if successful, 0 if there was an error
int AssignPUP( int nPUP, int nNPC );

// 839
// RWT-OEI 07/17/04
// This function spawns a Party PUPPET.
// This must be used whenever you want a copy
// of the puppet around to manipulate in the game
// since the puppet is stored in the party table
// just like NPCs are.  Once a puppet is assigned
// to a party NPC (see AssignPUP), it will spawn
// or disappear whenever its owner joins or leaves
// the party.
// This does not add it to the party automatically,
// just like SpawnNPC doesn't. You must call AddPuppet()
// to actually add it to the party
object SpawnAvailablePUP( int nPUP, location lLocation );

// 840
// RWT-OEI 07/18/04
// This adds an existing puppet object to the party. The
// puppet object must already exist via SpawnAvailablePUP
// and must already be available via AddAvailablePUP*
// functions.
int AddPartyPuppet(int nPUP, object oidCreature);

// 841
// RWT-OEI 07/19/04
// This returns the object ID of the puppet's owner.
// The Puppet's owner must exist and must be in the party
// in order to be found.
// Returns invalid object Id if the owner cannot be found.
object GetPUPOwner(object oPUP = OBJECT_SELF);

// 842
// RWT-OEI 07/19/04
// Returns 1 if the creature is a Puppet in the party.
// Otherwise returns 0. It is possible for a 'party puppet'
// to exist without actually being in the party table.
// such as when SpawnAvailablePUP is used without subsequently
// using AddPartyPuppet to add the newly spawned puppet to
// the party table. A puppet in that in-between state would
// return 0 from this function
int GetIsPuppet(object oPUP = OBJECT_SELF );

// 843
// RWT-OEI 07/20/04
// Similiar to ActionFollowLeader() except the creature
// follows its owner
//nRange is how close it should follow. Note that once this
//action is queued, it will be the only thing this creature
//does until a ClearAllActions() is used.
void ActionFollowOwner(float fRange = 2.5);

// 844
// RWT-OEI 07/21/04
// Returns TRUE if the object ID passed is the character
// that the player is actively controlling at that point.
// Note that this function is *NOT* able to return correct
// information during Area Loading since the player is not
// actively controlling anyone at that point.
int GetIsPartyLeader(object oCharacter = OBJECT_SELF);

// 845
// RWT-OEI 07/21/04
// Returns the object ID of the character that the player
// is actively controlling. This is the 'Party Leader'.
// Returns object Invalid on error
// Note that this function is *NOT* able to return correct
// information during Area Loading since the player is not
// actively controlling anyone at that point.
object GetPartyLeader();

// 846
// JAB-OEI 07/22/04
// Will remove the CNPC from the 3 person party, and remove
// him/her from the area, effectively sending the CNPC back
// to the base. The CNPC data is still stored in the
// party table, and calling this function will not destroy
// the CNPC in any way.
// Returns TRUE for success.
int RemoveNPCFromPartyToBase(int nNPC);

// 847
// AWD-OEI 7/22/2004
// This causes a creature to flourish with it's currently equipped weapon.
void CreatureFlourishWeapon(object oObject);

// 848
// Create a Mind Trick effect
effect EffectMindTrick();

// 849
// Create a Faction Modifier effect.
effect EffectFactionModifier( int nNewFaction );

// 850
// ChangeObjectAppearance
// oObjectToChange = Object to change appearance of
// nAppearance = appearance to change to (from appearance.2da)
void ChangeObjectAppearance( object oObjectToChange, int nAppearance );

// 851
// GetIsXBox
// Returns TRUE if this script is being executed on the X-Box. Returns FALSE
// if this is the PC build.
int GetIsXBox();

// 852
// Create a Droid Scramble effect
effect EffectDroidScramble();

// 853
// ActionSwitchWeapons
// Forces the creature to switch between Config 1 and Config 2
// of their equipment. Does not work in dialogs. Works with
// AssignCommand()
void ActionSwitchWeapons();

// 854
// DJS-OEI 8/29/2004
// PlayOverlayAnimation
// This function will play an overlay animation on a character
// even if the character is moving. This does not cause an action
// to be placed on the queue. The animation passed in must be
// designated as an overlay in Animations.2DA.
void PlayOverlayAnimation( object oTarget, int nAnimation );

// 855
// RWT-OEI 08/30/04
// UnlockAllSongs
// Calling this will set all songs as having been unlocked.
// It is INTENDED to be used in the end-game scripts to unlock
// any end-game songs as well as the KotOR1 sound track.
void UnlockAllSongs();

// 856
// RWT-OEI 08/31/04
// Passing TRUE into this function turns off the player's maps.
// Passing FALSE into this function re-enables them. This change
// is permanent once called, so it is important that there *is*
// a matching call to DisableMap(FALSE) somewhere or else the
// player is stuck without a map indefinitely.
void DisableMap(int nFlag = FALSE);

// 857
// RWT-OEI 08/31/04
// This function schedules a mine to play its DETONATION
// animation once it is destroyed. Note that this detonates
// the mine immediately but has nothing to do with causing
// the mine to do any damage to anything around it. To
// get the mine to damage things around it when it detonates
// do:
// AssignCommand(<mine>,ExecuteScript( "k_trp_generic",<mine>));
// right before you call DetonateMine(). By my experience so far
// you don't need any kind of delay between the two.
void DetonateMine(object oMine);

// 858
// RWT-OEI 09/06/04
// This function turns off the innate health regeneration that all party
// members have. The health regen will *stay* off until it is turned back
// on by passing FALSE to this function.
void DisableHealthRegen(int nFlag = FALSE);

// 859
// DJS-OEI 9/7/2004
// This function sets the current Jedi Form on the given creature. This
// call will do nothing if the target does not know the Form itself.
void SetCurrentForm( object oCreature, int nFormID );

// 860
// RWT-OEI 09/09/04
// This will disable or enable area transit
void SetDisableTransit(int nFlag = FALSE);

// 861
//RWT-OEI 09/09/04
// This will set the specific input class.
// The valid options are:
// 0 - Normal PC control
// 1 - Mini game control
// 2 - GUI control
// 3 - Dialog Control
// 4 - Freelook control
void SetInputClass(int nClass);

// 862
//RWT-OEI 09/15/04
// This script allows an object to recieve updates even if it is outside
//the normal range limit of 250.0f meters away from the player. This should
//ONLY be used for cutscenes that involve objects that are more than 250
//meters away from the player. It needs to be used on a object by object
//basis.
//This flag should *always* be set to false once the cutscene it is needed
//for is over, or else the game will spend CPU time updating the object
//when it doesn't need to.
//For questions on use of this function, or what its purpose is, check
//with me.
void SetForceAlwaysUpdate(object oObject, int nFlag);

//863
//RWT-OEI 09/15/04
//This function enables or disables rain
void EnableRain( int nFlag );

//864
//RWT-OEI 09/27/04
//This function displays the generic Message Box with the strref
//message in it
//sIcon is the resref for an icon you would like to display.
void DisplayMessageBox(int nStrRef, string sIcon = "");

//865
//RWT-OEI 09/28/04
//This function displays a datapad popup. Just pass it the
//object ID of a datapad.
void DisplayDatapad(object oDatapad);

// 866
// CTJ-OEI 09-29-04
// Removes the heartbeat script on the placeable.  Useful for
// placeables whose contents get populated in the heartbeat
// script and then the heartbeat no longer needs to be called.
void RemoveHeartbeat(object oPlaceable);


//867
// JF-OEI 10-07-2004
// Remove an effect by ID
void RemoveEffectByID( object oCreature, int nEffectID );

//868
// RWT-OEI 10/07/04
// This script removes an effect by an identical match
// based on:
// Must have matching EffectID types.
// Must have the same value in Integer(0)
// Must have the same value in Integer(1)
// I'm specifically using this function for Mandalore's implant swapping
// script and it will probably not be useful for anyone else. If you're
// not sure what this script function does, see me before using it.
void RemoveEffectByExactMatch( object oCreature, effect eEffect);

// 869
// DJS-OEI 10/9/2004
// This function adjusts a creature's skills.
// oObject is the creature that will have its skill adjusted
// The following constants are acceptable for the nSkill parameter:
// SKILL_COMPUTER_USE
// SKILL_DEMOLITIONS
// SKILL_STEALTH
// SKILL_AWARENESS
// SKILL_PERSUADE
// SKILL_REPAIR
// SKILL_SECURITY
// SKILL_TREAT_INJURY
// nAmount is the integer value to adjust the stat by (negative values will work).
void AdjustCreatureSkills(object oObject, int nSkill, int nAmount);

// 870
// DJS-OEI 10/10/2004
// This function returns the base Skill Rank for the requested
// skill. It does not include modifiers from effects/items.
// The following constants are acceptable for the nSkill parameter:
// SKILL_COMPUTER_USE
// SKILL_DEMOLITIONS
// SKILL_STEALTH
// SKILL_AWARENESS
// SKILL_PERSUADE
// SKILL_REPAIR
// SKILL_SECURITY
// SKILL_TREAT_INJURY
// oObject is the creature that will have its skill base returned.
int GetSkillRankBase(int nSkill, object oObject=OBJECT_SELF);

// 871
// DJS-OEI 10/15/2004
// This function will allow the caller to modify the rendering behavior
// of the target object.
// oObject - The object to change rendering state on.
// bEnable - If 0, the object will stop rendering. Else, the object will render.
void EnableRendering( object oObject, int bEnable );

// 872
// RWT-OEI 10/19/04
// This function returns TRUE if the creature has actions in its
// Combat Action queue.
int GetCombatActionsPending(object oCreature);

// 873
// RWT-OEI 10/26/04
// This function saves the party member at that index with the object
// that is passed in.
void SaveNPCByObject( int nNPC, object oidCharacter);

// 874
// RWT-OEI 10/26/04
// This function saves the party puppet at that index with the object
// that is passed in. For the Remote, just use '0' for nPUP
void SavePUPByObject( int nPUP, object oidPuppet );

// 875
// RWT-OEI 10/29/04
// Returns TRUE if the object passed in is the character that the player
// made at the start of the game
int GetIsPlayerMadeCharacter(object oidCharacter);

// 876
// RWT-OEI 11/12/04
// This repopulates the NPCObject table in CSWPartyTable. Do not use this
// unless you understand exactly what it is doing.
void RebuildPartyTable();
