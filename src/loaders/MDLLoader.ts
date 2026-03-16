import { ResourceLoader } from "@/loaders/ResourceLoader";
import { OdysseyModel } from "@/odyssey";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Loader);

/**
 * Interface defining the structure of the model cache.
 * 
 * This interface provides type safety for the model cache system,
 * ensuring that models are stored and retrieved using consistent
 * data structures.
 * 
 * @interface ModelCacheInterface
 */
export interface ModelCacheInterface {
  /** Map storing loaded models with their resource references as keys */
  models: Map<string, OdysseyModel>
}

/**
 * Global model cache instance for storing loaded 3D models.
 * 
 * This cache prevents redundant loading of the same models
 * and improves performance by reusing already loaded model data.
 * 
 * @constant {ModelCacheInterface}
 */
const ModelCache: ModelCacheInterface = {
  models: new Map<string, OdysseyModel>()
};

/**
 * Resource type ID for MDL (Model) files.
 * 
 * @constant {number}
 */
const resMDL: number = ResourceTypes['mdl'];

/**
 * Resource type ID for MDX (Model Extension) files.
 * 
 * @constant {number}
 */
const resMDX: number = ResourceTypes['mdx'];

/**
 * MDLLoader class for loading and caching 3D models from MDL/MDX files.
 * 
 * This class handles the loading of 3D models used in the game, including
 * characters, objects, and environmental elements. It provides caching
 * functionality to improve performance by avoiding redundant file loads.
 * 
 * The loader works with both MDL (Model) and MDX (Model Extension) files,
 * which together contain the complete 3D model data including geometry,
 * textures, animations, and other model properties.
 * 
 * @class MDLLoader
 * 
 * @file MDLLoader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MDLLoader {
  /** Static singleton instance of the MDL loader */
  static loader = new MDLLoader();
  
  /**
   * Loads a 3D model from MDL/MDX files with caching support.
   * 
   * This method first checks if the model is already cached to avoid
   * redundant file system operations. If not cached, it loads both
   * the MDL and MDX files in parallel for optimal performance.
   * 
   * The method handles resource validation, error handling, and automatic
   * caching of successfully loaded models.
   * 
   * @async
   * @param {string} [resref=''] - The resource reference (filename without extension) of the model to load
   * @returns {Promise<OdysseyModel>} The loaded OdysseyModel instance, or undefined if loading fails
   * 
   * @throws {Error} Throws an error if the resource cannot be found or loaded
   * 
   * @example
   * // Load a character model
   * const model = await MDLLoader.loader.load('p_male01');
   * if (model) {
   *   log.info('Model loaded successfully');
   * }
   * 
   * @example
   * // Load an environmental object
   * const doorModel = await MDLLoader.loader.load('door_01');
   * if (doorModel) {
   *   // Use the model in the game
   * }
   */
	async load (resref: string = ''): Promise<OdysseyModel> {
    resref = resref?.toLocaleLowerCase();

    //Validate the resource reference
    if(!resref){
      return undefined;
    }

    //Try to load the model
    try{
      //Check the cache
      if(ModelCache.models.has(resref)){
        return ModelCache.models.get(resref);
      }

      //Load the resources from disk
      const mdlPromise = ResourceLoader.loadResource(resMDL, resref);
      const mdxPromise = ResourceLoader.loadResource(resMDX, resref);

      const [mdl_buffer, mdx_buffer] = await Promise.all([mdlPromise, mdxPromise]);
      const model = OdysseyModel.FromBuffers(mdl_buffer, mdx_buffer);
      ModelCache.models.set(resref, model);
      return model;
    }catch(e: any){
      console.warn('MD(L|X) 404', resref);
      console.error(e);
      return undefined;
    }
	}

  /**
   * Clears the model cache, freeing up memory and forcing fresh loads.
   * 
   * This method removes all cached models from memory, which can be useful
   * for memory management or when you need to force reload models with
   * updated data. After calling this method, subsequent load() calls will
   * need to load models from the file system again.
   * 
   * @returns {void}
   * 
   * @example
   * // Clear the cache to free up memory
   * MDLLoader.loader.reset();
   * log.info('Model cache cleared');
   * 
   * @example
   * // Force reload a model after cache clear
   * MDLLoader.loader.reset();
   * const model = await MDLLoader.loader.load('p_male01'); // Will load from disk
   */
  reset(){
    ModelCache.models.clear();
  }

}
