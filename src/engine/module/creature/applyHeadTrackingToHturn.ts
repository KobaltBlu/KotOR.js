type HturnBone = {
  rotation: { x: number; z: number };
  userData?: Record<string, unknown>;
  /** Optional THREE.Object3D / OdysseyObject3D dirty hook target. */
  updateMatrix?: () => void;
  matrixWorldNeedsUpdate?: boolean;
};

type HturnLookUserData = {
  _hturnAnimX?: number;
  _hturnAnimZ?: number;
  _hturnComposedX?: number;
  _hturnComposedZ?: number;
};

/**
 * Restore post-anim hturn baselines before the next model.update.
 * Look must not remain on the bone overnight - anim blend from a looked pose
 * leaves remnants that applyHeadTrackingToHturn can bake into _hturnAnimX/Z.
 * No-op until applyHeadTrackingToHturn has stored baselines.
 */
export function stripHeadTrackingFromHturn(hturn: HturnBone): void {
  const ud = hturn.userData as HturnLookUserData | undefined;
  if(!ud || typeof ud._hturnAnimX !== 'number' || typeof ud._hturnAnimZ !== 'number'){
    return;
  }
  hturn.rotation.x = ud._hturnAnimX;
  hturn.rotation.z = ud._hturnAnimZ;
}

/**
 * Apply creature look-at offsets onto hturn_g after animation has posed it.
 *
 * Must not force idle axes to 0 - female models use a neck/hturn bind cancel
 * (+/-0.1745). Wiping hturn.x after anim makes Model B heads look down.
 *
 * Must not `+=` pitch every frame - anims that skip hturn (e.g. listen) leave
 * last frame's look in the euler, and += accumulates into a spin.
 * Compose look against a tracked post-anim baseline instead.
 *
 * Sticky detection compares against the last composed (x,z) pair, not
 * anim+prevLook per axis. Tiny Euler/quat drift (>1e-4) otherwise looks like
 * an anim write, bakes look into the baseline, and double-applies pitch.
 * Prefer stripHeadTrackingFromHturn before model.update so anim never blends
 * from a looked pose.
 */
export function applyHeadTrackingToHturn(
  hturn: HturnBone,
  yaw: number,
  pitch: number,
  epsilon = 0.001,
): void {
  const ud = (hturn.userData || (hturn.userData = {})) as HturnLookUserData;

  const stickyEps = 1e-3;
  const hasComposed =
    typeof ud._hturnComposedX === 'number' && typeof ud._hturnComposedZ === 'number';
  const sticky =
    hasComposed &&
    Math.abs(hturn.rotation.x - (ud._hturnComposedX as number)) <= stickyEps &&
    Math.abs(hturn.rotation.z - (ud._hturnComposedZ as number)) <= stickyEps;

  if(sticky){
    hturn.rotation.x = ud._hturnAnimX as number;
    hturn.rotation.z = ud._hturnAnimZ as number;
  }else{
    ud._hturnAnimX = hturn.rotation.x;
    ud._hturnAnimZ = hturn.rotation.z;
  }

  const lookPitch = Math.abs(pitch) > epsilon ? pitch : 0;
  const lookYaw = Math.abs(yaw) > epsilon ? yaw : undefined;

  hturn.rotation.x = (ud._hturnAnimX as number) + lookPitch;
  if(typeof lookYaw === 'number'){
    hturn.rotation.z = lookYaw;
  }else{
    hturn.rotation.z = ud._hturnAnimZ as number;
  }

  ud._hturnComposedX = hturn.rotation.x;
  ud._hturnComposedZ = hturn.rotation.z;

  // Euler look writes bypass animation controllers — keep local/world matrices valid.
  if(typeof hturn.updateMatrix === 'function'){
    hturn.updateMatrix();
    hturn.matrixWorldNeedsUpdate = true;
  }
}
