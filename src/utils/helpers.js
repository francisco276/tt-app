import { DEFAULT_ERROR } from '../config/errors';
import { PublicError } from '../errors/PublicError';

/**
 * Validates if all the data exists inside the context object
 * @param {Object} context - context from the monday.com
 * @returns
 */
export const isContextValid = (context) =>
  !!context &&
  !!context.data &&
  !!context.data.itemId &&
  !!context.data.boardId &&
  !!context.data.theme &&
  !!context.data.user?.id &&
  !!context.data.appVersion.versionData;

/**
 * Generates an error message from the Error object
 * @param {Error} error - Error object
 * @param {String} defaultMessage - message that will be shown in case if error is not instance of PublicError
 * @returns {String} an error message
 */
export const getErrorMessage = (error, defaultMessage = DEFAULT_ERROR) =>
  error instanceof PublicError ? error.message : defaultMessage;

/**
 * Returns the next item from the list.
 * @param {Array} items
 * @param {Number} itemId
 * @param {Object} currentTask
 */
export const getNextItemFromTheList = (items, itemId, currentTask) => {
  const currentTaskIndex = currentTask?.id
    ? items?.findIndex((item) => Number(item.id) === Number(currentTask?.id)) ||
      -1
    : -1;
  const currentItemIndex =
    items.findIndex((item) => Number(item.id) === Number(itemId)) || -1;
  const index =
    currentItemIndex > currentTaskIndex ? currentItemIndex : currentTaskIndex;

  return index === -1 || index === items.length - 1
    ? undefined
    : items[index + 1];
};

/**
 * Returns data by columnId from the source array
 * @param {Array} source
 * @param {String} columnId
 * @returns
 */
export const findColumnData = (source, columnId) =>
  Array.isArray(source)
    ? source.find((item) => item.id === columnId)
    : undefined;
