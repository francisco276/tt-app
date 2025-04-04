import { Logger } from "./logger";

export class Hooks {
  private logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Hook that should be called every time punch creation is failed
   * @param {Object} dataObject
   * @returns
   */
  createPunchError(dataObject: { itemid: string | number }) {
    this.logger.highlight('[Hooks] createPunchError triggered', dataObject);

    try {
      return fetch(
        'https://hook.us1.make.celonis.com/9icnjujhc7vi4ce6ar9cbo9ryyqbib65',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataObject),
        }
      );
    } catch (error) {
      this.logger.highlight('[Hooks] createPunchError failed', error);
    }
  }
}
