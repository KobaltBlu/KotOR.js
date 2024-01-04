/**
 * ModuleCalendar class.
 * 
 * Class representing a modules calendar for time management.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleCalendar.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ModuleCalendar {
  minutesPerHour = 2;
  year = 0;
  month = 0;
  day = 0;
  hour = 0;
  minute = 0;
  second = 0;
  milisecond = 0;
  pauseDay = 0;
  pauseTime = 0;

  clone(){
    let calendar = new ModuleCalendar();
    calendar.year = this.year;
    calendar.month = this.month;
    calendar.day = this.day;
    calendar.hour = this.hour;
    calendar.minute = this.minute;
    calendar.second = this.second;
    calendar.milisecond = this.milisecond;
    calendar.pauseDay = this.pauseDay;
    calendar.pauseTime = this.pauseTime;
    calendar.minutesPerHour = this.minutesPerHour;
    return calendar;
  }

  advanceDeltaTime(delta = 0){
    this.advanceDayAndTime(0, ( ModuleCalendar.MILISECONDS_IN_SECOND * delta ) | 0);
  }

  advanceDayAndTime(day = 0, milliseconds = 0){
    let time = this.pauseTime + (milliseconds | 0);
    if ( time >= this.MAX_DAY_TIME ) {
      this.pauseDay++;
      time -= this.MAX_DAY_TIME;
    }
    this.pauseTime = time;

    this.milisecond = this.getMilisecondsFromPauseTime();
    this.second = this.getSecondsFromPauseTime();
    this.minute = this.getMinutesFromPauseTime();
    this.hour = this.getHoursFromPauseTime();

    this.pauseDay += day;
    this.day = this.getDayFromPauseDay();
    this.month = this.getMonthFromPauseDay();
    this.year = this.getYearFromPauseDay();

    //this.pauseTime  = (this.hour * 120000) + (this.minute * 60000) + (this.second * 1000) + this.milisecond;
    //this.pauseDay   = (this.year * ModuleCalendar.MONTHS_IN_YEAR * ModuleCalendar.DAYS_IN_MONTH ) + ( (this.month - 1) * ModuleCalendar.DAYS_IN_MONTH) + (this.day - 1);
  }

  pauseTimeFromCalendar(){
    return  ( this.hour * this.minutesPerHour * ModuleCalendar.SECONDS_IN_MINUTE * ModuleCalendar.MILISECONDS_IN_SECOND ) + 
            ( this.minute * ModuleCalendar.SECONDS_IN_MINUTE * ModuleCalendar.MILISECONDS_IN_SECOND ) + 
            ( this.second * ModuleCalendar.MILISECONDS_IN_SECOND ) + this.milisecond;
  }

  pauseDayFromCalendar(){
    return  ( this.year * ModuleCalendar.MONTHS_IN_YEAR * ModuleCalendar.DAYS_IN_MONTH ) + 
            ( ( this.month - 1 ) * ModuleCalendar.DAYS_IN_MONTH) + 
            ( this.day - 1 );
  }

  updateCalendarDateTime(){
    //Update calendar time
    this.milisecond = this.getMilisecondsFromPauseTime();
    this.second = this.getSecondsFromPauseTime();
    this.minute = this.getMinutesFromPauseTime();
    this.hour = this.getHoursFromPauseTime();

    //Update calendar day/month/year
    this.day = this.getDayFromPauseDay();
    this.month = this.getMonthFromPauseDay();
    this.year = this.getYearFromPauseDay();
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

  getDayFromPauseDay(){
    return (this.pauseDay % ModuleCalendar.DAYS_IN_MONTH + 1) | 0;
  }

  getMonthFromPauseDay(){
    return (this.pauseDay / ModuleCalendar.DAYS_IN_MONTH % ModuleCalendar.MONTHS_IN_YEAR + 1) | 0;
  }

  getYearFromPauseDay(){
    return (this.pauseDay / ModuleCalendar.DAYS_IN_MONTH / ModuleCalendar.MONTHS_IN_YEAR) | 0;
  }

  get MAX_DAY_TIME(){
    return ModuleCalendar.HOURS_IN_DAY * (ModuleCalendar.SECONDS_IN_MINUTE * this.minutesPerHour) * ModuleCalendar.MILISECONDS_IN_SECOND;
  }

  static get MILISECONDS_IN_SECOND() {
    return 1000;
  }

  static get SECONDS_IN_MINUTE() {
    return 60;
  }

  static get HOURS_IN_DAY() {
    return 24;
  }

  static get DAYS_IN_MONTH() {
    return 28;
  }

  static get MONTHS_IN_YEAR() {
    return 12;
  }

}
