import { TwoDAObject } from "../resource/TwoDAObject";

/**
 * CreatureAppearance class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CreatureAppearance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CreatureAppearance {
  id: number = -1;
  label: string = '';
  string_ref: number = -1;
  race: string = '';
  walkdist: number = 1.7;
  rundist: number = 5.4;
  driveanimwalk: number = 1.7;
  driveanimrun: number = 5.4;
  driveanimrun_pc: number = 5.4; //TSL
  driveanimrun_xbox: number = 5.4; //TSL
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

  modelm: string = ''; //TSL
  texm: string = ''; //TSL

  modeln: string = ''; //TSL
  texn: string = ''; //TSL
  texnevil: string = ''; //TSL

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
  driveaccl: number = 50;
  drivemaxspeed: number = 5.4;
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
  deathfx: number = -1;
  deathfxnode: string = '';
  fadedelayondeath: number = -1;
  destroyobjectdelay: number = -1;
  disableinjuredanim: boolean = false;
  equipslotslocked: number = -1;

  static From2DA (row: any = {}): CreatureAppearance {
    const appearance = new CreatureAppearance();
    
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
    if(row.hasOwnProperty('driveanimwalk'))
      appearance.driveanimwalk = TwoDAObject.normalizeValue(row.driveanimwalk, 'number', 1.7);
    if(row.hasOwnProperty('driveanimrun'))
      appearance.driveanimrun = TwoDAObject.normalizeValue(row.driveanimrun, 'number', 5.4);
    if(row.hasOwnProperty('driveanimrun_pc'))
      appearance.driveanimrun_pc = TwoDAObject.normalizeValue(row.driveanimrun_pc, 'number', 5.4); //TSL
    if(row.hasOwnProperty('driveanimrun_xbox'))
      appearance.driveanimrun_xbox = TwoDAObject.normalizeValue(row.driveanimrun_xbox, 'number', 5.4); //TSL
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
      appearance.texbevil = TwoDAObject.normalizeValue(row.texbevil, 'string', ''); //TSL

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
      appearance.texievil = TwoDAObject.normalizeValue(row.texievil, 'string', ''); //TSL

    if(row.hasOwnProperty('modelj'))
      appearance.modelj = TwoDAObject.normalizeValue(row.modelj, 'string', '');
    if(row.hasOwnProperty('texj'))
      appearance.texj = TwoDAObject.normalizeValue(row.texj, 'string', '');

    if(row.hasOwnProperty('modelk'))
      appearance.modelk = TwoDAObject.normalizeValue(row.modelk, 'string', ''); //TSL
    if(row.hasOwnProperty('texk'))
      appearance.texk = TwoDAObject.normalizeValue(row.texk, 'string', ''); //TSL

    if(row.hasOwnProperty('modell'))
      appearance.modell = TwoDAObject.normalizeValue(row.modell, 'string', ''); //TSL
    if(row.hasOwnProperty('texl'))
      appearance.texl = TwoDAObject.normalizeValue(row.texl, 'string', ''); //TSL

    if(row.hasOwnProperty('modelm'))
      appearance.modelm = TwoDAObject.normalizeValue(row.modelm, 'string', ''); //TSL
    if(row.hasOwnProperty('texm'))
      appearance.texm = TwoDAObject.normalizeValue(row.texm, 'string', ''); //TSL

    if(row.hasOwnProperty('modeln'))
      appearance.modeln = TwoDAObject.normalizeValue(row.modeln, 'string', ''); //TSL
    if(row.hasOwnProperty('texn'))
      appearance.texn = TwoDAObject.normalizeValue(row.texn, 'string', ''); //TSL
    if(row.hasOwnProperty('texnevil'))
      appearance.texnevil = TwoDAObject.normalizeValue(row.texnevil, 'string', ''); //TSL

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
    if(row.hasOwnProperty('driveaccl'))
      appearance.driveaccl = TwoDAObject.normalizeValue(row.driveaccl, 'number', 50);
    if(row.hasOwnProperty('drivemaxspeed'))
      appearance.drivemaxspeed = TwoDAObject.normalizeValue(row.drivemaxspeed, 'number', 5.4);
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
      appearance.cameraheightoffset = TwoDAObject.normalizeValue(row.cameraheightoffset, 'number', -1);
    if(row.hasOwnProperty('deathfx'))
      appearance.deathfx = TwoDAObject.normalizeValue(row.deathfx, 'number', -1);
    if(row.hasOwnProperty('deathfxnode'))
      appearance.deathfxnode = TwoDAObject.normalizeValue(row.deathfxnode, 'string', '');
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
