import { MONDAY_API_VERSION } from '../../config/constants';
import { MondayRequest } from './request';

/**
 * Stores methods to work with Monday GraphQL Mutations
 */
export class MondayMutation {
  private requestor: MondayRequest;
  constructor(requestor: MondayRequest) {
    this.requestor = requestor;
  }

  async createPunch(punchBoardId: string, itemName: string, columnValues: object, message?: string) {
    return this.requestor.request(
      'createPunch',
      `mutation create_item($boardId: ID!, $itemName: String!, $columnValue: JSON) {
        create_item(board_id:$boardId, item_name:$itemName, column_values:$columnValue, create_labels_if_missing: true) {
            id
        }
      }`,
      {
        apiVersion: MONDAY_API_VERSION,
        variables: {
          boardId: punchBoardId,
          itemName,
          columnValue: JSON.stringify(columnValues),
        },
      },
      message
    );
  }

  async changeColumnValue(boardId: string, itemId: string | number, columnId: string, data: object, message?: string) {
    const value = JSON.stringify(JSON.stringify(data));

    return this.requestor.request(
      'changeColumnValue',
      `mutation {
        change_column_value(item_id: ${itemId}, board_id: ${boardId}, column_id: "${columnId}", value: ${value}) {
            id
            name
        }
      }`,
      {
        apiVersion: MONDAY_API_VERSION,
      },
      message
    );
  }
}
