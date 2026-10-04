import * as THREE from "three";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";


export const SWMG_GetObjectByName = defineAction({
  id: 585,
  name: "SWMG_GetObjectByName",
  comment: "585: Get a minigame object by its name.",
  returnType: NWScriptDataType.OBJECT,
  params: [stringParam("sName")] as const,
  kotor(this: NWScriptInstance, sName) {
    for (const obstacle of GameState.module.area.miniGame.obstacles) {
      if (obstacle.name === sName) return obstacle;
    }
    for (const enemy of GameState.module.area.miniGame.enemies) {
      if (enemy.name === sName) return enemy;
    }
    return undefined;
  },
});

export const SWMG_PlayAnimation = defineAction({
  id: 586,
  name: "SWMG_PlayAnimation",
  comment: "586: Play an animation on a minigame object.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oObject"),
    stringParam("sAnimation"),
    intParam("bLoop", { optional: true, default: 0 }),
    intParam("nBlendInMs", { optional: true, default: 0 }),
    intParam("nBlendOutMs", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oObject, sAnimation, bLoop, nBlendInMs, nBlendOutMs) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGPlayer) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGEnemy)
    ) {
      (oObject as ModuleMGPlayer | ModuleMGEnemy).playAnimation(sAnimation, bLoop, nBlendInMs, nBlendOutMs);
    }
  },
});

export const SWMG_AdjustFollowerHitPoints = defineAction({
  id: 590,
  name: "SWMG_AdjustFollowerHitPoints",
  comment: "590: Adjust a follower's hit points.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject>("oFollower"),
    intParam("nAmount"),
    intParam("bAbsoluteValue", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oFollower, nAmount, bAbsoluteValue) {
    if (
      BitWise.InstanceOfObject(oFollower, ModuleObjectType.ModuleMGEnemy) ||
      BitWise.InstanceOfObject(oFollower, ModuleObjectType.ModuleMGObstacle) ||
      BitWise.InstanceOfObject(oFollower, ModuleObjectType.ModuleMGPlayer)
    ) {
      (oFollower as ModuleMGPlayer | ModuleMGEnemy | ModuleMGObstacle).adjustHitPoints(nAmount, bAbsoluteValue);
    }
    return 0;
  },
});

export const SWMG_IsFollower = defineAction({
  id: 599,
  name: "SWMG_IsFollower",
  comment: "599: Return whether the object is a minigame follower/enemy.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    return GameState.module.area.miniGame.enemies.indexOf(oObject as ModuleMGEnemy) >= 0 ? NW_TRUE : NW_FALSE;
  },
});

export const SWMG_IsPlayer = defineAction({
  id: 600,
  name: "SWMG_IsPlayer",
  comment: "600: Return whether the object is the minigame player.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    return GameState.module.area.miniGame.player === oObject ? NW_TRUE : NW_FALSE;
  },
});

export const SWMG_IsEnemy = defineAction({
  id: 601,
  name: "SWMG_IsEnemy",
  comment: "601: Return whether the object is a minigame enemy.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    return GameState.module.area.miniGame.enemies.indexOf(oObject as ModuleMGEnemy) >= 0;
  },
});

export const SWMG_IsObstacle = defineAction({
  id: 603,
  name: "SWMG_IsObstacle",
  comment: "603: Return whether the object is a minigame obstacle.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    return GameState.module.area.miniGame.obstacles.indexOf(oObject as ModuleMGObstacle) >= 0;
  },
});

export const SWMG_GetPlayer = defineAction({
  id: 611,
  name: "SWMG_GetPlayer",
  comment: "611: Get the minigame player.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.player;
  },
});

export const SWMG_GetEnemyCount = defineAction({
  id: 612,
  name: "SWMG_GetEnemyCount",
  comment: "612: Get the number of minigame enemies.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.enemies.length;
  },
});

export const SWMG_GetEnemy = defineAction({
  id: 613,
  name: "SWMG_GetEnemy",
  comment: "613: Get a minigame enemy by index.",
  returnType: NWScriptDataType.OBJECT,
  params: [intParam("nIndex")] as const,
  kotor(this: NWScriptInstance, nIndex) {
    return GameState.module.area.miniGame.enemies[nIndex];
  },
});

export const SWMG_GetObstacleCount = defineAction({
  id: 614,
  name: "SWMG_GetObstacleCount",
  comment: "614: Get the number of minigame obstacles.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.obstacles.length;
  },
});

