import { API_TIMEOUT } from '../../config/constants';
import { ERROR_SERVER_ERROR } from '../../config/errors';
import { PublicError } from '../../errors/PublicError';

/**
 * Requestor service for monday API
 */
export class MondayRequest {
  constructor(monday, logger) {
    this.monday = monday;
    this.logger = logger;
  }

  /**
   * Generates an error with details coming from the monday API
   * @param {[String]} errors - errors list from th eserver
   * @returns
   */
  getErrorMessage(errors) {
    if (this.logger.isTurnedOn() === false) {
      return ERROR_SERVER_ERROR;
    }

    return `${ERROR_SERVER_ERROR} Details: ${errors.join('; ')}`;
  }

  /**
   * Hepler method for making a request to monday
   * @param {String} label - to log request
   * @param {String} query - Query/Mutaiton
   * @param {Object} options - additional options
   */
  async request(label, query, options = undefined) {
    const response = await Promise.race([
      this.monday.api(query, options),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new PublicError(`Request ${label} took too long.`)),
          API_TIMEOUT
        )
      ),
    ]);

    this.logger.api(label, query, response);

    if (response.errors?.length) {
      throw new PublicError(
        this.getErrorMessage(response.errors.map((error) => error.message))
      );
    }

    return response;
  }
}
