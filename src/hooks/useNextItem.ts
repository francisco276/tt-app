import { useState } from 'react'
import { MondayApi } from '../services/monday/api'
import { Logger } from '../services/logger'
import {
  getNextItemFromTheList,
} from '../utils/helpers';
import type { NextItemState, Task } from '../types'

type NextItemProps = {
  monday: MondayApi
  logger: Logger
}

export const useNextItem = ({ monday, logger }: NextItemProps) => {
  const [nextItemState, setNextItemState] = useState<NextItemState>({
    nextLoaded: false,
    nextItemName: '',
    nextItemId: '',
  })

  const getNexItem = async ({
    boardId,
    userId,
    itemId,
    currentTask 
  }: { 
    boardId: string
    userId: number | string
    itemId: number | string
    currentTask: Task
  }) => {
    // Current task is stored under userId key in monday.storage
    const firstPage = await monday.query.getItemsPageByColumnValues(
      JSON.parse(boardId),
      userId
    );
    let cursor = firstPage.data?.items_page_by_column_values?.cursor;
    let items = firstPage.data?.items_page_by_column_values?.items || [];

    while (cursor) {
      // loop will stop when cursor is null
      const nextPage = await monday.query.getNextItemsPage(cursor);
      const nextPageItems = nextPage.data.next_items_page?.items || [];
      cursor = nextPage.data.next_items_page?.cursor;
      items = [...items, ...nextPageItems];
    }

    const nextItem = getNextItemFromTheList(
      items,
      itemId,
      currentTask
    )

    setNextItemState({
      nextLoaded: true,
      nextItemName: nextItem?.name || '',
      nextItemId: nextItem?.id || '',
    })

    logger.stateChange({
      nextLoaded: true,
      nextItemName: nextItem?.name || '',
      nextItemId: nextItem?.id || '',
    }, 'Next Item Changes')
  }

  return {
    getNexItem,
    nextItemState,
  }
}