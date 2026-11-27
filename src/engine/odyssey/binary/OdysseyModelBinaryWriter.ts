/**
 * Binary save path for Odyssey models (MDL + MDX).
 *
 * Supported path today:
 * - MDL: passthrough of `model.sourceMdl` when the model was loaded with
 *   `OdysseyModel.FromBuffers(..., { preserveSourceBinary: true })` and
 *   `preferSourceMdl` is left at its default (true). Wrapper / model-header
 *   MDX size fields may be patched when MDX is regenerated.
 * - MDX: regenerated from parsed mesh vertex data via
 *   {@link OdysseyModelBinaryMdxWriter} (default), unless `preferSourceMdx`
 *   returns the preserved `sourceMdx` bytes.
 *
 * Full MDL rewrite from the parsed node graph is not implemented; calling
 * write without source MDL (or with `preferSourceMdl: false`) throws.
 * Structural edits that need a new MDL should go through ASCII export/import
 * until a real MDL serializer exists.
 */
import type { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import { MDL_WRAPPER_SIZE } from "@engine/odyssey/binary/OdysseyModelBinaryLayout";
import { OdysseyModelBinaryMdxWriter } from "@engine/odyssey/binary/OdysseyModelBinaryMdxWriter";

export interface OdysseyModelBinaryBuffers {
  mdl: Uint8Array;
  mdx: Uint8Array;
}

export interface OdysseyModelBinaryWriteOptions {
  /**
   * When true and the model was loaded with `preserveSourceBinary`, return the
   * original MDL bytes unchanged (MDX may still be regenerated).
   */
  preferSourceMdl?: boolean;
  /** When true, return the original MDX bytes if preserved. */
  preferSourceMdx?: boolean;
  /** When true (default), rebuild MDX from parsed mesh data when not using source. */
  regenerateMdx?: boolean;
}

/**
 * Serializes {@link OdysseyModel} to paired MDL/MDX binary files.
 */
export class OdysseyModelBinaryWriter {
  static write(
    model: OdysseyModel,
    options: OdysseyModelBinaryWriteOptions = {},
  ): OdysseyModelBinaryBuffers {
    const preferSourceMdl = options.preferSourceMdl !== false;
    const preferSourceMdx = options.preferSourceMdx === true;
    const regenerateMdx = options.regenerateMdx !== false;

    let mdl: Uint8Array;
    if (model.sourceMdl?.length && preferSourceMdl) {
      mdl = model.sourceMdl.slice();
    } else {
      throw new Error(
        "OdysseyModelBinaryWriter: MDL re-serialization from parsed data is not implemented. " +
          "Load the model with OdysseyModel.FromBuffers(mdl, mdx, { preserveSourceBinary: true }) " +
          "or export via ASCII (odysseyModelAscii).",
      );
    }

    let mdx: Uint8Array;
    if (preferSourceMdx && model.sourceMdx?.length) {
      mdx = model.sourceMdx.slice();
    } else if (regenerateMdx) {
      mdx = OdysseyModelBinaryMdxWriter.write(model);
    } else {
      mdx = new Uint8Array(0);
    }

    if (regenerateMdx && !preferSourceMdx) {
      mdl = OdysseyModelBinaryWriter.patchWrapperMdxSize(mdl, mdx.length);
      if (model.modelHeader) {
        model.modelHeader.mdxSize = mdx.length;
      }
    }

    return { mdl, mdx };
  }

  /** Rewrites wrapper `mdx_file_size` and model-header `mdx_size` when MDX is regenerated. */
  private static patchWrapperMdxSize(mdl: Uint8Array, mdxSize: number): Uint8Array {
    const out = mdl.slice();
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    if (out.byteLength >= MDL_WRAPPER_SIZE) {
      view.setUint32(8, mdxSize, true);
    }
    const contentMdxSizeOff = MDL_WRAPPER_SIZE + 0xb0;
    if (out.byteLength >= contentMdxSizeOff + 4) {
      view.setUint32(contentMdxSizeOff, mdxSize, true);
    }
    return out;
  }
}
