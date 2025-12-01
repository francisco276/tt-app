import { useState, useMemo, useEffect } from 'react'
import { useError, useContext, useNextItem } from './hooks';

import { MondayApi } from './services/monday/api';
import { Logger } from './services/logger';
import { Hooks } from './services/hooks';
import { PublicError } from './errors/PublicError';

import { getMondayDateObject, isEmptyObject } from './utils/utils';
import {
  getErrorMessage,
  isButtonVisibleCreator,
} from './utils/helpers';
import { mapToPunchBoardFormat } from './utils/mappers';

import { IDLE_NAME } from './config/constants';
import {
  ERROR_CAN_NOT_GET_ITEM,
  ERROR_CONFIGURATION,
  ERROR_SETTINGS_WERE_NOT_CONFIGURED,
  ERROR_START_OR_END_ELEMENT_IS_ABSENT,
  ERROR_TIMEPUNCH_WAS_NOT_SAVED,
} from './config/errors'
import { BACKGROUND_COLORS } from './const/background-colors';
import { BUTTON_TYPES } from './const/button-types';

import { AppStateDefault, type AppSettings, type Task } from './types'
import { Error } from './components/Error'
import { Loading } from './components/Loading'
import { Logs } from './components/Logs';
import { Version } from './components/Version';
import { ActiveTask } from './components/ActiveTask';
import { ActionButton } from './components/ActionButton';

import './App.css';
import "../node_modules/@vibe/core/dist/tokens/tokens.css";

