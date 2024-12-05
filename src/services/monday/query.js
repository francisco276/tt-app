import {
  EPLOYEES_BOARD_ID,
  IDLE_NAME,
  MONDAY_API_VERSION,
  PEOPLE_COLUMN_ID,
  TIMEPUNCH_CURRENT_COLUMN_ID,
} from '../../config/constants';

/**
 * Stores methods to work with Monday GraphQL Queries
 */
export class MondayQuery {
  constructor(requestor) {
    this.requestor = requestor;
  }

  async getDateRangeColumnsByIdsForItem(itemId, startColumnId, endColumnId) {
    return this.requestor.request(
      'getDateRangeColumnsByIdsForItem',
      `query {
        items(ids:${itemId}) {
            id
            name
            column_values(ids:["${startColumnId}","${endColumnId}"]) {
                id
                value
                text
            }
        }
      }`
    );
  }

  async getPunchBoard(userId) {
    return this.requestor.request(
      'getPunchBoard',
      `query {
          items_page_by_column_values (limit: 1, board_id: ${EPLOYEES_BOARD_ID}, columns: [{column_id: "${PEOPLE_COLUMN_ID}", column_values: ["${userId}"]}]) {
            cursor
            items {
              column_values(ids:"${TIMEPUNCH_CURRENT_COLUMN_ID}") {
                id
                value
              }
            }
          }
        }`,
      { apiVersion: MONDAY_API_VERSION }
    );
  }

  async getItemById(itemId) {
    return this.requestor.request(
      'getItemById',
      `query {
        items (ids: ${itemId}) {
          name
          column_values {
            id
            value
            text
            ...on MirrorValue {
              display_value
              id
              value
            }
          }
        }
      }`
    );
  }

  async getItemNameById(itemId) {
    return this.requestor.request(
      'getItemNameById',
      `query {
            items (ids:${itemId}) {
                name
            }
        }`
    );
  }

  async getItemsPageByColumnValues(boardId, userId) {
    return this.requestor.request(
      'getItemsPageByColumnValues',
      `query {
          items_page_by_column_values (
            limit: 2,
            board_id: ${boardId},
            columns: [{column_id: "dup__of_cfm", column_values: ["${userId}"]}]
          ) {
            cursor
            items {
              id
              name
            }
          }
        }`,
      { apiVersion: MONDAY_API_VERSION }
    );
  }

  async getNextItemsPage(cursor) {
    return this.requestor.request(
      'getNextItemsPage',
      `query {
          next_items_page (cursor:"${cursor}", limit: 2) {
            cursor
            items {
              id
              name
            }
          }
      }`,
      { apiVersion: MONDAY_API_VERSION }
    );
  }

  async getIdleColumnByBoardId(boardId, userId) {
    return this.requestor.request(
      'getIdleColumnByBoardId',
      `query {
            boards (ids: ${boardId}) {
                items_page (query_params: {rules: [{column_id: "name", compare_value: ["${IDLE_NAME}"]}, {column_id: "dup__of_cfm", compare_value:["person-${userId}"], operator:any_of}]}) {
                    cursor
                    items {
                        id
                    }
                }
            }
        }`
    );
  }
}
