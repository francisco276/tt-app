import {
  DEFAULT_ITEMS_LIMIT,
  EPLOYEES_BOARD_ID,
  IDLE_NAME,
  MONDAY_API_VERSION,
  PEOPLE_COLUMN_ID,
  TIMEPUNCH_CURRENT_COLUMN_ID,
} from '../../config/constants';
import { MondayRequest } from './request';

/**
 * Stores methods to work with Monday GraphQL Queries
 */
export class MondayQuery {
  private requestor: MondayRequest;
  constructor(requestor: MondayRequest) {
    this.requestor = requestor;
  }

  async getDateRangeColumnsByIdsForItem(itemId: string | number, startColumnId: string | number, endColumnId: string | number, message?: string) {
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
      }`,
      { apiVersion: MONDAY_API_VERSION },
      message
    );
  }

  async getPunchBoard(userId: string | number, message?: string) {
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
      { apiVersion: MONDAY_API_VERSION },
      message
    );
  }

  async getItemById(itemId: string | number, message?: string) {
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
            ... on TimelineValue {
              from
              to
            }
          }
        }
      }`,
      { apiVersion: MONDAY_API_VERSION },
      message
    );
  }

  async getItemNameById(itemId: string | number, message?: string) {
    return this.requestor.request(
      'getItemNameById',
      `query {
            items (ids:${itemId}) {
                name
            }
        }`,
      { apiVersion: MONDAY_API_VERSION },
      message
    );
  }

  async getItemsPageByColumnValues(boardId: string | number, userId: string | number, message?: string) {
    return this.requestor.request(
      'getItemsPageByColumnValues',
      `query {
          items_page_by_column_values (
            limit: ${DEFAULT_ITEMS_LIMIT},
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
      { apiVersion: MONDAY_API_VERSION },
      message
    );
  }

  async getNextItemsPage(cursor: string, message?: string) {
    return this.requestor.request(
      'getNextItemsPage',
      `query {
          next_items_page (cursor:"${cursor}", limit: ${DEFAULT_ITEMS_LIMIT}) {
            cursor
            items {
              id
              name
            }
          }
      }`,
      { apiVersion: MONDAY_API_VERSION },
      message
    );
  }

  async getIdleColumnByBoardId(boardId: string, userId: string | number, message?: string) {
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
        }`,
      { apiVersion: MONDAY_API_VERSION },
      message
    );
  }
}
