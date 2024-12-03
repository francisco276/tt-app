export class Hooks {
  constructor(logger) {
    this.logger = logger;
  }

  createPunchError(dataObject) {
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
