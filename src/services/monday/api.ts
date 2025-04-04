/* eslint-disable @typescript-eslint/no-explicit-any */
import mondaySdk, { MondayClientSdk } from 'monday-sdk-js';
import { MONDAY_API_VERSION, MONDAY_AUTH_TOKEN } from '../../config/constants';
import { MondayQuery } from './query';
import { MondayMutation } from './mutation';
import { MondayRequest } from './request';
import { Logger } from '../logger';

/**
 * Stores methods to work with Monday SDK and Query/Mutation requests
 */
export class MondayApi {
  private monday: MondayClientSdk
  private logger: Logger
  private requestor: MondayRequest
  public query: MondayQuery
  public mutation: MondayMutation

  constructor(logger: Logger) {
    this.monday = mondaySdk({ apiVersion: MONDAY_API_VERSION });
    this.monday.setToken(MONDAY_AUTH_TOKEN);

    this.logger = logger;
    this.requestor = new MondayRequest(this.monday, logger);
    this.query = new MondayQuery(this.requestor);
    this.mutation = new MondayMutation(this.requestor);
  }

  /**
   * Returns a stored value from the database under `key` for a specific app instance
   * @param key
   */
  async getItemFromStorage(key: string, defaultResponse?: object) {
    const storage = await this.monday.storage.instance.getItem(key);
    this.logger.highlight(`[Storage] GET ${key}:`, storage);
    return storage.data.value
      ? JSON.parse(storage.data.value)
      : defaultResponse;
  }

  /**
   * Stores `value` under `key` in the database for a specific app instance
   * @param key
   * @param value
   * @param options
   */
  async setItemToStorage(key: string, value: object, options?: object) {
    this.logger.highlight(`[Storage] SET ${key}:`, value);
    return this.monday.storage.instance.setItem(
      key,
      JSON.stringify(value),
      options
    );
  }

  /**
   * Creates a listener which allows subscribing to certain types of client-side events.
   * @param typeOrTypes The type, or array of types, of events to subscribe to
   * @param callback A callback function that is fired when the listener is triggered by a client-side event
   * @param params Reserved for future use
   */
  async listen(typeOrTypes: string | Array<string>, callback: (res: any) => void, params?: object) {
    return this.monday.listen(typeOrTypes, callback, params);
  }

  /**
   * @returns Context from the parent monday app
   */
  async getContext() {
    return this.monday.get('context');
  }

  /**
   * Shows the popup notification in monday style
   * @param {String} message - message will be shown in the notification
   * @param {String} type - success/error type of the notification
   * @param {Number} timeout - the period in ms after which the notification popup closes
   */
  async notice(message: string, type: string, timeout: number) {
    this.logger.highlight(`[Notice] ${type}:`, message);
    return this.monday.execute('notice', {
      message,
      type,
      timeout,
    });
  }

  /**
   * Helper to show the error notification
   * @param {String} message
   * @param {Number} timeout
   */
  async errorNotice(message: string, timeout: number = 5000) {
    return this.notice(message, 'error', timeout);
  }

  /**
   * Helper to show the success notification
   * @param {String} message
   * @param {Number} timeout
   */
  async successNotice(message: string, timeout: number = 2000) {
    return this.notice(message, 'success', timeout);
  }

  /**
   * Command to move user to another item's actions window
   * @param {Number} itemId
   */
  async openItemCard(itemId: number | string) {
    this.logger.highlight(`[Card] opened:`, itemId);
    return this.monday.execute('openItemCard', {
      kind: 'updates',
      itemId,
    });
  }
}
