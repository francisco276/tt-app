import moment from 'moment-timezone';
import { DEFAULT_TIME_FORMAT, DEFAULT_TIMEZONE } from '../config/constants';

/**
 * Imitates delay
 * @param {Number} time
 */
export const sleep = (time) =>
  new Promise((resolve) => setTimeout(resolve, time));

/**
 * Generates the current time
 * @returns {String}
 */
export const getCurrentTime = () => {
  return moment().tz(DEFAULT_TIMEZONE).format(DEFAULT_TIME_FORMAT);
};

/**
 * Generates monday date object and returns it back
 * @param {Date} date
 */
export const getMondayDateObject = (date) => {
  // Get date in UTC
  const year = date.getFullYear();
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  const day = ('0' + date.getUTCDate()).slice(-2);
  const hours = ('0' + date.getUTCHours()).slice(-2);
  const minutes = ('0' + date.getUTCMinutes()).slice(-2);
  const seconds = ('0' + date.getUTCSeconds()).slice(-2);

  // Construct date object
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  };
};