export default function App() {

  const logger = useMemo(() => new Logger(), [])
  const monday = useMemo(() => new MondayApi(logger), [logger])
  const hooks = useMemo(() => new Hooks(logger), [logger])

  const [settings, setSettings] = useState<AppSettings>({
    start: '',
    end: '',
    logger: false
  })
  const { errorState, errorMessage, setError, clearError } = useError({ logger })
  const { loadContext, context } = useContext({ monday, logger })
  const { nextItemState, getNexItem } = useNextItem({ monday, logger })

  const [currentTaskState, setCurrentTaskState] = useState<Task>({})
  const [state, setState] = useState<AppStateDefault>({
      loaded: false, // Data was loaded
      idleLoaded: false, // Idle task was loaded
      itemName: '', // Current (opened) item name
      startTimestamp: null,
      endTimestamp: null,
      columnValues: [],
      isIdle: false, // Shows if Idle task is active
  })

  function changeCurrentTask(values: Partial<Task>) {
    setCurrentTaskState(values)
    logger.stateChange(values, `Current Task Changes - User: ${context.userId}`)
  }

  function changeState(values: Partial<AppStateDefault>) {
    setState((state) => ({
      ...state,
      ...values,
    }))

    logger.stateChange(values, `State Changes - User: ${context.userId}`)
  }
  

  useEffect(() => {
    catchError(async () => {
      listenForSettingsChanges()
      await loadContext()
    })
    return () => {}
  }, [])


  useEffect(() => {
    const isContextValid = Object.values(context).every((value) => value !== '')
    if (!isContextValid) return

    catchError(async () => {
      await Promise.all([
        loadData(),
        getNexItem({
          boardId: context.boardId,
          userId: context.userId,
          itemId: context.itemId,
          currentTask: currentTaskState,
          },
          `- User: ${context.userId}`
        ),
        loadItemName(),
      ])     
    })
  }, [context])

  const catchError = async (callback: () => void | Promise<void>, defaultMessage?: string, showErrorNotice = false) => {
    try {
      if (errorState.error) {
        logger.log('Error is already exist. No need in teh next actions.')
        return
      }
      await callback()
    } catch (error) {
      const errorMessage = getErrorMessage(error, defaultMessage)

      logger.error(error)
      setError(errorMessage)

      if (showErrorNotice) {
        await monday.errorNotice(errorMessage)
      }
    }
  }

  async function listenForSettingsChanges () {
    await monday.listen('settings', (res) => {
      logger.forceHighlight('settings', res)
      
      const invalidDateColumns = !res.data.start || !res.data.end
      
      if (invalidDateColumns) {
        setError(ERROR_SETTINGS_WERE_NOT_CONFIGURED)
        return
      }

      logger.setTurnedOn(res.data.logger);
      clearError()
      setSettings((state) => ({
        ...state,
        start: Object.keys(res.data.start)[0],
        end: Object.keys(res.data.end)[0],
        logger: res.data.logger,
      }))
    })
  }

  const loadData = async () => {
    // Current task is stored under userId key in monday.storage
    const currentTask = await monday.getItemFromStorage(
      context.userId,
      {}
    );

    // If current task exists in the storage
    if (!isEmptyObject(currentTask)) {
      // If current task has an ID inside
      if (currentTask?.id) {
        const res = await monday.query.getDateRangeColumnsByIdsForItem(
          currentTask.id,
          settings.start,
          settings.end,
          `- User: ${context.userId}`
        )

        // check if start exists or was deleted by user / automation
        const startDate = res.data.items?.[0]?.column_values?.[0]?.text;
        const endDate = res.data.items?.[0]?.column_values?.[1]?.text;

        // If current task is active
        if (!!startDate && !endDate) {
          changeCurrentTask(currentTask)
          changeState({
            startTimestamp: startDate,
            endTimestamp: undefined,
          })
          if (currentTask.id === context.idleItemId) {
            logger.highlight(`current active task is an IDLE task - User: ${context.userId}`);
            changeState({ isIdle: true })
          }
        }
        // If current task is not active or does not exist
        else {
          logger.highlight(`setting currentTask to {} from Load! - User: ${context.userId}`);
          changeCurrentTask({})
          await monday.setItemToStorage(context.userId, {});
        }
      } else {
        logger.highlight(
          `Current task is empty. Re-write it in storage to {} - User: ${context.userId}`
        );
        changeCurrentTask(currentTask)
      }
    }

    await getAndSetDateValues(
      settings.start,
      settings.end,
      currentTask?.name === IDLE_NAME ? currentTask.id : context.itemId,
      currentTask
    );
  }

  const getAndSetDateValues = async (startColumnId: string, endColumnId: string, itemId: number, currentTask: Task) => {
    const response = await monday.query.getDateRangeColumnsByIdsForItem(
      itemId,
      startColumnId,
      endColumnId,
      `- User: ${context.userId}`
    );
    const columnValues = response.data?.items?.[0]?.column_values;
    if (!columnValues || !Array.isArray(columnValues)) {
      throw new PublicError(ERROR_CAN_NOT_GET_ITEM);
    }

    const startElement = columnValues.find((cv) => cv.id === startColumnId);
    const endElement = columnValues.find((cv) => cv.id === endColumnId);

    // Columns does not exist
    if (!startElement || !endElement) {
      throw new PublicError(ERROR_START_OR_END_ELEMENT_IS_ABSENT);
    } else {
      const startValue = startElement?.value;
      const endValue = endElement?.value;
      const startTimestamp = startValue ? JSON.parse(startValue).time : null;
      const endTimestamp = endValue ? JSON.parse(endValue).time : null;

      changeState({
        startTimestamp,
        endTimestamp,
        columnValues,
        loaded: true,
        idleLoaded: true,
        isIdle: startTimestamp && currentTask?.name === IDLE_NAME
      });
    }
  }

  const changeDateValue = async (columnId: string, itemId: number | string, openNextItemCard = false) => {
    // Check whether a regular timepunch or idle time
    changeState(
      itemId === context.idleItemId
        ? { idleLoaded: false, isIdle: columnId === settings.start }
        : { loaded: false }
    );

    // Construct date object in UTC
    const dateobject = getMondayDateObject(new Date());

    await catchError(
      async () => {
        // Set start/end column value
        const result = await monday.mutation.changeColumnValue(
          context.boardId,
          itemId,
          columnId,
          dateobject,
          `- User: ${context.userId}`
        );

        // If start is clicked
        if (columnId === settings.start) {
          const res = await monday.mutation.changeColumnValue(
            context.boardId,
            itemId,
            settings.end,
            {},
            `- User: ${context.userId}`
          );
          logger.highlight(`End Time is set to {} - User: ${context.userId}`, res);

          
          // If Start is clicked and current task is empty
          if ( isEmptyObject(currentTaskState) || !currentTaskState?.id) {
            logger.highlight(`start is clicked and current task is empty - User: ${context.userId}`);
            await monday.setItemToStorage(
              context.userId,
              result.data.change_column_value
            )
            changeCurrentTask(result.data.change_column_value)
            await reloadData()
          }
          // If Start is clicked and another current task is being worked on
          else {
            logger.highlight(`start is clicked and another task is being worked on - User: ${context.userId}`)
            logger.highlight(`setting current task - User: ${context.userId}`, result.data.change_column_value)

            await monday.mutation.changeColumnValue(
              context.boardId,
              currentTaskState.id,
              settings.end,
              dateobject,
            `- User: ${context.userId}`
            )
            await monday.setItemToStorage(
              context.userId,
              result.data.change_column_value
            );
            await getItemAndPunch(
              currentTaskState.id,
            );
            // If start next item was clicked, open the next item card. Otherwise reload
            if (openNextItemCard) {
              await monday.openItemCard(nextItemState.nextItemId)
            } else {
              await reloadData()
            }
          }
          // Else, end is clicked
        } else {
          logger.highlight(`end is clicked - User: ${context.userId}`);
          await getItemAndPunch(itemId);
          logger.highlight(`setting current to {} - User: ${context.userId}`);
          changeCurrentTask({})
          await monday.setItemToStorage(context.userId, {});
          await reloadData();
        }
        monday.successNotice(`Timestamp saved! - User: ${context.userId}`)
      },
      ERROR_TIMEPUNCH_WAS_NOT_SAVED,
      true
    );
  }

  const getItemAndPunch = async (itemId: string | number) => {
    try {
      const itemRes = await monday.query.getItemById(itemId, `- User: ${context.userId}`);
      if (!itemRes.data.items?.length) {
        throw new PublicError(ERROR_CAN_NOT_GET_ITEM)
      }
      logger.highlight(`Before create punch: ${itemId} on board ${context.boardId} - User: ${context.userId}`)
      await monday.mutation.createPunch(
        context.userPunchesBoardID,
        itemRes.data.items[0].name,
        mapToPunchBoardFormat(itemRes.data.items[0].column_values, context.boardId),
        `- User: ${context.userId}`
      );
      logger.highlight(`Punch created for item ${itemId} on board ${context.boardId} - User: ${context.userId}`)
    } catch (error) {
      await hooks.createPunchError({ itemid: itemId })
      await reloadData()
      throw error;
    }
  }

  const loadItemName = async () => {
    const res = await monday.query.getItemNameById(context.itemId, `- User: ${context.userId}`);
    if (!res.data?.items?.[0]?.name) {
      throw new PublicError(ERROR_CAN_NOT_GET_ITEM);
    }
    changeState({ itemName: res.data.items[0].name });
  }

  const reloadData = async () => {
    await loadData()
    return Promise.all([
      getNexItem({
        boardId: context.boardId,
        userId: context.userId,
        itemId: context.itemId,
        currentTask: currentTaskState,
        },
        `- User: ${context.userId}`
      ),
      loadItemName(),
    ]);
  }

  const isButtonVisible = isButtonVisibleCreator({
    startTimestamp: state.startTimestamp,
    endTimestamp: state.endTimestamp,
    isIdle: state.isIdle,
    nextItemId: nextItemState.nextItemId,
    idleItemId: context.idleItemId,
    currentTask: currentTaskState,
    itemId: context.itemId,
    itemName: state.itemName
  })
  
  return (
      <div
        className="App"
        style={{ color: context.theme === 'dark' ? '#D5D8DE' : '#0' }}
      >
        <Version version={context.version} />
        <Logs
          turnedOn={settings.logger}
          userId={context.userId}
          currentTask={currentTaskState}
          isIdle={state.isIdle}
          loaded={state.loaded}
          startTimestamp={state.startTimestamp}
          endTimestamp={state.endTimestamp}
          nextItemId={nextItemState.nextItemId}
          error={errorState.error}
          errorMessage={errorMessage}
        />
        {state.idleLoaded && state.loaded && nextItemState.nextLoaded && !errorState.error ? (
          <>
            {!errorState.error ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <ActiveTask currentTask={currentTaskState} />

                {isButtonVisible(BUTTON_TYPES.StartTask) && (
                  <ActionButton
                    loading={!state.loaded}
                    onClick={() => {
                      changeDateValue(settings.start, context.itemId);
                    }}
                    backgroundColor={BACKGROUND_COLORS.StartTask}
                  >
                    Start Task: { state.itemName}
                  </ActionButton>
                )}

                {isButtonVisible(BUTTON_TYPES.EndTask) && (
                  <ActionButton
                    loading={!state.loaded}
                    onClick={() => {
                      changeDateValue(settings.end, context.itemId);
                    }}
                    backgroundColor={BACKGROUND_COLORS.EndTask}
                  >
                    End Task
                  </ActionButton>
                )}

                {isButtonVisible(BUTTON_TYPES.StartNextTask) && (
                  <ActionButton
                    disabled={!nextItemState.nextItemId}
                    loading={!state.loaded}
                    onClick={() => {
                      changeDateValue(settings.start, nextItemState.nextItemId, true);
                    }}
                    backgroundColor={BACKGROUND_COLORS.StartNextTask}
                  >
                    Start Next Task: {nextItemState.nextItemName}
                  </ActionButton>
                )}

                {isButtonVisible(BUTTON_TYPES.StartIdleTime) ? (
                  <ActionButton
                    loading={!state.idleLoaded}
                    onClick={() => {
                      changeDateValue(
                        settings.start,
                        context.idleItemId
                      );
                    }}
                    backgroundColor={BACKGROUND_COLORS.StartIdleTime}
                  >
                    Start Idle Time
                  </ActionButton>
                ) : (
                  <ActionButton
                    loading={!state.idleLoaded}
                    onClick={() => {
                      changeDateValue(
                        settings.end,
                        context.idleItemId
                      )
                    }}
                    backgroundColor={BACKGROUND_COLORS.EndIdleTime}
                  >
                    End Idle Time
                  </ActionButton>
                )}
              </div>
            ) : (
              <Error
                title="Configuration Error"
                errorMessage={ERROR_CONFIGURATION}
              />
            )}
          </>
        ) : errorState.error ? (
          <Error errorMessage={errorMessage} />
        ) : (
          <Loading />
        )}
      </div>
    )
}