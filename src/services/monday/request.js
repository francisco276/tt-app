import { ERROR_SERVER_ERROR } from '../../config/errors';
import { PublicError } from '../../errors/PublicError';

export class MondayRequest {
  constructor(monday, logger) {
    this.monday = monday;
    this.logger = logger;
  }

  getErrorMessage(errors) {
    if (this.logger.getLogger() === false) {
      return ERROR_SERVER_ERROR;
    }

    return `${ERROR_SERVER_ERROR} Details: ${errors.join('; ')}`;
  }

  async request(label, query, options = undefined) {
    const response = await this.monday.api(query, options);

    this.logger.api(label, query, response);

    if (response.errors?.length) {
      throw new PublicError(
        this.getErrorMessage(response.errors.map((error) => error.message))
      );
    }

    return response;
  }
}