export const SWMG_GetObstacle = defineAction({
  id: 615,
  name: "SWMG_GetObstacle",
  comment: "615: Get a minigame obstacle by index.",
  returnType: NWScriptDataType.OBJECT,
  params: [intParam("nIndex")] as const,
  kotor(this: NWScriptInstance, nIndex) {
    return GameState.module.area.miniGame.obstacles[nIndex];
  },
});

export const SWMG_GetHitPoints = defineAction({
  id: 616,
  name: "SWMG_GetHitPoints",
  comment: "616: Get hit points for a minigame object.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGEnemy) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGObstacle)
    ) {
      return (oObject as ModuleMGEnemy | ModuleMGObstacle).hit_points;
    }
    return 0;
  },
});

export const SWMG_GetMaxHitPoints = defineAction({
  id: 617,
  name: "SWMG_GetMaxHitPoints",
  comment: "617: Get max hit points for a minigame object.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGEnemy) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGObstacle)
    ) {
      return (oObject as ModuleMGEnemy | ModuleMGObstacle).max_hps;
    }
    return 0;
  },
});

export const SWMG_GetPosition = defineAction({
  id: 623,
  name: "SWMG_GetPosition",
  comment: "623: Get the world position of a minigame object.",
  returnType: NWScriptDataType.VECTOR,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGPlayer) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGEnemy)
    ) {
      const vec3 = new THREE.Vector3();
      oObject.model.getWorldPosition(vec3);
      return vec3;
    }
    return { x: 0, y: 0, z: 0 };
  },
});

export const SWMG_GetPlayerOffset = defineAction({
  id: 641,
  name: "SWMG_GetPlayerOffset",
  comment: "641: Get the player offset vector for minigames.",
  returnType: NWScriptDataType.VECTOR,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (GameState.module.area.miniGame.type === 2) {
      const rot = GameState.module.area.miniGame.player.rotation;
      return new THREE.Vector3(
        THREE.MathUtils.radToDeg(rot.x),
        THREE.MathUtils.radToDeg(rot.y),
        THREE.MathUtils.radToDeg(rot.z),
      );
    }
    return GameState.module.area.miniGame.player.position;
  },
});

export const SWMG_GetPlayerSpeed = defineAction({
  id: 643,
  name: "SWMG_GetPlayerSpeed",
  comment: "643: Get the player character's speed.",
  returnType: NWScriptDataType.FLOAT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.player.speed;
  },
});

export const SWMG_SetPlayerSpeed = defineAction({
  id: 649,
  name: "SWMG_SetPlayerSpeed",
  comment: "649: Set the player character's speed.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fSpeed")] as const,
  kotor(this: NWScriptInstance, fSpeed) {
    GameState.module.area.miniGame.player.speed = fSpeed;
  },
});

export const SWMG_GetIsInvulnerable = defineAction({
  id: 665,
  name: "SWMG_GetIsInvulnerable",
  comment: "665: Return whether the follower object is currently invulnerable.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGObstacle) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGEnemy) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGPlayer)
    ) {
      return (oObject as ModuleMGPlayer | ModuleMGEnemy | ModuleMGObstacle).invince > 0 ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const SWMG_StartInvulnerability = defineAction({
  id: 666,
  name: "SWMG_StartInvulnerability",
  comment: "666: Begin a period of invulnerability.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGObstacle) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGEnemy) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGPlayer)
    ) {
      (oObject as ModuleMGPlayer | ModuleMGEnemy | ModuleMGObstacle).startInvulnerability();
    }
  },
});


export const SWMG_OnBulletHit = defineAction({
  id: 591,
  name: "SWMG_OnBulletHit",
  comment: "591: The default implementation of OnBulletHit.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    // No-op: default bullet hit handler
  },
});

export const SWMG_OnObstacleHit = defineAction({
  id: 592,
  name: "SWMG_OnObstacleHit",
  comment: "592: The default implementation of OnObstacleHit.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    // No-op: default obstacle hit handler
  },
});

export const SWMG_GetLastFollowerHit = defineAction({
  id: 593,
  name: "SWMG_GetLastFollowerHit",
  comment: "593: Returns the last follower hit.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.mgFollower ?? undefined;
  },
});

export const SWMG_GetLastObstacleHit = defineAction({
  id: 594,
  name: "SWMG_GetLastObstacleHit",
  comment: "594: Returns the last obstacle hit.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.mgObstacle ?? undefined;
  },
});

export const SWMG_GetObjectName = defineAction({
  id: 597,
  name: "SWMG_GetObjectName",
  comment: "597: Gets an object's name.",
  returnType: NWScriptDataType.STRING,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.name || "";
    }
    return "";
  },
});

