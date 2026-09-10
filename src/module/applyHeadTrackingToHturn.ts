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
 */
export function applyHeadTrackingToHturn(
  hturn: { rotation: { x: number; z: number }; userData?: Record<string, unknown> },
  yaw: number,
  pitch: number,
  epsilon = 0.001,
): void {
  const ud = (hturn.userData || (hturn.userData = {})) as {
    _hturnAnimX?: number;
    _hturnAnimZ?: number;
    _hturnComposedX?: number;
    _hturnComposedZ?: number;
  };

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
}
