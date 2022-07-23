import { Injectable,Injector } from '@angular/core';
import { Subject } from 'rxjs';
import { CharacterService } from './character.service';

const TICK_INTERVAL_MS = 25;
const LONG_TICK_INTERVAL_MS = 500;

export interface MainLoopProperties {
  unlockFastSpeed: boolean,
  unlockFasterSpeed: boolean,
  unlockFastestSpeed: boolean,
  lastTime: number;
  tickDivider: number;
  pause: boolean;
  bankedTicks: number;
  totalTicks: number;
  useBankedTicks: boolean
}

@Injectable({
  providedIn: 'root'
})
export class MainLoopService {
  /**
   * Sends true on new day
   */
  tickSubject = new Subject<boolean>();
  longTickSubject = new Subject<boolean>();
  pause = true;
  tickDivider = 10;
  tickCount = 0;
  totalTicks = 0;
  unlockFastSpeed = false;
  unlockFasterSpeed = false;
  unlockFastestSpeed = false;
  lastTime: number = new Date().getTime();
  bankedTicks = 0;
  offlineDivider = 10;
  characterService?: CharacterService;
  useBankedTicks = true;

  constructor(
    private injector: Injector) {
  }

  getProperties(): MainLoopProperties {
    return {
      unlockFastSpeed: this.unlockFastSpeed,
      unlockFasterSpeed: this.unlockFasterSpeed,
      unlockFastestSpeed: this.unlockFastestSpeed,
      lastTime: this.lastTime,
      tickDivider: this.tickDivider,
      pause: this.pause,
      bankedTicks: this.bankedTicks,
      totalTicks: this.totalTicks,
      useBankedTicks: this.useBankedTicks
    }
  }

  setProperties(properties: MainLoopProperties) {
    this.unlockFastSpeed = properties.unlockFastSpeed;
    this.unlockFasterSpeed = properties.unlockFasterSpeed;
    this.unlockFastestSpeed = properties.unlockFastestSpeed;
    this.tickDivider = properties.tickDivider;
    this.pause = properties.pause;
    this.lastTime = properties.lastTime;
    const newTime = new Date().getTime();
    this.bankedTicks = properties.bankedTicks + Math.floor((newTime - this.lastTime) / (TICK_INTERVAL_MS * this.offlineDivider));
    this.lastTime = newTime;
    this.totalTicks = properties.totalTicks || 0;
    if (properties.useBankedTicks === undefined){
      this.useBankedTicks = true;
    } else {
      this.useBankedTicks = properties.useBankedTicks;
    }
  }

  start() {
    if (!this.characterService){
      this.characterService = this.injector.get(CharacterService);
    }

    window.setInterval(()=> {
      this.longTickSubject.next(true);
    }, LONG_TICK_INTERVAL_MS);

    window.setInterval(()=> {
      const newTime = new Date().getTime();
      const timeDiff = newTime - this.lastTime;
      this.lastTime = newTime;
      let repeatTimes = 1;
      // do multiple tick events if chrome has been throttling the interval (cause the tab isn't active)
      let realTicks = Math.max(1, timeDiff / TICK_INTERVAL_MS)
      if (this.pause) {
        this.bankedTicks += realTicks/this.offlineDivider;
      } else {
        if (this.characterService) {
          // should never be null but this keeps the compiler happy
          if (this.characterService.characterState.lifespan > 36500){
            // add one extra tick at 100 years lifespan
            repeatTimes++;
          }
          if (this.characterService.characterState.lifespan > 365000){
            // and an extra tick at 1000 years lifespan
            repeatTimes++;
          }
          // and one extra for every 5000 years you've ever lived, up to 100 repeats
          repeatTimes += Math.min(Math.floor(this.totalTicks / 1825000), 100);
        }
        if (this.bankedTicks > 0 && this.useBankedTicks){
          //using banked ticks makes time happen 10 times faster
          realTicks *= 10;
          this.bankedTicks -= realTicks;
        }
        repeatTimes *= realTicks;
        repeatTimes = Math.floor(repeatTimes);
        if (repeatTimes > 36500*this.tickDivider) {
          // 100y/tick hardcap to help prevent too much lag; this shouldn't ever actually trigger in a normal situation
          repeatTimes = 36500*this.tickDivider;
        }
        for (let i = 0; i < repeatTimes; i++){
          this.tickCount++;
          if (this.tickCount >= this.tickDivider){
            this.tickCount = 0;
            if (!this.pause) {
              this.tick();
            }
          }
        }
      }
    }, TICK_INTERVAL_MS);
  }

  tick(){
    this.totalTicks++;
    this.tickSubject.next(true);
  }
}
