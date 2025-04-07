import { useState } from "react"
import { MondayApi } from "../services/monday/api"
import { Logger } from "../services/logger";
import { PublicError } from '../errors/PublicError';
import {
  isContextValid,
} from '../utils/helpers';
import {
  ERROR_IDLE_ITEM_IS_ABSENT,
  ERROR_NO_LINKED_PUNCH_BOARD,
  ERROR_WRONG_ENVIRONMENT,
} from '../config/errors'
import type { AppContext } from "../types"

type ContextProps = {
  monday: MondayApi
  logger: Logger
}

export const useContext = ({ monday, logger }: ContextProps) => {
  const [contextState, setContextState] = useState<AppContext>({
    itemId: '',
    userId: '',
    boardId: '',
    idleItemId: '',
    userPunchesBoardID: '',
    version: '',
    theme: ''
  })

  const getContext = async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const context: any = await monday.getContext();
    logger.highlight('context', context);

    if (!isContextValid(context)) {
      throw new PublicError(ERROR_WRONG_ENVIRONMENT);
    }
    return context

    // setContextState((state) => ({
    //   ...state,
    //   itemId: context.data.itemId,
    //   boardId: context.data.boardId,
    //   userId: context.data.user.id,
    //   theme: context.data.theme,
    //   version: `${context.data.appVersion.versionData.major}.${context.data.appVersion.versionData.minor}`,
    // }))
  }

  const getPunchBoard = async ({ userId }: { userId: number | string }) => {
    const punchBoard = await monday.query.getPunchBoard(userId)
    const punchBoardId =
      punchBoard.data?.items_page_by_column_values?.items?.[0]
        ?.column_values?.[0]?.value;
    if (!punchBoardId) {
      throw new PublicError(ERROR_NO_LINKED_PUNCH_BOARD)
    }
    return JSON.parse(punchBoardId)
  }

  const getIdleId = async ({ boardId, userId }: { boardId: string, userId: number | string }) => {
    const res = await monday.query.getIdleColumnByBoardId(
      boardId,
      userId
    );

    const idleItemId = res.data.boards?.[0]?.items_page?.items?.[0]?.id;
    if (!idleItemId) {
      throw new PublicError(ERROR_IDLE_ITEM_IS_ABSENT);
    }

    return idleItemId
  }

  const loadContext = async () => {
    const context = await getContext()
    const [userPunchesBoardID, idleItemId] = await Promise.all([
      getPunchBoard({ userId: context.data.user.id }),
      getIdleId({ boardId: context.data.boardId, userId: context.data.user.id })
    ])

    setContextState((state) => {
      logger.stateChange({
        ...state,
        itemId: context.data.itemId,
        boardId: context.data.boardId,
        userId: context.data.user.id,
        theme: context.data.theme,
        version: `${context.data.appVersion.versionData.major}.${context.data.appVersion.versionData.minor}`,
        userPunchesBoardID,
        idleItemId
      }, 'Context changes')

      return {
      ...state,
      itemId: context.data.itemId,
      boardId: context.data.boardId,
      userId: context.data.user.id,
      theme: context.data.theme,
      version: `${context.data.appVersion.versionData.major}.${context.data.appVersion.versionData.minor}`,
      userPunchesBoardID,
      idleItemId
      }
    })

  }

  return {
    loadContext,
    context: contextState,
  }
}