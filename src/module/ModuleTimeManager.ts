import { ModuleCalendar } from "@/module/ModuleCalendar";
import { ModuleDayPhase } from "@/enums/module/ModuleDayPhase";
import { GFFObject } from "@/resource/GFFObject";

/**
* ModuleTimeManager class.
*
* Class representing the time manager for a game module.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file ModuleTimeManager.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleTimeManager {

  dawnHour = 6;
  duskHour = 18;
  /** retail — day/night/dawn/dusk phase. */
  dayPhase: ModuleDayPhase = ModuleDayPhase.Day;
  /** Retail Mod_Transition — ms spent in the current dawn/dusk hour. */
  transition = 0;

  enabled = true;
  calendar: ModuleCalendar;

  constructor(){
    this.calendar = new ModuleCalendar();
  }

  update(delta = 0){
    if(!this.enabled) return;
    const beforeDay = this.pauseDay;
    const beforeTime = this.pauseTime;
    this.calendar.advanceDeltaTime(delta);
    this.updateTime(this.getMilisecondsElapsed(beforeDay, beforeTime));
  }

  setTime(hour = 0, minute = 0, second = 0, milisecond = 0){
    hour = Math.trunc(hour);
    minute = Math.trunc(minute);
    second = Math.trunc(second);
    milisecond = Math.trunc(milisecond);
    if(hour < 0 || minute < 0 || second < 0 || milisecond < 0) return;

    // Retail AdvanceToTime: carry overflow through every field before conversion.
    second += Math.floor(milisecond / 1000);
    milisecond %= 1000;
    minute += Math.floor(second / 60);
    second %= 60;
    hour += Math.floor(minute / 60);
    minute %= 60;

    let advanceDay = Math.floor(hour / ModuleCalendar.HOURS_IN_DAY);
    hour %= ModuleCalendar.HOURS_IN_DAY;

    // ConvertHourMinSecMsToMs: script minutes stay 0-59 and always add minute*60000.
    let time = this.convertHourMinSecMsToMs(hour, minute, second, milisecond);
    const dayLength = this.calendar.MAX_DAY_TIME;
    if(dayLength > 0 && time >= dayLength){
      advanceDay += Math.floor(time / dayLength);
      time %= dayLength;
    }

    // Forward-only: an earlier same-day target advances one calendar day.
    if(advanceDay === 0 && time < this.pauseTime){
      advanceDay = 1;
    }

    this.pauseDay = Math.max(0, this.pauseDay + advanceDay);
    this.pauseTime = time;
    this.calendar.updateCalendarDateTime();
    // Retail ExecuteCommandSetTime passes elapsed=0 into UpdateTime.
    this.updateTime(0);
  }

  /**
   * Retail ConvertHourMinSecMsToMs.
   * Hours scale by minutesPerHour; minutes always contribute minute*60000.
   */
  convertHourMinSecMsToMs(hour = 0, minute = 0, second = 0, milisecond = 0){
    const mph = this.minutesPerHour;
    let total = 0;
    if(hour < ModuleCalendar.HOURS_IN_DAY){
      total += mph * hour * 60000;
    }else{
      total += mph * 1380000;
    }
    if(minute < ModuleCalendar.SECONDS_IN_MINUTE){
      total += minute * 60000;
    }else{
      total += 3540000;
    }
    if(second < ModuleCalendar.SECONDS_IN_MINUTE){
      total += second * 1000 + milisecond;
    }else{
      total += 56000 + milisecond;
    }
    return total;
  }

  /**
   * Retail UpdateTime.
   * Recomputes day phase from the current hour and accumulates Mod_Transition
   * while the previous phase is dawn or dusk.
   */
  updateTime(elapsedMs = 0){
    const nextPhase = this.computeDayPhase(this.hour);
    if(this.dayPhase === ModuleDayPhase.Dawn || this.dayPhase === ModuleDayPhase.Dusk){
      this.transition = (this.transition | 0) + Math.max(0, Math.trunc(elapsedMs));
    }else{
      this.transition = 0;
    }
    if(this.dayPhase !== nextPhase){
      this.dayPhase = nextPhase;
    }
  }

  /**
   * Retail LoadModuleStart / UpdateTime phase selection.
   * 1 day, 2 night, 3 dawn (exact dawn hour), 4 dusk (exact dusk hour).
   */
  computeDayPhase(hour = 0): ModuleDayPhase {
    const dawn = this.dawnHour | 0;
    const dusk = this.duskHour | 0;
    hour = hour | 0;

    if(dawn === dusk){
      return ModuleDayPhase.Day;
    }
    if(hour === dawn){
      return ModuleDayPhase.Dawn;
    }
    if(hour === dusk){
      return ModuleDayPhase.Dusk;
    }
    if(dawn < dusk){
      if(hour < dawn || hour > dusk){
        return ModuleDayPhase.Night;
      }
    }else if(dusk <= hour && hour <= dawn){
      return ModuleDayPhase.Night;
    }
    return ModuleDayPhase.Day;
  }

  /**
   * Day and dawn use day tracks; night and dusk use night tracks
   * (retail UpdateTimeOfDay phase grouping).
   */
  static usesDayAudioTracks(phase: ModuleDayPhase){
    return phase === ModuleDayPhase.Day || phase === ModuleDayPhase.Dawn;
  }

  /**
   * Retail UpdateDayNightCycle shadowAlpha during dawn/dusk.
   * before midpoint → opacity*0.01*(1 - t/0.5);
   * after midpoint → opacity*0.01*(t/0.5 - 1).
   */
  static computeTransitionShadowAlpha(shadowOpacity: number, progress: number, beforeHalfway: boolean, half = 0.5){
    const base = (shadowOpacity | 0) * 0.01;
    if(half <= 0){
      return Math.max(0, base);
    }
    const t = progress / half;
    if(beforeHalfway){
      return Math.max(0, base * (1 - t));
    }
    return Math.max(0, base * (t - 1));
  }

  isDay(){
    return this.dayPhase === ModuleDayPhase.Day;
  }

  isNight(){
    return this.dayPhase === ModuleDayPhase.Night;
  }

  isDawn(){
    return this.dayPhase === ModuleDayPhase.Dawn;
  }

  isDusk(){
    return this.dayPhase === ModuleDayPhase.Dusk;
  }

  getCalendarTimeFromPauseTime( calendar = new ModuleCalendar ){
    calendar.hour       = this.pauseTime / ModuleCalendar.MILISECONDS_IN_SECOND / ModuleCalendar.SECONDS_IN_MINUTE / this.minutesPerHour | 0;
    calendar.minute     = this.pauseTime / ModuleCalendar.MILISECONDS_IN_SECOND / ModuleCalendar.SECONDS_IN_MINUTE % this.minutesPerHour | 0;
    calendar.second     = this.pauseTime / ModuleCalendar.MILISECONDS_IN_SECOND % ModuleCalendar.SECONDS_IN_MINUTE | 0;
    calendar.milisecond = this.pauseTime % ModuleCalendar.MILISECONDS_IN_SECOND | 0;
    return calendar;
  }

  getCalendarDateFromPauseDay( calendar = new ModuleCalendar ){
    calendar.year   = this.pauseDay / ModuleCalendar.DAYS_IN_MONTH / ModuleCalendar.MONTHS_IN_YEAR | 0;
    calendar.month  = this.pauseDay / ModuleCalendar.DAYS_IN_MONTH % ModuleCalendar.MONTHS_IN_YEAR + 1 | 0;
    calendar.day    = this.pauseDay % ModuleCalendar.DAYS_IN_MONTH + 1 | 0;
    return calendar;
  }

  setMinutesPerHour(mph: number = 0){
    // Retail SetMinutesPerHour: zero becomes 5.
    this.minutesPerHour = ((mph | 0) > 0) ? (mph | 0) : 5;
  }

  getHoursFromPauseTime(){
    return this.pauseTime / ModuleCalendar.MILISECONDS_IN_SECOND / ModuleCalendar.SECONDS_IN_MINUTE / this.minutesPerHour | 0;
  }

  getMinutesFromPauseTime(){
    return this.pauseTime / ModuleCalendar.MILISECONDS_IN_SECOND / ModuleCalendar.SECONDS_IN_MINUTE % this.minutesPerHour | 0;
  }

  getSecondsFromPauseTime(){
    return this.pauseTime / ModuleCalendar.MILISECONDS_IN_SECOND % ModuleCalendar.SECONDS_IN_MINUTE | 0;
  }

  getMilisecondsFromPauseTime(){
    return this.pauseTime % ModuleCalendar.MILISECONDS_IN_SECOND | 0;
  }

  getFutureTimeFromSeconds(seconds: number = 0){
    let future = this.calendar.clone();
    future.advanceDeltaTime(seconds);
    return future;
  }

  getMilisecondsElapsed(day: number = 0, time: number = 0){
    const days_since = Math.trunc(this.pauseDay - day);
    const time_since = Math.trunc(this.pauseTime - time);
    return (days_since * this.calendar.MAX_DAY_TIME) + time_since;
  }

  toString(){
    return `${('0000'+this.year).slice(-4)}-${('00'+this.month).slice(-2)}-${('00'+this.day).slice(-2)} ${('00'+this.hour).slice(-2)}:${('00'+this.minute).slice(-2)}:${('00'+this.second).slice(-2)}.${('0000'+this.milisecond).slice(-4)}`;
  }

  setFromIFO(ifo: GFFObject, isLoadingSave = false){
    if(ifo instanceof GFFObject){
      if(ifo.RootNode.hasField('Mod_PauseDay')){
        this.pauseDay = ifo.getFieldByLabel('Mod_PauseDay').getValue();
      }

      if(ifo.RootNode.hasField('Mod_PauseTime')){
        this.pauseTime = ifo.getFieldByLabel('Mod_PauseTime').getValue();
      }

      if(ifo.RootNode.hasField('Mod_DawnHour')){
        this.dawnHour = ifo.getFieldByLabel('Mod_DawnHour').getValue();
      }

      if(ifo.RootNode.hasField('Mod_DuskHour')){
        this.duskHour = ifo.getFieldByLabel('Mod_DuskHour').getValue();
      }

      if(ifo.RootNode.hasField('Mod_MinPerHour')){
        this.setMinutesPerHour(ifo.getFieldByLabel('Mod_MinPerHour').getValue());
      }

      if(ifo.RootNode.hasField('Mod_StartYear')){
        this.year = ifo.getFieldByLabel('Mod_StartYear').getValue();
      }

      if(ifo.RootNode.hasField('Mod_StartMonth')){
        this.month = ifo.getFieldByLabel('Mod_StartMonth').getValue();
      }

      if(ifo.RootNode.hasField('Mod_StartDay')){
        this.day = ifo.getFieldByLabel('Mod_StartDay').getValue();
      }

      if(ifo.RootNode.hasField('Mod_StartHour')){
        this.hour = ifo.getFieldByLabel('Mod_StartHour').getValue();
      }

      if(ifo.RootNode.hasField('Mod_StartMinute')){
        this.minute = ifo.getFieldByLabel('Mod_StartMinute').getValue();
      }

      if(ifo.RootNode.hasField('Mod_StartSecond')){
        this.second = ifo.getFieldByLabel('Mod_StartSecond').getValue();
      }

      if(ifo.RootNode.hasField('Mod_StartMiliSec')){
        this.milisecond = ifo.getFieldByLabel('Mod_StartMiliSec').getValue();
      }

      if(ifo.RootNode.hasField('Mod_Transition')){
        this.transition = ifo.getFieldByLabel('Mod_Transition').getValue() | 0;
      }

      if(isLoadingSave && ifo.RootNode.hasField('Mod_PauseDay') && ifo.RootNode.hasField('Mod_PauseTime')){
        this.calendar.updateCalendarDateTime();
      }else{
        this.calendar.setCalendarDateTime();
      }

      // Retail LoadModuleStart initializes phase from the restored hour.
      this.dayPhase = this.computeDayPhase(this.hour);
    }
  }

  get MAX_DAY_TIME(){
    return ModuleCalendar.HOURS_IN_DAY * (ModuleCalendar.SECONDS_IN_MINUTE * this.minutesPerHour) * ModuleCalendar.MILISECONDS_IN_SECOND;
  }

  get milisecond(){
    return this.calendar.milisecond;
  }

  set milisecond(milisecond: number){
    this.calendar.milisecond = milisecond|0;
  }

  get second(){
    return this.calendar.second;
  }

  set second(second: number){
    this.calendar.second = second|0;
  }

  get minute(){
    return this.calendar.minute;
  }

  set minute(minute: number){
    this.calendar.minute = minute|0;
  }

  get hour(){
    return this.calendar.hour;
  }

  set hour(hour: number){
    this.calendar.hour = hour|0;
  }

  get day(){
    return this.calendar.day;
  }

  set day(day: number){
    this.calendar.day = day|0;
  }

  get month(){
    return this.calendar.month;
  }

  set month(month: number){
    this.calendar.month = month|0;
  }

  get year(){
    return this.calendar.year;
  }

  set year(year: number){
    this.calendar.year = year|0;
  }

  get pauseTime(){
    return this.calendar.pauseTime|0;
  }

  set pauseTime(pauseTime: number){
    this.calendar.pauseTime = pauseTime|0;
  }

  get pauseDay(){
    return this.calendar.pauseDay|0;
  }

  set pauseDay(pauseDay: number){
    this.calendar.pauseDay = pauseDay|0;
  }

  get minutesPerHour(){
    return this.calendar.minutesPerHour;
  }

  set minutesPerHour(minutesPerHour: number){
    const mph = minutesPerHour | 0;
    this.calendar.minutesPerHour = mph > 0 ? mph : 5;
  }

}
