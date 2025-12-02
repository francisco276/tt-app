/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { BUTTON_TYPES } from '../const/button-types';
import { DEFAULT_ERROR } from '../config/errors';
import { PublicError } from '../errors/PublicError';
import type { MondatColumnValue, MondayItem, Task } from '../types';

/**
 * Validates if all the data exists inside the context object
 * @param {Object} context - context from the monday.com
 * @returns
 */
export const isContextValid = (context: any) =>
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
export const getErrorMessage = (error: any, defaultMessage: string = DEFAULT_ERROR) =>
  error instanceof PublicError ? error.message : defaultMessage;

/**
 * Returns the next item from the list.
 * @param {Array} items
 * @param {Number} itemId
 * @param {Object} currentTask
 */
export const getNextItemFromTheList = (items: MondayItem[], itemId: number | string, currentTask?: Task) => {
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
export const findColumnData = (source: MondatColumnValue[], columnId: string) =>
  Array.isArray(source)
    ? source.find((item) => item.id === columnId)
    : undefined;


export const findColumn =
(fieldName: string, defaultValue?: string, modifier?: Function) =>
  (columnData: MondatColumnValue[], columnId: string) => {
    const value =
      findColumnData(columnData, columnId)?.[fieldName] ?? defaultValue;

    return modifier && typeof modifier === 'function' ? modifier(value) : value;
  }

/**
 * Creates a function with one {String} type parameter that will
 * check if the particular button should be shown to the user.
 * Created function will return {Boolean} value
 * @param {Object} params - state of the application that includes needed parameters
 */
export const isButtonVisibleCreator =
  ({
    startTimestamp,
    endTimestamp,
    isIdle,
    nextItemId,
    idleItemId,
    currentTask,
    itemId,
    itemName,
  }: any) =>
  (type: string) => {
    switch (type) {
      case BUTTON_TYPES.StartTask:
        return (
          (!startTimestamp || isIdle || (!!startTimestamp && !!endTimestamp)) &&
          itemName !== 'Idle' &&
          !isIdle
        );
      case BUTTON_TYPES.EndTask:
        return !!startTimestamp && !endTimestamp && !isIdle;
      case BUTTON_TYPES.StartNextTask:
        return (
          nextItemId &&
          idleItemId !== itemId &&
          currentTask?.name &&
          itemName !== 'Idle' &&
          !isIdle
        );
      case BUTTON_TYPES.StartIdleTime:
        return (
          (!startTimestamp ||
            (!!startTimestamp && !!endTimestamp) ||
            (!!startTimestamp && !endTimestamp && !isIdle)) &&
          !isIdle
        );
      case BUTTON_TYPES.EndIdleTime:
        return !(
          (!startTimestamp ||
            (!!startTimestamp && !!endTimestamp) ||
            (!!startTimestamp && !endTimestamp && !isIdle)) &&
          !isIdle
        );
      default:
        return false;
    }
  };
