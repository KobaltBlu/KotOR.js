import { TwoDAObject, type ITwoDARowData } from "@/resource/TwoDAObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";
import { Utility } from "@/utility/Utility";

const log = createScopedLogger(LogScope.Game);

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
  targetheight = 'l' as const;
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

  getBodyModelInfo(bodyVariation: string = '', textureVariation: number = 1): { model: string, texture: string } {
    textureVariation = Math.max(1, textureVariation);
    log.info('getBodyModelInfo', bodyVariation, textureVariation);
    const defaultModel = this.modela.replace(/\0[\s\S]*$/g,'');
    const defaultTexture = this.texa.replace(/\0[\s\S]*$/g,'');
    let bodyModel = defaultModel;
    let bodyTexture = defaultTexture;

    if(this.modeltype != 'B'){
      bodyModel = this.race.replace(/\0[\s\S]*$/g,'').toLowerCase();
      bodyTexture = this.racetex.replace(/\0[\s\S]*$/g,'').toLowerCase();
      return {
        model: bodyModel,
        texture: bodyTexture
      }
    }

    switch(bodyVariation?.toLowerCase()){
      case 'b':
        bodyModel = this.modelb.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texb.replace(/\0[\s\S]*$/g,'');
      break;
      case 'c':
        bodyModel = this.modelc.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texc.replace(/\0[\s\S]*$/g,'');
      break;
      case 'd':
        bodyModel = this.modeld.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texd.replace(/\0[\s\S]*$/g,'');
      break;
      case 'e':
        bodyModel = this.modele.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texe.replace(/\0[\s\S]*$/g,'');
      break;
      case 'f':
        bodyModel = this.modelf.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texf.replace(/\0[\s\S]*$/g,'');
      break;
      case 'g':
        bodyModel = this.modelg.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texg.replace(/\0[\s\S]*$/g,'');
      break;
      case 'h':
        bodyModel = this.modelh.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texh.replace(/\0[\s\S]*$/g,'');
      break;
      case 'i':
        bodyModel = this.modeli.replace(/\0[\s\S]*$/g,'');
        bodyTexture = this.texi.replace(/\0[\s\S]*$/g,'');
      break;
      default:
        bodyModel = defaultModel;
        bodyTexture = defaultTexture;
      break;
    }

    if(bodyTexture){
      bodyTexture += Utility.PadInt( textureVariation, 2);
    }

    return {
      model: bodyModel ? bodyModel.toLowerCase() : defaultModel.toLowerCase(),
      texture: bodyTexture ? bodyTexture.toLowerCase() : defaultTexture.toLowerCase()
    };
  }

  static From2DA (row: ITwoDARowData = {} as ITwoDARowData): SWCreatureAppearance {
    const appearance = new SWCreatureAppearance();

    appearance.id = parseInt(String(row.__index ?? 0), 10);

    if(Object.hasOwn(row,'label'))
      appearance.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    if(Object.hasOwn(row,'string_ref'))
      appearance.string_ref = TwoDAObject.normalizeValue(row.string_ref, 'number', -1);
    if(Object.hasOwn(row,'race'))
      appearance.race = TwoDAObject.normalizeValue(row.race, 'string', '');
    if(Object.hasOwn(row,'walkdist'))
      appearance.walkdist = TwoDAObject.normalizeValue(row.walkdist, 'number', 1.7);
    if(Object.hasOwn(row,'rundist'))
      appearance.rundist = TwoDAObject.normalizeValue(row.rundist, 'number', 5.4);
    if(Object.hasOwn(row,'driveanimwalk'))
      appearance.driveanimwalk = TwoDAObject.normalizeValue(row.driveanimwalk, 'number', 1.7);
    if(Object.hasOwn(row,'driveanimrun'))
      appearance.driveanimrun = TwoDAObject.normalizeValue(row.driveanimrun, 'number', 5.4);
    if(Object.hasOwn(row,'driveanimrun_pc'))
      appearance.driveanimrun_pc = TwoDAObject.normalizeValue(row.driveanimrun_pc, 'number', 5.4); //TSL
    if(Object.hasOwn(row,'driveanimrun_xbox'))
      appearance.driveanimrun_xbox = TwoDAObject.normalizeValue(row.driveanimrun_xbox, 'number', 5.4); //TSL
    if(Object.hasOwn(row,'racetex'))
      appearance.racetex = TwoDAObject.normalizeValue(row.racetex, 'string', '');
    if(Object.hasOwn(row,'modeltype'))
      appearance.modeltype = TwoDAObject.normalizeValue(row.modeltype, 'string', 'B') as 'B'|'F'|'S'|'L';
    if(Object.hasOwn(row,'normalhead'))
      appearance.normalhead = TwoDAObject.normalizeValue(row.normalhead, 'number', -1);
    if(Object.hasOwn(row,'backuphead'))
      appearance.backuphead = TwoDAObject.normalizeValue(row.backuphead, 'number', -1);

    if(Object.hasOwn(row,'modela'))
      appearance.modela = TwoDAObject.normalizeValue(row.modela, 'string', '');
    if(Object.hasOwn(row,'texa'))
      appearance.texa = TwoDAObject.normalizeValue(row.texa, 'string', '');
    if(Object.hasOwn(row,'texaevil'))
      appearance.texaevil = TwoDAObject.normalizeValue(row.texaevil, 'string', '');

    if(Object.hasOwn(row,'modelb'))
      appearance.modelb = TwoDAObject.normalizeValue(row.modelb, 'string', '');
    if(Object.hasOwn(row,'texb'))
      appearance.texb = TwoDAObject.normalizeValue(row.texb, 'string', '');
    if(Object.hasOwn(row,'texbevil'))
      appearance.texbevil = TwoDAObject.normalizeValue(row.texbevil, 'string', ''); //TSL

    if(Object.hasOwn(row,'modelc'))
      appearance.modelc = TwoDAObject.normalizeValue(row.modelc, 'string', '');
    if(Object.hasOwn(row,'texc'))
      appearance.texc = TwoDAObject.normalizeValue(row.texc, 'string', '');

    if(Object.hasOwn(row,'modeld'))
      appearance.modeld = TwoDAObject.normalizeValue(row.modeld, 'string', '');
    if(Object.hasOwn(row,'texd'))
      appearance.texd = TwoDAObject.normalizeValue(row.texd, 'string', '');

    if(Object.hasOwn(row,'modele'))
      appearance.modele = TwoDAObject.normalizeValue(row.modele, 'string', '');
    if(Object.hasOwn(row,'texe'))
      appearance.texe = TwoDAObject.normalizeValue(row.texe, 'string', '');

    if(Object.hasOwn(row,'modelf'))
      appearance.modelf = TwoDAObject.normalizeValue(row.modelf, 'string', '');
    if(Object.hasOwn(row,'texf'))
      appearance.texf = TwoDAObject.normalizeValue(row.texf, 'string', '');

    if(Object.hasOwn(row,'modelg'))
      appearance.modelg = TwoDAObject.normalizeValue(row.modelg, 'string', '');
    if(Object.hasOwn(row,'texg'))
      appearance.texg = TwoDAObject.normalizeValue(row.texg, 'string', '');

    if(Object.hasOwn(row,'modelh'))
      appearance.modelh = TwoDAObject.normalizeValue(row.modelh, 'string', '');
    if(Object.hasOwn(row,'texh'))
      appearance.texh = TwoDAObject.normalizeValue(row.texh, 'string', '');

    if(Object.hasOwn(row,'modeli'))
      appearance.modeli = TwoDAObject.normalizeValue(row.modeli, 'string', '');
    if(Object.hasOwn(row,'texi'))
      appearance.texi = TwoDAObject.normalizeValue(row.texi, 'string', '');
    if(Object.hasOwn(row,'texievil'))
      appearance.texievil = TwoDAObject.normalizeValue(row.texievil, 'string', ''); //TSL

    if(Object.hasOwn(row,'modelj'))
      appearance.modelj = TwoDAObject.normalizeValue(row.modelj, 'string', '');
    if(Object.hasOwn(row,'texj'))
      appearance.texj = TwoDAObject.normalizeValue(row.texj, 'string', '');

    if(Object.hasOwn(row,'modelk'))
      appearance.modelk = TwoDAObject.normalizeValue(row.modelk, 'string', ''); //TSL
    if(Object.hasOwn(row,'texk'))
      appearance.texk = TwoDAObject.normalizeValue(row.texk, 'string', ''); //TSL

    if(Object.hasOwn(row,'modell'))
      appearance.modell = TwoDAObject.normalizeValue(row.modell, 'string', ''); //TSL
    if(Object.hasOwn(row,'texl'))
      appearance.texl = TwoDAObject.normalizeValue(row.texl, 'string', ''); //TSL

    if(Object.hasOwn(row,'modelm'))
      appearance.modelm = TwoDAObject.normalizeValue(row.modelm, 'string', ''); //TSL
    if(Object.hasOwn(row,'texm'))
      appearance.texm = TwoDAObject.normalizeValue(row.texm, 'string', ''); //TSL

    if(Object.hasOwn(row,'modeln'))
      appearance.modeln = TwoDAObject.normalizeValue(row.modeln, 'string', ''); //TSL
    if(Object.hasOwn(row,'texn'))
      appearance.texn = TwoDAObject.normalizeValue(row.texn, 'string', ''); //TSL
    if(Object.hasOwn(row,'texnevil'))
      appearance.texnevil = TwoDAObject.normalizeValue(row.texnevil, 'string', ''); //TSL

    if(Object.hasOwn(row,'skin'))
      appearance.skin = TwoDAObject.normalizeValue(row.skin, 'string', '');
    if(Object.hasOwn(row,'headtexve'))
      appearance.headtexve = TwoDAObject.normalizeValue(row.headtexve, 'string', '');
    if(Object.hasOwn(row,'headtexe'))
      appearance.headtexe = TwoDAObject.normalizeValue(row.headtexe, 'string', '');
    if(Object.hasOwn(row,'headtexg'))
      appearance.headtexg = TwoDAObject.normalizeValue(row.headtexg, 'string', '');
    if(Object.hasOwn(row,'headtexvg'))
      appearance.headtexvg = TwoDAObject.normalizeValue(row.headtexvg, 'string', '');
    if(Object.hasOwn(row,'envmap'))
      appearance.envmap = TwoDAObject.normalizeValue(row.envmap, 'string', '');
    if(Object.hasOwn(row,'bloodcolr'))
      appearance.bloodcolr = TwoDAObject.normalizeValue(row.bloodcolr, 'string', 'R') as 'R'|'S'|'G';

      if(Object.hasOwn(row,'weaponscale'))
      appearance.weaponscale = TwoDAObject.normalizeValue(row.weaponscale, 'number', 1.0);
    if(Object.hasOwn(row,'wing_tail_scale'))
      appearance.wing_tail_scale = TwoDAObject.normalizeValue(row.wing_tail_scale, 'number', 1.0);
    if(Object.hasOwn(row,'moverate'))
      appearance.moverate = TwoDAObject.normalizeValue(row.moverate, 'string', 'NORM') as SWCreatureAppearance['moverate'];
    if(Object.hasOwn(row,'driveaccl'))
      appearance.driveaccl = TwoDAObject.normalizeValue(row.driveaccl, 'number', 50);
    if(Object.hasOwn(row,'drivemaxspeed'))
      appearance.drivemaxspeed = TwoDAObject.normalizeValue(row.drivemaxspeed, 'number', 5.4);
    if(Object.hasOwn(row,'hitradius'))
      appearance.hitradius = TwoDAObject.normalizeValue(row.hitradius, 'number', 0.25);
    if(Object.hasOwn(row,'perspace'))
      appearance.perspace = TwoDAObject.normalizeValue(row.perspace, 'number', 0.35);
    if(Object.hasOwn(row,'creperspace'))
      appearance.creperspace = TwoDAObject.normalizeValue(row.creperspace, 'number', 0.4);
    if(Object.hasOwn(row,'cameraspace'))
      appearance.cameraspace = TwoDAObject.normalizeValue(row.cameraspace, 'number', 0);
    if(Object.hasOwn(row,'height'))
      appearance.height = TwoDAObject.normalizeValue(row.height, 'number', 0);
    if(Object.hasOwn(row,'targetheight'))
      appearance.targetheight = TwoDAObject.normalizeValue(row.targetheight, 'string', 'l') as 'l';
    if(Object.hasOwn(row,'abortonparry'))
      appearance.abortonparry = TwoDAObject.normalizeValue(row.abortonparry, 'boolean', false);
    if(Object.hasOwn(row,'racialtype'))
      appearance.racialtype = TwoDAObject.normalizeValue(row.racialtype, 'number', 20);
    if(Object.hasOwn(row,'haslegs'))
      appearance.haslegs = TwoDAObject.normalizeValue(row.haslegs, 'boolean', true);
    if(Object.hasOwn(row,'hasarms'))
      appearance.hasarms = TwoDAObject.normalizeValue(row.hasarms, 'boolean', true);
    if(Object.hasOwn(row,'portrait'))
      appearance.portrait = TwoDAObject.normalizeValue(row.portrait, 'string', 'po_default');
    if(Object.hasOwn(row,'footstepsound'))
      appearance.footstepsound = TwoDAObject.normalizeValue(row.footstepsound, 'string', '');
    if(Object.hasOwn(row,'footstepvolume'))
      appearance.footstepvolume = TwoDAObject.normalizeValue(row.footstepvolume, 'number', 1);
    if(Object.hasOwn(row,'sizecategory'))
      appearance.sizecategory = TwoDAObject.normalizeValue(row.sizecategory, 'number', 3);

    if(Object.hasOwn(row,'armor_sound'))
      appearance.armor_sound = TwoDAObject.normalizeValue(row.armor_sound, 'string', '');
    if(Object.hasOwn(row,'combat_sound'))
      appearance.combat_sound = TwoDAObject.normalizeValue(row.combat_sound, 'string', '');
    if(Object.hasOwn(row,'helmet_scale_m'))
      appearance.helmet_scale_m = TwoDAObject.normalizeValue(row.helmet_scale_m, 'number', 1.0);
    if(Object.hasOwn(row,'helmet_scale_f'))
      appearance.helmet_scale_f = TwoDAObject.normalizeValue(row.helmet_scale_f, 'number', 1.0);
    if(Object.hasOwn(row,'perceptiondist'))
      appearance.perceptiondist = TwoDAObject.normalizeValue(row.perceptiondist, 'number', 9.0);
    if(Object.hasOwn(row,'footsteptype'))
      appearance.footsteptype = TwoDAObject.normalizeValue(row.footsteptype, 'number', 0);
    if(Object.hasOwn(row,'soundapptype'))
      appearance.soundapptype = TwoDAObject.normalizeValue(row.soundapptype, 'number', 0);
    if(Object.hasOwn(row,'headtrack'))
      appearance.headtrack = TwoDAObject.normalizeValue(row.headtrack, 'number', 0);
    if(Object.hasOwn(row,'head_arc_h'))
      appearance.head_arc_h = TwoDAObject.normalizeValue(row.head_arc_h, 'number', 0);
    if(Object.hasOwn(row,'head_arc_v'))
      appearance.head_arc_v = TwoDAObject.normalizeValue(row.head_arc_v, 'number', 0);
    if(Object.hasOwn(row,'headbone'))
      appearance.headbone = TwoDAObject.normalizeValue(row.headbone, 'string', '');
    if(Object.hasOwn(row,'hitdist'))
      appearance.hitdist = TwoDAObject.normalizeValue(row.hitdist, 'number', 1);
    if(Object.hasOwn(row,'prefatckdist'))
      appearance.prefatckdist = TwoDAObject.normalizeValue(row.prefatckdist, 'number', 0.5);
    if(Object.hasOwn(row,'groundtilt'))
      appearance.groundtilt = TwoDAObject.normalizeValue(row.groundtilt, 'number', 0);
    if(Object.hasOwn(row,'body_bag'))
      appearance.body_bag = TwoDAObject.normalizeValue(row.body_bag, 'number', -1);
    if(Object.hasOwn(row,'freelookeffect'))
      appearance.freelookeffect = TwoDAObject.normalizeValue(row.freelookeffect, 'number', -1);
    if(Object.hasOwn(row,'cameraheightoffset'))
      appearance.cameraheightoffset = TwoDAObject.normalizeValue(row.cameraheightoffset, 'number', 0);
    if(Object.hasOwn(row,'deathfx'))
      appearance.deathfx = TwoDAObject.normalizeValue(row.deathfx, 'number', -1);
    if(Object.hasOwn(row,'deathfxnode'))
      appearance.deathfxnode = TwoDAObject.normalizeValue(row.deathfxnode, 'string', '');
    if(Object.hasOwn(row,'fadedelayondeath'))
      appearance.fadedelayondeath = TwoDAObject.normalizeValue(row.fadedelayondeath, 'number', -1);
    if(Object.hasOwn(row,'destroyobjectdelay'))
      appearance.destroyobjectdelay = TwoDAObject.normalizeValue(row.destroyobjectdelay, 'number', -1);
    if(Object.hasOwn(row,'disableinjuredanim'))
      appearance.disableinjuredanim = TwoDAObject.normalizeValue(row.disableinjuredanim, 'boolean', false);
    if(Object.hasOwn(row,'equipslotslocked'))
      appearance.equipslotslocked = TwoDAObject.normalizeValue(row.equipslotslocked, 'number', -1);

    return appearance;
  }

}
