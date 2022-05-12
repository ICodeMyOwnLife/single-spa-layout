/*
 * the array.prototype.find polyfill on npmjs.com is ~20kb (not worth it)
 * and lodash is ~200kb (not worth it)
 */
export const find = <T>(arr: T[], predicate: (value: T) => boolean) => {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) return arr[i];
  }
  return null;
};
