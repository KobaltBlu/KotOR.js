/**
 * Apply creature look-at offsets onto hturn_g after animation has posed it.
 *
 * Must not force idle axes to 0 - female models use a neck/hturn bind cancel
 * (+/-0.1745). Wiping hturn.x after anim makes Model B heads look down.
 *
 * Must not `+=` pitch every frame - anims that skip hturn (e.g. listen) leave
 * last frame's look in the euler, and += accumulates into a spin.
 * Compose look against a tracked post-anim baseline instead.
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
    _hturnLookPitch?: number;
    _hturnLookYaw?: number;
  };

  const prevPitch = ud._hturnLookPitch ?? 0;
  const prevYaw = ud._hturnLookYaw;
  const hasAnimX = typeof ud._hturnAnimX === 'number';
  const expectedX = (ud._hturnAnimX ?? 0) + prevPitch;
  // If current x still matches last compose, anim did not overwrite hturn this frame.
  const animWroteX = !hasAnimX || Math.abs(hturn.rotation.x - expectedX) > 1e-4;

  if(animWroteX){
    ud._hturnAnimX = hturn.rotation.x;
  }else if(hasAnimX){
    hturn.rotation.x = ud._hturnAnimX as number;
  }

  const hasAnimZ = typeof ud._hturnAnimZ === 'number';
  const yawWasReplaced = typeof prevYaw === 'number';
  if(yawWasReplaced && hasAnimZ && Math.abs(hturn.rotation.z - (prevYaw as number)) <= 1e-4){
    // Still showing our replaced yaw; restore anim baseline before recompose.
    hturn.rotation.z = ud._hturnAnimZ as number;
  }else{
    ud._hturnAnimZ = hturn.rotation.z;
  }

  const lookPitch = Math.abs(pitch) > epsilon ? pitch : 0;
  const lookYaw = Math.abs(yaw) > epsilon ? yaw : undefined;

  hturn.rotation.x = (ud._hturnAnimX as number) + lookPitch;
  ud._hturnLookPitch = lookPitch;

  if(typeof lookYaw === 'number'){
    hturn.rotation.z = lookYaw;
    ud._hturnLookYaw = lookYaw;
  }else{
    hturn.rotation.z = ud._hturnAnimZ as number;
    ud._hturnLookYaw = undefined;
  }
}
