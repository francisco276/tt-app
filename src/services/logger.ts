/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger as LoggerApi } from "./logger-api"
/**
 * Service that will log all the necessary information to the browser's console
 * In case of need, requests to monday.log can be added here
 */
export class Logger {
  private turnedOn: boolean;
  private fn: 'log' | 'info' | 'warn' | 'error' | 'debug';
  constructor(turnedOn = false, fn: 'log' | 'info' | 'warn' | 'error' | 'debug' = 'log') {
    this.turnedOn = turnedOn;
    this.fn = fn; // log, trace, info...
  }

  /**
   * Sets the turned on flag
   * @param {Boolean} turnedOn
   */
  setTurnedOn(turnedOn: boolean) {
    this.turnedOn = Boolean(turnedOn);
  }

  /**
   * Returns the turned on flag
   * @returns {Boolean}
   */
  isTurnedOn() {
    return this.turnedOn;
  }

  /**
   * Turns on logging to console
   */
  turnOn() {
    this.setTurnedOn(true);
  }

  /**
   * Turns off logging to console
   */
  turnOff() {
    this.setTurnedOn(false);
  }

  /**
   * Helper method to log the messages to console
   * @param  {...any} messages
   * @returns
   */
  log<T extends any[]>(...messages: T): void {
    if (!this.turnedOn) {
      return;
    }
    console[this.fn](...messages);
  }

  /**
   * Helper method to log the message. First one will be highlighted
   * @param {String} firstMessage
   * @param {...any} restMessages
   */
  highlight(firstMessage: string, ...restMessages: any[]) {
    this.log(
      `%c ${firstMessage}`,
      'color:rgb(202, 174, 135); font-weight: bold;',
      ...restMessages
    );
    LoggerApi.info(firstMessage, restMessages)
  }

  /**
   * Helper method to log the message with --force flag. First one will be highlighted
   * @param {String} firstMessage
   * @param {...any} restMessages
   */
  forceHighlight(firstMessage: string, ...restMessages: any) {
    const prevState = this.turnedOn;
    this.turnOn();
    this.highlight(firstMessage, ...restMessages);
    if (prevState === false) {
      this.turnOff();
    }
  }

  /**
   * Helper method to log the error to console
   * @param  {...any} messages - an array of any piece of data
   * @returns
   */
  error<T extends any[]>(...messages: T) {
    LoggerApi.error('Error', messages)
    if (!this.turnedOn) {
      return;
    }
    console.error(...messages);
  }

  /**
   * Helper method to log API request
   * @param {String} label - method label
   * @param {String} query - query or mutation
   * @param {any} response - data from the server
   */
  api(label: string, query: string, response: object) {
    const type = query.split(' ')[0].toUpperCase();
    this.log(
      `%c API ${type} %c ${label}`,
      `background: #222222; color: ${
        type === 'QUERY' ? '#bada55' : 'rgb(220, 68, 68)'
      }`,
      'background: #222222; color: #eeddd8'
    );
    this.log(`%c ${query}`, 'color: #bcbcbc');
    this.log(`%c Response`, 'background: #222222; color: #bada55', response);

    LoggerApi.info(`API ${type} ${label}`)
    LoggerApi.info(query)
    LoggerApi.info('Response', response)
  }

  /**
   * Helper method to log any state changes
   * @param {Object} newValues
   */
  stateChange(newValues: object) {
    this.log(`%c State Changes`, 'color: #d9979d', newValues);
    LoggerApi.info('State Changes', newValues)
  }
}
