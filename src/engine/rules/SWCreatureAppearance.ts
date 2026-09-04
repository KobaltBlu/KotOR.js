import { TwoDAObject } from "@/resource/TwoDAObject";
import { Utility } from "@/utility/Utility";

/** Retail GetBTypeModelAndTextureResRef clamp: K1 A–J (10), K2 A–N (14). */
export const APPEARANCE_BODY_MAX_K1 = 0xa;
export const APPEARANCE_BODY_MAX_K2 = 0xe;

/** Retail SetAppearanceAlignment: evil body tex when GoodEvil &lt; 41 (0x29). */
export const APPEARANCE_EVIL_BODY_ALIGN_MAX = 0x29;

/**
 * SWCreatureAppearance class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file SWCreatureAppearance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWCreatureAppearance {
  id: number = -1;
  label: string = '';
  string_ref: number = -1;
  race: string = '';
  walkdist: number = 1.7;
  rundist: number = 5.4;
  /** Anim pacing distance — retail default 2 when zero. */
  driveanimwalk: number = 2;
  /**
   * Anim pacing distance — retail default 4 when zero.
   * K1: appearance.2da DriveAnimRun. TSL: Load2DArrays_Appearance /
   * CreateBodyAppearance cache DriveAnimRun_PC into this same slot.
   */
  driveanimrun: number = 4;
  /**
   * Raw DriveAnimRun_PC cell (TSL). Mirrored into driveanimrun by From2DA so
   * CreateBodyAppearance-equivalent paths share one run distance.
   */
  driveanimrun_pc: number = 4;
  /** TSL DriveAnimRun_XBOX — not cached by PC Load2DArrays_Appearance. */
  driveanimrun_xbox: number = 4;
  racetex: string = '';
  modeltype: 'B'|'F'|'S'|'L' = 'B';
  normalhead: number = -1;
  backuphead: number = -1;

  modela: string = '';
  texa: string = '';
  texaevil: string = '';

  modelb: string = '';
  texb: string = '';
  texbevil: string = ''; //TSL

  modelc: string = '';
  texc: string = '';

  modeld: string = '';
  texd: string = '';

  modele: string = '';
  texe: string = '';

  modelf: string = '';
  texf: string = '';

  modelg: string = '';
  texg: string = '';

  modelh: string = '';
  texh: string = '';

  modeli: string = '';
  texi: string = '';
  texievil: string = ''; //TSL

  modelj: string = '';
  texj: string = '';

  modelk: string = ''; //TSL
  texk: string = ''; //TSL

  modell: string = ''; //TSL
  texl: string = ''; //TSL
  texlevil: string = ''; //TSL

  modelm: string = ''; //TSL
  texm: string = ''; //TSL

  modeln: string = ''; //TSL
  texn: string = ''; //TSL
  /**
   * Body-N evil tex prefix. Retail SetAppearanceAlignment looks up "TEXMEVIL"
   * for body index 0xE, but appearance.2da's column is texnevil — From2DA reads
   * texnevil (and texmevil as a mod alias) into this field.
   */
  texmevil: string = ''; //TSL (2DA: texnevil)

  skin: string = '';
  headtexve: string = '';
  headtexe: string = '';
  headtexg: string = '';
  headtexvg: string = '';
  envmap: string = '';
  bloodcolr: 'R'|'S'|'G' = 'R';

  weaponscale: number = 1.0;
  wing_tail_scale: number = 1.0;
  moverate: 'PLAYER'|'NOMOVE'|'VSLOW'|'SLOW'|'NORM'|'FAST'|'VFAST'|'DEFAULT'|'DFAST'|'HUGE'|'GIANT'|'WEE_FOLK' = 'NORM';
  /** Retail fallback when appearance zero / missing — GetAcceleration uses 25. */
  driveaccl: number = 25;
  /** Retail GetMaxSpeed null-creature fallback — 6. */
  drivemaxspeed: number = 6;
  hitradius: number = 0.25;
  perspace: number = 0.35;
  creperspace: number = 0.4;
  cameraspace: number = 0;
  height: number = 0;
  targetheight: 'l' = 'l';
  abortonparry: boolean = false;
  racialtype: number = 20;
  haslegs: boolean = true;
  hasarms: boolean = true;
  portrait: string = 'po_default';
  footstepsound: string = '';
  footstepvolume: number = 1;
  sizecategory: number = 3;

  armor_sound: string = '';
  combat_sound: string = '';
  helmet_scale_m: number = 1.0;
  helmet_scale_f: number = 1.0;
  perceptiondist: number = 9.0;
  footsteptype: number = 0;
  soundapptype: number = 0;
  headtrack: number = 0;
  head_arc_h: number = 0;
  head_arc_v: number = 0;
  headbone: string = '';
  hitdist: number = 1;
  prefatckdist: number = 0.5;
  groundtilt: number = 0;
  body_bag: number = -1;
  freelookeffect: number = -1;
  cameraheightoffset: number = -1;
  /** Retail appearance.2da DeathVFX — visualeffects.2da row. */
  deathvfx: number = -1;
  /** Retail DeathVFXNode — model node name (default "impact"). */
  deathvfxnode: string = '';
  fadedelayondeath: number = -1;
  destroyobjectdelay: number = -1;
  disableinjuredanim: boolean = false;
  equipslotslocked: number = -1;

  /** Retail body variation clamp: K1 → 10 (J), K2 → 14 (N). */
  static maxBodyVariationIndex(isTSL: boolean): number {
    return isTSL ? APPEARANCE_BODY_MAX_K2 : APPEARANCE_BODY_MAX_K1;
  }

  /**
   * Parse armor body letter / byte into retail 1..N index (A=1).
   * Empty / zero → 1 (ModelA), matching GetBTypeModelAndTextureResRef.
   */
  static clampBodyVariationIndex(raw: string | number, maxBodyIndex: number): number {
    let index = 0;
    if(typeof raw === 'number' && Number.isFinite(raw)){
      index = raw | 0;
    }else if(typeof raw === 'string' && raw.length){
      const c = raw.replace(/\0[\s\S]*$/g, '').trim().charAt(0).toUpperCase();
      if(c >= 'A' && c <= 'Z'){
        index = c.charCodeAt(0) - 64;
      }
    }
    if(index < 1) index = 1;
    if(index > maxBodyIndex) index = maxBodyIndex;
    return index;
  }

  private static cleanResRef(value: string): string {
    return (value || '').replace(/\0[\s\S]*$/g, '').trim();
  }

  private getModelTexForIndex(index: number): { model: string, texture: string } {
    const letter = String.fromCharCode(0x40 + index).toLowerCase(); // a..n
    const model = SWCreatureAppearance.cleanResRef((this as any)[`model${letter}`] as string);
    const texture = SWCreatureAppearance.cleanResRef((this as any)[`tex${letter}`] as string);
    return { model, texture };
  }

  /**
   * Retail SetAppearanceAlignment TEX*Evil prefix for the given body letter index.
   * K1 only has TEXAEVIL (no body variation). K2: B=2, I=9, L=0xC, N=0xE →
   * retail string "TEXMEVIL" / 2DA column texnevil (stored as texmevil).
   */
  getEvilBodyTexPrefix(bodyIndex: number, hasBodyVariation: boolean): string {
    if(!hasBodyVariation){
      return SWCreatureAppearance.cleanResRef(this.texaevil);
    }
    switch(bodyIndex){
      case 2: return SWCreatureAppearance.cleanResRef(this.texbevil);
      case 9: return SWCreatureAppearance.cleanResRef(this.texievil);
      case 0xc: return SWCreatureAppearance.cleanResRef(this.texlevil);
      case 0xe: return SWCreatureAppearance.cleanResRef(this.texmevil); // body N
      default: return '';
    }
  }

  /**
   * Retail GetBTypeModelAndTextureResRef + SetAppearanceAlignment body path.
   * @param bodyVariation Armor bodyVar letter (or '' for ModelA).
   * @param textureVariation TextureVar (min 1).
   * @param maxBodyIndex K1=10 / K2=14 clamp.
   * @param goodEvil Creature GoodEvil for TEX*Evil (retail &lt; 41).
   * @param hasBodyVariation True when armor supplies a body letter (use_body_variation_).
   */
  getBodyModelInfo(
    bodyVariation: string = '',
    textureVariation: number = 1,
    maxBodyIndex: number = APPEARANCE_BODY_MAX_K2,
    goodEvil: number = 50,
    hasBodyVariation: boolean = false,
  ): { model: string, texture: string } {
    textureVariation = Math.max(1, textureVariation | 0);
    const defaultModel = SWCreatureAppearance.cleanResRef(this.modela);
    const defaultTexture = SWCreatureAppearance.cleanResRef(this.texa);

    if(this.modeltype != 'B'){
      return {
        model: SWCreatureAppearance.cleanResRef(this.race).toLowerCase(),
        texture: SWCreatureAppearance.cleanResRef(this.racetex).toLowerCase(),
      };
    }

    const useVar = hasBodyVariation || !!(bodyVariation && bodyVariation.length);
    const bodyIndex = SWCreatureAppearance.clampBodyVariationIndex(
      useVar ? bodyVariation : 1,
      maxBodyIndex,
    );
    const { model: slotModel, texture: slotTex } = this.getModelTexForIndex(bodyIndex);
    // Retail GetBTypeModelAndTextureResRef: empty TEX* → empty resref (MDL default),
    // not ModelA's TEXA. Falling back to TEXA is why Atton/Mira party bodies got PMBAMC/PFBAMC.
    const bodyModel = slotModel || defaultModel;
    let bodyTexture = slotTex;
    if(!slotModel && !slotTex){
      bodyTexture = defaultTexture;
    }

    // Retail SetAppearanceAlignment: evil body tex + "01" when GoodEvil < 0x29
    if(goodEvil < APPEARANCE_EVIL_BODY_ALIGN_MAX){
      const evilPrefix = this.getEvilBodyTexPrefix(bodyIndex, useVar);
      if(evilPrefix){
        bodyTexture = evilPrefix + '01';
        return {
          model: bodyModel.toLowerCase(),
          texture: bodyTexture.toLowerCase(),
        };
      }
    }

    if(bodyTexture){
      bodyTexture += Utility.PadInt(textureVariation, 2);
    }

    return {
      model: bodyModel.toLowerCase(),
      texture: bodyTexture.toLowerCase(),
    };
  }

  static From2DA (row: any = {}): SWCreatureAppearance {
    const appearance = new SWCreatureAppearance();

    appearance.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      appearance.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    if(row.hasOwnProperty('string_ref'))
      appearance.string_ref = TwoDAObject.normalizeValue(row.string_ref, 'number', -1);
    if(row.hasOwnProperty('race'))
      appearance.race = TwoDAObject.normalizeValue(row.race, 'string', '');
    if(row.hasOwnProperty('walkdist'))
      appearance.walkdist = TwoDAObject.normalizeValue(row.walkdist, 'number', 1.7);
    if(row.hasOwnProperty('rundist'))
      appearance.rundist = TwoDAObject.normalizeValue(row.rundist, 'number', 5.4);
    if(row.hasOwnProperty('driveanimwalk')){
      appearance.driveanimwalk = TwoDAObject.normalizeValue(row.driveanimwalk, 'number', 2);
      if(!(appearance.driveanimwalk > 0)) appearance.driveanimwalk = 2;
    }
    // K1: DriveAnimRun. TSL Load2DArrays_Appearance indexes DriveAnimRun_PC into
    // the same COL2DA_APPEARANCETABLE_DRIVEANIMRUN slot CreateBodyAppearance reads.
    let loadedDriveAnimRun = false;
    if(row.hasOwnProperty('driveanimrun')){
      appearance.driveanimrun = TwoDAObject.normalizeValue(row.driveanimrun, 'number', 4);
      if(!(appearance.driveanimrun > 0)) appearance.driveanimrun = 4;
      loadedDriveAnimRun = true;
    }
    if(row.hasOwnProperty('driveanimrun_pc')){
      appearance.driveanimrun_pc = TwoDAObject.normalizeValue(row.driveanimrun_pc, 'number', 4);
      if(!(appearance.driveanimrun_pc > 0)) appearance.driveanimrun_pc = 4;
      if(!loadedDriveAnimRun){
        appearance.driveanimrun = appearance.driveanimrun_pc;
      }
    }
    if(row.hasOwnProperty('driveanimrun_xbox')){
      appearance.driveanimrun_xbox = TwoDAObject.normalizeValue(row.driveanimrun_xbox, 'number', 4);
      if(!(appearance.driveanimrun_xbox > 0)) appearance.driveanimrun_xbox = 4;
    }
    if(row.hasOwnProperty('racetex'))
      appearance.racetex = TwoDAObject.normalizeValue(row.racetex, 'string', '');
    if(row.hasOwnProperty('modeltype'))
      appearance.modeltype = TwoDAObject.normalizeValue(row.modeltype, 'string', 'B');
    if(row.hasOwnProperty('normalhead'))
      appearance.normalhead = TwoDAObject.normalizeValue(row.normalhead, 'number', -1);
    if(row.hasOwnProperty('backuphead'))
      appearance.backuphead = TwoDAObject.normalizeValue(row.backuphead, 'number', -1);

    if(row.hasOwnProperty('modela'))
      appearance.modela = TwoDAObject.normalizeValue(row.modela, 'string', '');
    if(row.hasOwnProperty('texa'))
      appearance.texa = TwoDAObject.normalizeValue(row.texa, 'string', '');
    if(row.hasOwnProperty('texaevil'))
      appearance.texaevil = TwoDAObject.normalizeValue(row.texaevil, 'string', '');

    if(row.hasOwnProperty('modelb'))
      appearance.modelb = TwoDAObject.normalizeValue(row.modelb, 'string', '');
    if(row.hasOwnProperty('texb'))
      appearance.texb = TwoDAObject.normalizeValue(row.texb, 'string', '');
    if(row.hasOwnProperty('texbevil'))
      appearance.texbevil = TwoDAObject.normalizeValue(row.texbevil, 'string', '');

    if(row.hasOwnProperty('modelc'))
      appearance.modelc = TwoDAObject.normalizeValue(row.modelc, 'string', '');
    if(row.hasOwnProperty('texc'))
      appearance.texc = TwoDAObject.normalizeValue(row.texc, 'string', '');

    if(row.hasOwnProperty('modeld'))
      appearance.modeld = TwoDAObject.normalizeValue(row.modeld, 'string', '');
    if(row.hasOwnProperty('texd'))
      appearance.texd = TwoDAObject.normalizeValue(row.texd, 'string', '');

    if(row.hasOwnProperty('modele'))
      appearance.modele = TwoDAObject.normalizeValue(row.modele, 'string', '');
    if(row.hasOwnProperty('texe'))
      appearance.texe = TwoDAObject.normalizeValue(row.texe, 'string', '');

    if(row.hasOwnProperty('modelf'))
      appearance.modelf = TwoDAObject.normalizeValue(row.modelf, 'string', '');
    if(row.hasOwnProperty('texf'))
      appearance.texf = TwoDAObject.normalizeValue(row.texf, 'string', '');

    if(row.hasOwnProperty('modelg'))
      appearance.modelg = TwoDAObject.normalizeValue(row.modelg, 'string', '');
    if(row.hasOwnProperty('texg'))
      appearance.texg = TwoDAObject.normalizeValue(row.texg, 'string', '');

    if(row.hasOwnProperty('modelh'))
      appearance.modelh = TwoDAObject.normalizeValue(row.modelh, 'string', '');
    if(row.hasOwnProperty('texh'))
      appearance.texh = TwoDAObject.normalizeValue(row.texh, 'string', '');

    if(row.hasOwnProperty('modeli'))
      appearance.modeli = TwoDAObject.normalizeValue(row.modeli, 'string', '');
    if(row.hasOwnProperty('texi'))
      appearance.texi = TwoDAObject.normalizeValue(row.texi, 'string', '');
    if(row.hasOwnProperty('texievil'))
      appearance.texievil = TwoDAObject.normalizeValue(row.texievil, 'string', '');

    if(row.hasOwnProperty('modelj'))
      appearance.modelj = TwoDAObject.normalizeValue(row.modelj, 'string', '');
    if(row.hasOwnProperty('texj'))
      appearance.texj = TwoDAObject.normalizeValue(row.texj, 'string', '');

    if(row.hasOwnProperty('modelk'))
      appearance.modelk = TwoDAObject.normalizeValue(row.modelk, 'string', '');
    if(row.hasOwnProperty('texk'))
      appearance.texk = TwoDAObject.normalizeValue(row.texk, 'string', '');

    if(row.hasOwnProperty('modell'))
      appearance.modell = TwoDAObject.normalizeValue(row.modell, 'string', '');
    if(row.hasOwnProperty('texl'))
      appearance.texl = TwoDAObject.normalizeValue(row.texl, 'string', '');
    if(row.hasOwnProperty('texlevil'))
      appearance.texlevil = TwoDAObject.normalizeValue(row.texlevil, 'string', '');

    if(row.hasOwnProperty('modelm'))
      appearance.modelm = TwoDAObject.normalizeValue(row.modelm, 'string', '');
    if(row.hasOwnProperty('texm'))
      appearance.texm = TwoDAObject.normalizeValue(row.texm, 'string', '');

    if(row.hasOwnProperty('modeln'))
      appearance.modeln = TwoDAObject.normalizeValue(row.modeln, 'string', '');
    if(row.hasOwnProperty('texn'))
      appearance.texn = TwoDAObject.normalizeValue(row.texn, 'string', '');
    // Retail SetAppearanceAlignment string is "TEXMEVIL" for body N; 2DA column is texnevil.
    if(row.hasOwnProperty('texnevil'))
      appearance.texmevil = TwoDAObject.normalizeValue(row.texnevil, 'string', '');
    else if(row.hasOwnProperty('texmevil'))
      appearance.texmevil = TwoDAObject.normalizeValue(row.texmevil, 'string', '');

    if(row.hasOwnProperty('skin'))
      appearance.skin = TwoDAObject.normalizeValue(row.skin, 'string', '');
    if(row.hasOwnProperty('headtexve'))
      appearance.headtexve = TwoDAObject.normalizeValue(row.headtexve, 'string', '');
    if(row.hasOwnProperty('headtexe'))
      appearance.headtexe = TwoDAObject.normalizeValue(row.headtexe, 'string', '');
    if(row.hasOwnProperty('headtexg'))
      appearance.headtexg = TwoDAObject.normalizeValue(row.headtexg, 'string', '');
    if(row.hasOwnProperty('headtexvg'))
      appearance.headtexvg = TwoDAObject.normalizeValue(row.headtexvg, 'string', '');
    if(row.hasOwnProperty('envmap'))
      appearance.envmap = TwoDAObject.normalizeValue(row.envmap, 'string', '');
    if(row.hasOwnProperty('bloodcolr'))
      appearance.bloodcolr = TwoDAObject.normalizeValue(row.bloodcolr, 'string', 'R');

    if(row.hasOwnProperty('weaponscale'))
      appearance.weaponscale = TwoDAObject.normalizeValue(row.weaponscale, 'number', 1.0);
    if(row.hasOwnProperty('wing_tail_scale'))
      appearance.wing_tail_scale = TwoDAObject.normalizeValue(row.wing_tail_scale, 'number', 1.0);
    if(row.hasOwnProperty('moverate'))
      appearance.moverate = TwoDAObject.normalizeValue(row.moverate, 'string', 'NORM');
    if(row.hasOwnProperty('driveaccl')){
      appearance.driveaccl = TwoDAObject.normalizeValue(row.driveaccl, 'number', 25);
      if(!(appearance.driveaccl > 0)) appearance.driveaccl = 25;
    }
    if(row.hasOwnProperty('drivemaxspeed')){
      appearance.drivemaxspeed = TwoDAObject.normalizeValue(row.drivemaxspeed, 'number', 6);
      if(!(appearance.drivemaxspeed > 0)) appearance.drivemaxspeed = 6;
    }
    if(row.hasOwnProperty('hitradius'))
      appearance.hitradius = TwoDAObject.normalizeValue(row.hitradius, 'number', 0.25);
    if(row.hasOwnProperty('perspace'))
      appearance.perspace = TwoDAObject.normalizeValue(row.perspace, 'number', 0.35);
    if(row.hasOwnProperty('creperspace'))
      appearance.creperspace = TwoDAObject.normalizeValue(row.creperspace, 'number', 0.4);
    if(row.hasOwnProperty('cameraspace'))
      appearance.cameraspace = TwoDAObject.normalizeValue(row.cameraspace, 'number', 0);
    if(row.hasOwnProperty('height'))
      appearance.height = TwoDAObject.normalizeValue(row.height, 'number', 0);
    if(row.hasOwnProperty('targetheight'))
      appearance.targetheight = TwoDAObject.normalizeValue(row.targetheight, 'string', 'l');
    if(row.hasOwnProperty('abortonparry'))
      appearance.abortonparry = TwoDAObject.normalizeValue(row.abortonparry, 'boolean', false);
    if(row.hasOwnProperty('racialtype'))
      appearance.racialtype = TwoDAObject.normalizeValue(row.racialtype, 'number', 20);
    if(row.hasOwnProperty('haslegs'))
      appearance.haslegs = TwoDAObject.normalizeValue(row.haslegs, 'boolean', true);
    if(row.hasOwnProperty('hasarms'))
      appearance.hasarms = TwoDAObject.normalizeValue(row.hasarms, 'boolean', true);
    if(row.hasOwnProperty('portrait'))
      appearance.portrait = TwoDAObject.normalizeValue(row.portrait, 'string', 'po_default');
    if(row.hasOwnProperty('footstepsound'))
      appearance.footstepsound = TwoDAObject.normalizeValue(row.footstepsound, 'string', '');
    if(row.hasOwnProperty('footstepvolume'))
      appearance.footstepvolume = TwoDAObject.normalizeValue(row.footstepvolume, 'number', 1);
    if(row.hasOwnProperty('sizecategory'))
      appearance.sizecategory = TwoDAObject.normalizeValue(row.sizecategory, 'number', 3);

    if(row.hasOwnProperty('armor_sound'))
      appearance.armor_sound = TwoDAObject.normalizeValue(row.armor_sound, 'string', '');
    if(row.hasOwnProperty('combat_sound'))
      appearance.combat_sound = TwoDAObject.normalizeValue(row.combat_sound, 'string', '');
    if(row.hasOwnProperty('helmet_scale_m'))
      appearance.helmet_scale_m = TwoDAObject.normalizeValue(row.helmet_scale_m, 'number', 1.0);
    if(row.hasOwnProperty('helmet_scale_f'))
      appearance.helmet_scale_f = TwoDAObject.normalizeValue(row.helmet_scale_f, 'number', 1.0);
    if(row.hasOwnProperty('perceptiondist'))
      appearance.perceptiondist = TwoDAObject.normalizeValue(row.perceptiondist, 'number', 9.0);
    if(row.hasOwnProperty('footsteptype'))
      appearance.footsteptype = TwoDAObject.normalizeValue(row.footsteptype, 'number', 0);
    if(row.hasOwnProperty('soundapptype'))
      appearance.soundapptype = TwoDAObject.normalizeValue(row.soundapptype, 'number', 0);
    if(row.hasOwnProperty('headtrack'))
      appearance.headtrack = TwoDAObject.normalizeValue(row.headtrack, 'number', 0);
    if(row.hasOwnProperty('head_arc_h'))
      appearance.head_arc_h = TwoDAObject.normalizeValue(row.head_arc_h, 'number', 0);
    if(row.hasOwnProperty('head_arc_v'))
      appearance.head_arc_v = TwoDAObject.normalizeValue(row.head_arc_v, 'number', 0);
    if(row.hasOwnProperty('headbone'))
      appearance.headbone = TwoDAObject.normalizeValue(row.headbone, 'string', '');
    if(row.hasOwnProperty('hitdist'))
      appearance.hitdist = TwoDAObject.normalizeValue(row.hitdist, 'number', 1);
    if(row.hasOwnProperty('prefatckdist'))
      appearance.prefatckdist = TwoDAObject.normalizeValue(row.prefatckdist, 'number', 0.5);
    if(row.hasOwnProperty('groundtilt'))
      appearance.groundtilt = TwoDAObject.normalizeValue(row.groundtilt, 'boolean', false);
    if(row.hasOwnProperty('body_bag'))
      appearance.body_bag = TwoDAObject.normalizeValue(row.body_bag, 'number', -1);
    if(row.hasOwnProperty('freelookeffect'))
      appearance.freelookeffect = TwoDAObject.normalizeValue(row.freelookeffect, 'number', -1);
    if(row.hasOwnProperty('cameraheightoffset'))
      appearance.cameraheightoffset = TwoDAObject.normalizeValue(row.cameraheightoffset, 'number', 0);
    // Retail DeathVFX / DeathVFXNode (accept legacy deathfx* aliases for mods)
    if(row.hasOwnProperty('deathvfx'))
      appearance.deathvfx = TwoDAObject.normalizeValue(row.deathvfx, 'number', -1);
    else if(row.hasOwnProperty('deathfx'))
      appearance.deathvfx = TwoDAObject.normalizeValue(row.deathfx, 'number', -1);
    if(row.hasOwnProperty('deathvfxnode'))
      appearance.deathvfxnode = TwoDAObject.normalizeValue(row.deathvfxnode, 'string', '');
    else if(row.hasOwnProperty('deathfxnode'))
      appearance.deathvfxnode = TwoDAObject.normalizeValue(row.deathfxnode, 'string', '');
    if(row.hasOwnProperty('fadedelayondeath'))
      appearance.fadedelayondeath = TwoDAObject.normalizeValue(row.fadedelayondeath, 'number', -1);
    if(row.hasOwnProperty('destroyobjectdelay'))
      appearance.destroyobjectdelay = TwoDAObject.normalizeValue(row.destroyobjectdelay, 'number', -1);
    if(row.hasOwnProperty('disableinjuredanim'))
      appearance.disableinjuredanim = TwoDAObject.normalizeValue(row.disableinjuredanim, 'boolean', false);
    if(row.hasOwnProperty('equipslotslocked'))
      appearance.equipslotslocked = TwoDAObject.normalizeValue(row.equipslotslocked, 'number', -1);

    return appearance;
  }

}
