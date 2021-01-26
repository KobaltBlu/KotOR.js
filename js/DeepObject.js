class DeepObject {

  /**
   * Simple object check.
   * @param item
   * @returns {boolean}
   */
  static _isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   */
  static Merge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (DeepObject._isObject(target) && DeepObject._isObject(source)) {
      for (const key in source) {
        if (DeepObject._isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          DeepObject.Merge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return DeepObject.Merge(target, ...sources);
  }

}

module.exports = DeepObject;