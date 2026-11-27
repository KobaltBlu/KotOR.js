import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #768: K2-name-matched-inheritance. */
export const IsMoviePlaying: INWScriptDefAction = {
    comment: "768. IsMoviePlaying\nChecks if a movie is currently playing.\n",
    name: "IsMoviePlaying",
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return GameState.VideoManager.isMoviePlaying() ? 1 : 0;
    }
  };

/** Upstream 002dfe03, action #769: K2-name-matched-inheritance. */
export const QueueMovie: INWScriptDefAction = {
    comment: "769. QueueMovie\nQueues up a movie to be played using PlayMovieQueue.\nIf bSkippable is TRUE, the player can cancel the movie by hitting escape.\nIf bSkippable is FALSE, the player cannot cancel the movie and must wait\nfor it to finish playing.\n",
    name: "QueueMovie",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.STRING, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [string, number]){
      GameState.VideoManager.queueMovie(args[0], args[1] === 1);
    }
  };

/** Upstream 002dfe03, action #770: upstream-body-changed. */
export const PlayMovieQueue: INWScriptDefAction = {
    comment: "770. PlayMovieQueue\nPlays the movies that have been added to the queue by QueueMovie\nIf bAllowSeparateSkips is TRUE, hitting escape to cancel a movie only\ncancels out of the currently playing movie rather than the entire queue\nof movies (assuming the currently playing movie is flagged as skippable).\nIf bAllowSeparateSkips is FALSE, the entire movie queue will be cancelled\nif the player hits escape (assuming the currently playing movie is flagged\nas skippable).\n",
    name: "PlayMovieQueue",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.INTEGER],
    action: async function(this: NWScriptInstance, args: [number]){
      for(const movie of GameState.VideoManager.movieQueue){
        movie.skippable = args[0] === NW_TRUE;
      }
      await GameState.VideoManager.playMovieQueue();
    }
  };
