import mondaySdk from 'monday-sdk-js';
import { MONDAY_API_VERSION, MONDAY_AUTH_TOKEN } from '../../config/constants';
import { MondayQuery } from './query';
import { MondayMutation } from './mutation';
import { MondayRequest } from './request';

export class MondayApi {
  constructor(logger) {
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
  async getItemFromStorage(key, defaultResponse = undefined) {
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
  async setItemToStorage(key, value, options) {
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
  async listen(typeOrTypes, callback, params) {
    return this.monday.listen(typeOrTypes, callback, params);
  }

  /**
   * @returns Context from the parent monday app
   */
  async getContext() {
    return this.monday.get('context');
  }

  async notice(message, type, timeout) {
    this.logger.highlight(`[Notice] ${type}:`, message);
    return this.monday.execute('notice', {
      message,
      type,
      timeout,
    });
  }

  async errorNotice(message, timeout = 5000) {
    return this.notice(message, 'error', timeout);
  }

  async successNotice(message, timeout = 2000) {
    return this.notice(message, 'success', timeout);
  }

  async openItemCard(itemId) {
    this.logger.highlight(`[Card] opened:`, itemId);
    return this.monday.execute('openItemCard', {
      kind: 'updates',
      itemId,
    });
  }
}