export const SWMG_OnDeath = defineAction({
  id: 598,
  name: "SWMG_OnDeath",
  comment: "598: The default implementation of OnDeath.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    // No-op: default death handler
  },
});

export const SWMG_IsTrigger = defineAction({
  id: 602,
  name: "SWMG_IsTrigger",
  comment: "602: SWMG_IsTrigger",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    return 0; // Triggers not separated in current implementation
  },
});

export const SWMG_SetFollowerHitPoints = defineAction({
  id: 604,
  name: "SWMG_SetFollowerHitPoints",
  comment: "604: SWMG_SetFollowerHitPoints",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    intParam("nHitPoints"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, nHitPoints) {
    // TODO: set follower HP
  },
});

export const SWMG_OnDamage = defineAction({
  id: 605,
  name: "SWMG_OnDamage",
  comment: "605: SWMG_OnDamage",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    // No-op: default damage handler
  },
});

export const SWMG_RemoveAnimation = defineAction({
  id: 607,
  name: "SWMG_RemoveAnimation",
  comment: "607: SWMG_RemoveAnimation",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    stringParam("sAnimation"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, sAnimation) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGPlayer) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleMGEnemy)
    ) {
      (oObject as ModuleMGPlayer | ModuleMGEnemy).removeAnimation(sAnimation);
    }
  },
});

export const SWMG_GetPlayerMinSpeed = defineAction({
  id: 644,
  name: "SWMG_GetPlayerMinSpeed",
  comment: "644: SWMG_GetPlayerMinSpeed",
  returnType: NWScriptDataType.FLOAT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.player.speed_min;
  },
});

export const SWMG_GetPlayerAccelerationPerSecond = defineAction({
  id: 645,
  name: "SWMG_GetPlayerAccelerationPerSecond",
  comment: "645: SWMG_GetPlayerAccelerationPerSecond",
  returnType: NWScriptDataType.FLOAT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.player.accel_secs;
  },
});

export const SWMG_GetPlayerTunnelPos = defineAction({
  id: 646,
  name: "SWMG_GetPlayerTunnelPos",
  comment: "646: SWMG_GetPlayerTunnelPos",
  returnType: NWScriptDataType.VECTOR,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.player.tunnel.pos;
  },
});

export const SWMG_SetPlayerOffset = defineAction({
  id: 647,
  name: "SWMG_SetPlayerOffset",
  comment: "647: SWMG_SetPlayerOffset",
  returnType: NWScriptDataType.VOID,
  params: [vectorParam<THREE.Vector3>("vOffset")] as const,
  kotor(this: NWScriptInstance, vOffset) {
    GameState.module.area.miniGame.player.position.copy(vOffset);
  },
});

export const SWMG_SetPlayerMinSpeed = defineAction({
  id: 650,
  name: "SWMG_SetPlayerMinSpeed",
  comment: "650: SWMG_SetPlayerMinSpeed",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fMinSpeed")] as const,
  kotor(this: NWScriptInstance, fMinSpeed) {
    GameState.module.area.miniGame.player.speed_min = fMinSpeed;
  },
});

export const SWMG_SetPlayerAccelerationPerSecond = defineAction({
  id: 651,
  name: "SWMG_SetPlayerAccelerationPerSecond",
  comment: "651: SWMG_SetPlayerAccelerationPerSecond",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fAcceleration")] as const,
  kotor(this: NWScriptInstance, fAcceleration) {
    GameState.module.area.miniGame.player.accel_secs = fAcceleration;
  },
});

export const SWMG_SetPlayerTunnelPos = defineAction({
  id: 652,
  name: "SWMG_SetPlayerTunnelPos",
  comment: "652: SWMG_SetPlayerTunnelPos",
  returnType: NWScriptDataType.VOID,
  params: [vectorParam<THREE.Vector3>("vPos")] as const,
  kotor(this: NWScriptInstance, vPos) {
    GameState.module.area.miniGame.player.tunnel.pos = vPos;
  },
});

export const SWMG_GetPlayerTunnelNeg = defineAction({
  id: 653,
  name: "SWMG_GetPlayerTunnelNeg",
  comment: "653: SWMG_GetPlayerTunnelNeg",
  returnType: NWScriptDataType.VECTOR,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.player.tunnel.neg;
  },
});

