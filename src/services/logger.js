export class Logger {
  constructor(logger = false, fn = 'log') {
    this.logger = logger;
    this.fn = fn; // log, trace, info...
  }

  setLogger(logger) {
    this.logger = Boolean(logger);
  }

  getLogger() {
    return this.logger;
  }

  turnOn() {
    this.setLogger(true);
  }

  turnOff() {
    this.setLogger(false);
  }

  log(...messages) {
    if (!this.logger) {
      return;
    }
    console[this.fn](...messages);
  }

  highlight(firstMessage, ...restMessages) {
    this.log(
      `%c ${firstMessage}`,
      'color:rgb(202, 174, 135); font-weight: bold;',
      ...restMessages
    );
  }

  error(...messages) {
    if (!this.logger) {
      return;
    }
    console.error(...messages);
  }

  api(method, query, response) {
    const type = query.split(' ')[0].toUpperCase();
    this.log(
      `%c API ${type} %c ${method}`,
      `background: #222222; color: ${
        type === 'QUERY' ? '#bada55' : 'rgb(220, 68, 68)'
      }`,
      'background: #222222; color: #eeddd8'
    );
    this.log(`%c ${query}`, 'color: #bcbcbc');
    this.log(`%c Response`, 'background: #222222; color: #bada55', response);
  }

  stateChange(newValues) {
    this.log(`%c State Changes`, 'color: #d9979d', newValues);
  }
}
