/**
 * Nested MiniGame Player / Enemy / Obstacle property editors for the Area sidebar.
 *
 * @file ModuleEditorMiniGameEditors.tsx
 */

import React from "react";
import { ForgeMiniGame } from "@/apps/forge/module-editor/ForgeMiniGame";
import { ForgeMGPlayer } from "@/apps/forge/module-editor/ForgeMGPlayer";
import { ForgeMGEnemy } from "@/apps/forge/module-editor/ForgeMGEnemy";
import { ForgeMGGunBank } from "@/apps/forge/module-editor/ForgeMGGunBank";
import { ForgeMGObstacle } from "@/apps/forge/module-editor/ForgeMGObstacle";
import { IModelListItem } from "@/interface/module/minigame/IModelListItem";

type MarkFn = (coalesceKey?: string) => void;

function ScalarRow(props: { label: string; children: React.ReactNode }){
  return (
    <div className="property-editor-row">
      <label className="property-editor-label property-editor-label--ellipsis">{props.label}:</label>
      {props.children}
    </div>
  );
}

function NumberField(props: { value: number; onChange: (value: number) => void; step?: string }){
  return (
    <input
      className="property-editor-input"
      type="number"
      step={props.step || "1"}
      value={props.value}
      onChange={(e) => props.onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

function TextField(props: { value: string; onChange: (value: string) => void }){
  return (
    <input
      className="property-editor-input"
      type="text"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

function BoolField(props: { value: boolean; onChange: (value: boolean) => void }){
  return (
    <input
      className="property-editor-checkbox"
      type="checkbox"
      checked={props.value}
      onChange={(e) => props.onChange(e.target.checked)}
    />
  );
}

function CollapsibleSection(props: { title: string; children: React.ReactNode; defaultOpen?: boolean }){
  const [open, setOpen] = React.useState(props.defaultOpen ?? false);
  return (
    <div className="git-instance-properties-editor__section">
      <button
        type="button"
        className="git-instance-properties-editor__section-header"
        onClick={() => setOpen((v) => !v)}
      >
        <i className={`fa-solid ${open ? "fa-chevron-down" : "fa-chevron-right"}`} aria-hidden="true" />
        <span>{props.title}</span>
      </button>
      {open ? <div className="git-instance-properties-editor__section-body">{props.children}</div> : null}
    </div>
  );
}

function ModelsEditor(props: { models: IModelListItem[]; mark: MarkFn; keyPrefix: string }){
  const { models, mark, keyPrefix } = props;
  return (
    <div>
      <div className="property-editor-row">
        <label className="property-editor-label">Models</label>
        <button
          type="button"
          className="forge-btn"
          onClick={() => {
            models.push({ model: "", rotating: false });
            mark();
          }}
        >
          Add
        </button>
      </div>
      {models.map((m, i) => (
        <div key={`${keyPrefix}-model-${i}`} className="property-editor-row">
          <TextField
            value={m.model || ""}
            onChange={(v) => {
              m.model = v;
              mark(`${keyPrefix}-model-${i}`);
            }}
          />
          <BoolField
            value={!!m.rotating}
            onChange={(v) => {
              m.rotating = v;
              mark();
            }}
          />
          <button
            type="button"
            className="forge-btn"
            onClick={() => {
              models.splice(i, 1);
              mark();
            }}
          >
            Del
          </button>
        </div>
      ))}
    </div>
  );
}

function GunBankEditor(props: {
  bank: ForgeMGGunBank;
  mark: MarkFn;
  keyPrefix: string;
  isEnemy: boolean;
}){
  const { bank, mark, keyPrefix, isEnemy } = props;
  bank.isEnemyBank = isEnemy;
  const bullet = bank.bullet;
  return (
    <div className="git-instance-properties-editor__nested">
      <ScalarRow label="Bank ID">
        <NumberField value={bank.bankID} onChange={(v) => { bank.bankID = v; mark(`${keyPrefix}-id`); }} />
      </ScalarRow>
      <ScalarRow label="Gun Model">
        <TextField value={bank.gunModel} onChange={(v) => { bank.gunModel = v; mark(`${keyPrefix}-gm`); }} />
      </ScalarRow>
      <ScalarRow label="Fire Sound">
        <TextField value={bank.fireSound} onChange={(v) => { bank.fireSound = v; mark(`${keyPrefix}-fs`); }} />
      </ScalarRow>
      {isEnemy ? (
        <>
          <ScalarRow label="Horiz Spread">
            <NumberField step="0.01" value={bank.horizSpread} onChange={(v) => { bank.horizSpread = v; mark(`${keyPrefix}-hs`); }} />
          </ScalarRow>
          <ScalarRow label="Vert Spread">
            <NumberField step="0.01" value={bank.vertSpread} onChange={(v) => { bank.vertSpread = v; mark(`${keyPrefix}-vs`); }} />
          </ScalarRow>
          <ScalarRow label="Inaccuracy">
            <NumberField step="0.01" value={bank.inaccuracy} onChange={(v) => { bank.inaccuracy = v; mark(`${keyPrefix}-in`); }} />
          </ScalarRow>
          <ScalarRow label="Sensing Radius">
            <NumberField step="0.01" value={bank.sensingRadius} onChange={(v) => { bank.sensingRadius = v; mark(`${keyPrefix}-sr`); }} />
          </ScalarRow>
        </>
      ) : null}
      <ScalarRow label="Bullet Model">
        <TextField value={bullet.bulletModel} onChange={(v) => { bullet.bulletModel = v; mark(`${keyPrefix}-bm`); }} />
      </ScalarRow>
      <ScalarRow label="Collision Sound">
        <TextField value={bullet.collisionSound} onChange={(v) => { bullet.collisionSound = v; mark(`${keyPrefix}-cs`); }} />
      </ScalarRow>
      <ScalarRow label="Damage">
        <NumberField value={bullet.damage} onChange={(v) => { bullet.damage = v; mark(`${keyPrefix}-dmg`); }} />
      </ScalarRow>
      <ScalarRow label="Lifespan">
        <NumberField step="0.01" value={bullet.lifespan} onChange={(v) => { bullet.lifespan = v; mark(`${keyPrefix}-ls`); }} />
      </ScalarRow>
      <ScalarRow label="Rate Of Fire">
        <NumberField step="0.01" value={bullet.rateOfFire} onChange={(v) => { bullet.rateOfFire = v; mark(`${keyPrefix}-rof`); }} />
      </ScalarRow>
      <ScalarRow label="Speed">
        <NumberField step="0.01" value={bullet.speed} onChange={(v) => { bullet.speed = v; mark(`${keyPrefix}-spd`); }} />
      </ScalarRow>
      <ScalarRow label="Target Type">
        <NumberField value={bullet.targetType} onChange={(v) => { bullet.targetType = v; mark(`${keyPrefix}-tt`); }} />
      </ScalarRow>
    </div>
  );
}

function GunBanksList(props: {
  banks: ForgeMGGunBank[];
  mark: MarkFn;
  keyPrefix: string;
  isEnemy: boolean;
}){
  const { banks, mark, keyPrefix, isEnemy } = props;
  return (
    <div>
      <div className="property-editor-row">
        <label className="property-editor-label">Gun Banks</label>
        <button
          type="button"
          className="forge-btn"
          onClick={() => {
            banks.push(ForgeMGGunBank.createDefault(isEnemy));
            mark();
          }}
        >
          Add
        </button>
      </div>
      {banks.map((bank, i) => (
        <CollapsibleSection key={`${keyPrefix}-bank-${i}`} title={`Bank ${i} (ID ${bank.bankID})`}>
          <GunBankEditor bank={bank} mark={mark} keyPrefix={`${keyPrefix}-bank-${i}`} isEnemy={isEnemy} />
          <button
            type="button"
            className="forge-btn"
            onClick={() => {
              banks.splice(i, 1);
              mark();
            }}
          >
            Remove Bank
          </button>
        </CollapsibleSection>
      ))}
    </div>
  );
}

function PlayerEditor(props: { player: ForgeMGPlayer; mark: MarkFn }){
  const { player, mark } = props;
  return (
    <CollapsibleSection title="Player" defaultOpen={false}>
      <ScalarRow label="Track">
        <TextField value={player.trackName} onChange={(v) => { player.trackName = v; mark("mg-p-track"); }} />
      </ScalarRow>
      <ScalarRow label="Accel Secs">
        <NumberField step="0.01" value={player.accel_secs} onChange={(v) => { player.accel_secs = v; mark("mg-p-accel"); }} />
      </ScalarRow>
      <ScalarRow label="Min Speed">
        <NumberField step="0.01" value={player.minimum_speed} onChange={(v) => { player.minimum_speed = v; mark("mg-p-mins"); }} />
      </ScalarRow>
      <ScalarRow label="Max Speed">
        <NumberField step="0.01" value={player.maximum_speed} onChange={(v) => { player.maximum_speed = v; mark("mg-p-maxs"); }} />
      </ScalarRow>
      <ScalarRow label="Hit Points">
        <NumberField value={player.hit_points} onChange={(v) => { player.hit_points = v; mark("mg-p-hp"); }} />
      </ScalarRow>
      <ScalarRow label="Max HPs">
        <NumberField value={player.max_hps} onChange={(v) => { player.max_hps = v; mark("mg-p-mhp"); }} />
      </ScalarRow>
      <ScalarRow label="Sphere Radius">
        <NumberField step="0.01" value={player.sphere_radius} onChange={(v) => { player.sphere_radius = v; mark("mg-p-sr"); }} />
      </ScalarRow>
      <ScalarRow label="Start Offset X/Y/Z">
        <NumberField step="0.01" value={player.startOffsetX} onChange={(v) => { player.startOffsetX = v; mark("mg-p-sox"); }} />
        <NumberField step="0.01" value={player.startOffsetY} onChange={(v) => { player.startOffsetY = v; mark("mg-p-soy"); }} />
        <NumberField step="0.01" value={player.startOffsetZ} onChange={(v) => { player.startOffsetZ = v; mark("mg-p-soz"); }} />
      </ScalarRow>
      <ScalarRow label="Target Offset X/Y/Z">
        <NumberField step="0.01" value={player.targetOffsetX} onChange={(v) => { player.targetOffsetX = v; mark("mg-p-tox"); }} />
        <NumberField step="0.01" value={player.targetOffsetY} onChange={(v) => { player.targetOffsetY = v; mark("mg-p-toy"); }} />
        <NumberField step="0.01" value={player.targetOffsetZ} onChange={(v) => { player.targetOffsetZ = v; mark("mg-p-toz"); }} />
      </ScalarRow>
      <ScalarRow label="Tunnel +X/+Y/+Z">
        <NumberField step="0.01" value={player.tunnelXPos} onChange={(v) => { player.tunnelXPos = v; mark("mg-p-txp"); }} />
        <NumberField step="0.01" value={player.tunnelYPos} onChange={(v) => { player.tunnelYPos = v; mark("mg-p-typ"); }} />
        <NumberField step="0.01" value={player.tunnelZPos} onChange={(v) => { player.tunnelZPos = v; mark("mg-p-tzp"); }} />
      </ScalarRow>
      <ScalarRow label="Tunnel -X/-Y/-Z">
        <NumberField step="0.01" value={player.tunnelXNeg} onChange={(v) => { player.tunnelXNeg = v; mark("mg-p-txn"); }} />
        <NumberField step="0.01" value={player.tunnelYNeg} onChange={(v) => { player.tunnelYNeg = v; mark("mg-p-tyn"); }} />
        <NumberField step="0.01" value={player.tunnelZNeg} onChange={(v) => { player.tunnelZNeg = v; mark("mg-p-tzn"); }} />
      </ScalarRow>
      <ModelsEditor models={player.modelProps} mark={mark} keyPrefix="mg-p" />
      <GunBanksList banks={player.gunBanks} mark={mark} keyPrefix="mg-p" isEnemy={false} />
    </CollapsibleSection>
  );
}

function EnemyEditor(props: { enemy: ForgeMGEnemy; index: number; mark: MarkFn; onRemove: () => void }){
  const { enemy, index, mark, onRemove } = props;
  return (
    <CollapsibleSection title={`Enemy ${index}${enemy.trackName ? ` (${enemy.trackName})` : ""}`}>
      <ScalarRow label="Track">
        <TextField value={enemy.trackName} onChange={(v) => { enemy.trackName = v; mark(`mg-e${index}-track`); }} />
      </ScalarRow>
      <ScalarRow label="Hit Points">
        <NumberField value={enemy.hit_points} onChange={(v) => { enemy.hit_points = v; mark(`mg-e${index}-hp`); }} />
      </ScalarRow>
      <ScalarRow label="Max HPs">
        <NumberField value={enemy.max_hps} onChange={(v) => { enemy.max_hps = v; mark(`mg-e${index}-mhp`); }} />
      </ScalarRow>
      <ScalarRow label="Bump Damage">
        <NumberField value={enemy.bump_damage} onChange={(v) => { enemy.bump_damage = v; mark(`mg-e${index}-bd`); }} />
      </ScalarRow>
      <ScalarRow label="Sphere Radius">
        <NumberField step="0.01" value={enemy.sphere_radius} onChange={(v) => { enemy.sphere_radius = v; mark(`mg-e${index}-sr`); }} />
      </ScalarRow>
      <ScalarRow label="Num Loops">
        <NumberField value={enemy.num_loops} onChange={(v) => { enemy.num_loops = v; mark(`mg-e${index}-nl`); }} />
      </ScalarRow>
      <ScalarRow label="Trigger">
        <NumberField value={enemy.trigger} onChange={(v) => { enemy.trigger = v; mark(`mg-e${index}-tr`); }} />
      </ScalarRow>
      <ScalarRow label="Invince Period">
        <NumberField step="0.01" value={enemy.invince_period} onChange={(v) => { enemy.invince_period = v; mark(`mg-e${index}-ip`); }} />
      </ScalarRow>
      <ModelsEditor models={enemy.modelProps} mark={mark} keyPrefix={`mg-e${index}`} />
      <GunBanksList banks={enemy.gunBanks} mark={mark} keyPrefix={`mg-e${index}`} isEnemy={true} />
      <button type="button" className="forge-btn" onClick={onRemove}>Remove Enemy</button>
    </CollapsibleSection>
  );
}

const OBSTACLE_SCRIPTS = ["OnAnimEvent", "OnCreate", "OnHeartbeat", "OnHitBullet", "OnHitFollower"];

function ObstacleEditor(props: { obstacle: ForgeMGObstacle; index: number; mark: MarkFn; onRemove: () => void }){
  const { obstacle, index, mark, onRemove } = props;
  return (
    <CollapsibleSection title={`Obstacle ${index}${obstacle.name ? ` (${obstacle.name})` : ""}`}>
      <ScalarRow label="Name">
        <TextField value={obstacle.name} onChange={(v) => { obstacle.name = v; mark(`mg-o${index}-name`); }} />
      </ScalarRow>
      {OBSTACLE_SCRIPTS.map((key) => (
        <ScalarRow key={key} label={key}>
          <TextField
            value={obstacle.scripts[key] || ""}
            onChange={(v) => {
              obstacle.scripts[key] = v;
              mark(`mg-o${index}-${key}`);
            }}
          />
        </ScalarRow>
      ))}
      <button type="button" className="forge-btn" onClick={onRemove}>Remove Obstacle</button>
    </CollapsibleSection>
  );
}

export function MiniGameNestedEditors(props: { miniGame: ForgeMiniGame; mark: MarkFn }){
  const { miniGame, mark } = props;
  return (
    <>
      {miniGame.player ? <PlayerEditor player={miniGame.player} mark={mark} /> : null}
      <CollapsibleSection title={`Enemies (${miniGame.enemies.length})`}>
        <button
          type="button"
          className="forge-btn"
          onClick={() => {
            miniGame.addEnemy();
            mark();
          }}
        >
          Add Enemy
        </button>
        {miniGame.enemies.map((enemy, i) => (
          <EnemyEditor
            key={`enemy-${i}`}
            enemy={enemy}
            index={i}
            mark={mark}
            onRemove={() => {
              miniGame.removeEnemy(i);
              mark();
            }}
          />
        ))}
      </CollapsibleSection>
      <CollapsibleSection title={`Obstacles (${miniGame.obstacles.length})`}>
        <button
          type="button"
          className="forge-btn"
          onClick={() => {
            miniGame.addObstacle();
            mark();
          }}
        >
          Add Obstacle
        </button>
        {miniGame.obstacles.map((obstacle, i) => (
          <ObstacleEditor
            key={`obstacle-${i}`}
            obstacle={obstacle}
            index={i}
            mark={mark}
            onRemove={() => {
              miniGame.removeObstacle(i);
              mark();
            }}
          />
        ))}
      </CollapsibleSection>
    </>
  );
}