export const SWMG_SetPlayerTunnelNeg = defineAction({
  id: 654,
  name: "SWMG_SetPlayerTunnelNeg",
  comment: "654: SWMG_SetPlayerTunnelNeg",
  returnType: NWScriptDataType.VOID,
  params: [vectorParam<THREE.Vector3>("vNeg")] as const,
  kotor(this: NWScriptInstance, vNeg) {
    GameState.module.area.miniGame.player.tunnel.neg = vNeg;
  },
});

export const SWMG_GetPlayerMaxSpeed = defineAction({
  id: 667,
  name: "SWMG_GetPlayerMaxSpeed",
  comment: "667: GetPlayerMaxSpeed - Returns the player character's max speed.",
  returnType: NWScriptDataType.FLOAT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.miniGame.player.speed_max;
  },
});

export const SWMG_SetPlayerMaxSpeed = defineAction({
  id: 668,
  name: "SWMG_SetPlayerMaxSpeed",
  comment: "668: SetPlayerMaxSpeed - Sets the player character's max speed.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fMaxSpeed")] as const,
  kotor(this: NWScriptInstance, fMaxSpeed) {
    GameState.module.area.miniGame.player.speed_max = fMaxSpeed;
  },
});

export const SWMG_SetSpeedBlurEffect = defineAction({
  id: 563,
  name: "SWMG_SetSpeedBlurEffect",
  comment:
    "563: Turns on or off the speed blur effect in rendered scenes.\n" +
    "bEnabled: Set TRUE to turn it on, FALSE to turn it off.\n" +
    "fRatio: Sets the frame accumulation ratio.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("bEnabled"), floatParam("fRatio")] as const,
  kotor(this: NWScriptInstance, bEnabled, fRatio) {
    // Preserved legacy behavior: old implementation was a TODO/no-op.
  },
});

export const SWMG_GetSwoopUpgrade = defineAction({
  availability: "tsl",
  id: 782,
  name: "SWMG_GetSwoopUpgrade",
  comment: "782: Minigame grabs a swoop bike upgrade.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nIndex")] as const,
  tsl(this: NWScriptInstance, nIndex) {
    switch (nIndex) {
      case 0:
        return GameState.PartyManager.SwoopUpgrade1;
      case 1:
        return GameState.PartyManager.SwoopUpgrade2;
      case 2:
        return GameState.PartyManager.SwoopUpgrade3;
      default:
        return -1;
    }
  },
});

export const ShowSwoopUpgradeScreen = defineAction({
  availability: "tsl",
  id: 785,
  name: "ShowSwoopUpgradeScreen",
  comment: "785: Displays the Swoop Bike upgrade screen.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  tsl(this: NWScriptInstance) {
    GameState.MenuManager.MenuSwoopUp?.open();
  },
});

export const minigameActions = [
  SWMG_GetObjectByName,
  SWMG_PlayAnimation,
  SWMG_AdjustFollowerHitPoints,
  SWMG_IsFollower,
  SWMG_IsPlayer,
  SWMG_IsEnemy,
  SWMG_IsObstacle,
  SWMG_GetPlayer,
  SWMG_GetEnemyCount,
  SWMG_GetEnemy,
  SWMG_GetObstacleCount,
  SWMG_GetObstacle,
  SWMG_GetHitPoints,
  SWMG_GetMaxHitPoints,
  SWMG_GetPosition,
  SWMG_GetPlayerOffset,
  SWMG_GetPlayerSpeed,
  SWMG_SetPlayerSpeed,
  SWMG_GetIsInvulnerable,
  SWMG_StartInvulnerability,
  SWMG_OnBulletHit,
  SWMG_OnObstacleHit,
  SWMG_GetLastFollowerHit,
  SWMG_GetLastObstacleHit,
  SWMG_GetObjectName,
  SWMG_OnDeath,
  SWMG_IsTrigger,
  SWMG_SetFollowerHitPoints,
  SWMG_OnDamage,
  SWMG_RemoveAnimation,
  SWMG_GetPlayerMinSpeed,
  SWMG_GetPlayerAccelerationPerSecond,
  SWMG_GetPlayerTunnelPos,
  SWMG_SetPlayerOffset,
  SWMG_SetPlayerMinSpeed,
  SWMG_SetPlayerAccelerationPerSecond,
  SWMG_SetPlayerTunnelPos,
  SWMG_GetPlayerTunnelNeg,
  SWMG_SetPlayerTunnelNeg,
  SWMG_SetSpeedBlurEffect,
  SWMG_GetPlayerMaxSpeed,
  SWMG_SetPlayerMaxSpeed,
  SWMG_GetSwoopUpgrade,
  ShowSwoopUpgradeScreen,
] as const;