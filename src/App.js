import React from 'react';

import { Loading } from './components/Loading';
import { Error } from './components/Error';
import { Logs } from './components/Logs';
import { Version } from './components/Version';
import { ActiveTask } from './components/ActiveTask';
import {
  ActionButton,
  BACKGROUND_COLORS,
  BUTTON_TYPES,
} from './components/ActionButton';

import { IDLE_NAME } from './config/constants';
import {
  ERROR_CAN_NOT_GET_ITEM,
  ERROR_CONFIGURATION,
  ERROR_IDLE_ITEM_IS_ABSENT,
  ERROR_NO_LINKED_PUNCH_BOARD,
  ERROR_SETTINGS_WERE_NOT_CONFIGURED,
  ERROR_START_OR_END_ELEMENT_IS_ABSENT,
  ERROR_TIMEPUNCH_WAS_NOT_SAVED,
  ERROR_WRONG_ENVIRONMENT,
} from './config/errors';
import { PublicError } from './errors/PublicError';
import { MondayApi } from './services/monday/api';
import { Logger } from './services/logger';
import { mapToPunchBoardFormat } from './utils/mappers';
import { getMondayDateObject, isEmptyObject } from './utils/utils';
import { Hooks } from './services/hooks';
import {
  getErrorMessage,
  getNextItemFromTheList,
  isButtonVisibleCreator,
  isContextValid,
} from './utils/helpers';

import 'monday-ui-react-core/dist/main.css';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.logger = new Logger();
    this.monday = new MondayApi(this.logger);
    this.hooks = new Hooks(this.logger);

    // Setting default state
    this.state = {
      // Coming from the monday.settings
      start: '', // Start Time column ID
      end: '', // End Time column ID
      logger: false, // Turn on/off the logger

      // Loading indicators
      loaded: false, // Data was loaded
      idleLoaded: false, // Idle task was loaded
      nextLoaded: false, // Next task was loaded

      // Error indicator
      error: false,
      errorMessage: '', // Error message in case it exists

      // Static data that should not change during the work
      userId: '', // Current user ID
      boardId: '', // Current board ID
      idleItemId: '', // Idle task ID
      userPunchesBoardID: '', // Punch board ID
      version: '', // Version of the application
      theme: '', // Theme

      // Other dynamic data
      currentTask: {}, // Current/Last active task from monday.storage
      itemId: '', // Current (opened) item ID
      itemName: '', // Current (opened) item name
      startTimestamp: null,
      endTimestamp: null,
      columnValues: [],
      isIdle: false, // Shows if Idle task is active
      nextItemName: '', // Next task name
      nextItemId: '', // Next task ID
    };
  }

  /**
   * Runs once after the application did mount
   * Loads all the necessary data to work with
   */
  componentDidMount() {
    this.catchError(async () => {
      await this.loadSettings();
      await this.loadContext();
      await Promise.all([
        this.loadPunchBoard(),
        this.loadIdleId(),
        this.loadData(),
        this.loadNextItem(),
        this.loadItemName(),
      ]);
    });
  }

  /**
   * Wrapper for catching an error in the asynchronious code
   * @param {Function} callback - will be run inside try/catch block
   * @param {String} defaultMessage  - will be shown in case of an error different from PulicError
   * @param {Boolean} showErrorNotice - indicates if notification needed to be shown
   */
  catchError = async (callback, defaultMessage, showErrorNotice = false) => {
    try {
      if (this.error) {
        this.logger.log('Error is already exist. No need in teh next actions.');
        return;
      }
      await callback();
    } catch (error) {
      const errorMessage = getErrorMessage(error, defaultMessage);

      this.logger.error(error);
      this.setError(errorMessage);

      if (showErrorNotice) {
        await this.monday.errorNotice(errorMessage);
      }
    }
  };

  /**
   * Changes the current state & logs changes
   * @param {Object} values - key/value object that will be written into the state
   */
  changeState(values) {
    this.setState((state) => ({
      ...state,
      ...values,
    }));

    this.logger.stateChange(values);
  }

  /**
   * Sets error indicators and changes the state
   * @param {String} errorMessage
   */
  setError(errorMessage) {
    if (this.state.error === true) {
      this.logger.highlight('previous error', this.state.errorMessage);
    }
    this.changeState({
      error: true,
      errorMessage: errorMessage,
    });
  }

  /**
   * Removes an error from the state
   */
  clearError() {
    if (this.state.error === true || !!this.state.errorMessage) {
      this.changeState({
        error: false,
        errorMessage: '',
      });
    }
  }

  /**
   * Loads context from monday.com & saves the data to the app's state
   * Should run once after the application was loaded
   */
  loadContext = async () => {
    const context = await this.monday.getContext();
    this.logger.highlight('context', context);

    if (!isContextValid(context)) {
      throw new PublicError(ERROR_WRONG_ENVIRONMENT);
    }

    this.changeState({
      itemId: context.data.itemId,
      boardId: context.data.boardId,
      userId: context.data.user.id,
      theme: context.data.theme,
      version: `${context.data.appVersion.versionData.major}.${context.data.appVersion.versionData.minor}`,
    });
  };

  /**
   * Loads settings for the aplication
   * - (string)  Start Time column ID
   * - (string)  End Time column ID
   * - (boolean) Logger on/off
   */
  loadSettings = async () => {
    await this.monday.listen('settings', (res) => {
      this.logger.highlight('settings', res);

      if (!res.data.start || !res.data.end) {
        this.changeState({ logger: res.data.logger });
        this.setError(ERROR_SETTINGS_WERE_NOT_CONFIGURED);
      } else {
        this.clearError();
        this.changeState({
          start: Object.keys(res.data.start)[0],
          end: Object.keys(res.data.end)[0],
          logger: res.data.logger,
        });
        this.logger.setTurnedOn(res.data.logger);
      }
    });
  };

  /**
   * Loads current user's punch board & stores punch board ID to the app's state
   * Should run once after the application was loaded
   */
  loadPunchBoard = async () => {
    const punchBoard = await this.monday.query.getPunchBoard(this.state.userId);
    const punchBoardId =
      punchBoard.data?.items_page_by_column_values?.items?.[0]
        ?.column_values?.[0]?.value;
    if (!punchBoardId) {
      throw new PublicError(ERROR_NO_LINKED_PUNCH_BOARD);
    }
    this.changeState({
      userPunchesBoardID: JSON.parse(punchBoardId),
    });
  };

  /**
   * Requests current item (task) name from the monday
   * Saves it to the app's state
   * TODO: Check if we can avoid this request using the existed in the satte data
   */
  loadItemName = async () => {
    const res = await this.monday.query.getItemNameById(this.state.itemId);
    if (!res.data?.items?.[0]?.name) {
      throw new PublicError(ERROR_CAN_NOT_GET_ITEM);
    }
    this.changeState({ itemName: res.data.items[0].name });
  };

  /**
   * Requests the information about the Idle column and
   * saves its ID to the app's state
   */
  loadIdleId = async () => {
    const res = await this.monday.query.getIdleColumnByBoardId(
      this.state.boardId,
      this.state.userId
    );

    let idleItemId = res.data.boards?.[0]?.items_page?.items?.[0]?.id;
    if (!idleItemId) {
      throw new PublicError(ERROR_IDLE_ITEM_IS_ABSENT);
    }
    this.changeState({ idleItemId: idleItemId });
  };

  /**
   * Requests all the items from the board linked to the user
   * Searches the next item index in the list and stores data
   * about the next item (id, name) into the app's state
   * TODO: In theory can be triggered once after loading the application and sotred to the app's state
   */
  loadNextItem = async () => {
    // Current task is stored under userId key in monday.storage
    const firstPage = await this.monday.query.getItemsPageByColumnValues(
      JSON.parse(this.state.boardId),
      this.state.userId
    );
    let cursor = firstPage.data?.items_page_by_column_values?.cursor;
    let items = firstPage.data?.items_page_by_column_values?.items || [];

    while (cursor) {
      // loop will stop when cursor is null
      const nextPage = await this.monday.query.getNextItemsPage(cursor);
      const nextPageItems = nextPage.data.next_items_page?.items || [];
      cursor = nextPage.data.next_items_page?.cursor;
      items = [...items, ...nextPageItems];
    }

    const nextItem = getNextItemFromTheList(
      items,
      this.state.itemId,
      this.state.currentTask
    );

    this.changeState({
      nextLoaded: true,
      nextItemName: nextItem?.name || '',
      nextItemId: nextItem?.id || '',
    });
  };

  /**
   * Loads the necessary data needed to work with an item (task)
   * TODO: Check if can be optimized even more
   */
  loadData = async () => {
    // Current task is stored under userId key in monday.storage
    const currentTask = await this.monday.getItemFromStorage(
      this.state.userId,
      {}
    );

    // If current task exists in the storage
    if (!isEmptyObject(currentTask)) {
      // If current task has an ID inside
      if (!!currentTask?.id) {
        const res = await this.monday.query.getDateRangeColumnsByIdsForItem(
          currentTask.id,
          this.state.start,
          this.state.end
        );

        // check if start exists or was deleted by user / automation
        const startDate = res.data.items?.[0]?.column_values?.[0]?.text;
        const endDate = res.data.items?.[0]?.column_values?.[1]?.text;

        // If current task is active
        if (!!startDate && !endDate) {
          this.changeState({
            currentTask: currentTask,
            startTimestamp: startDate,
            endTimestamp: undefined,
          });
          if (currentTask.id === this.state.idleItemId) {
            this.logger.highlight('current active task is an IDLE task');
            this.changeState({ isIdle: true });
          }
        }
        // If current task is not active or does not exist
        else {
          this.logger.highlight('setting currentTask to {} from Load!');
          this.changeState({ currentTask: {} });
          await this.monday.setItemToStorage(this.state.userId, {});
        }
      } else {
        this.logger.highlight(
          'Current task is empty. Re-write it in storage to {}'
        );
        this.changeState({ currentTask: currentTask });
      }
    }

    await this.getAndSetDateValues(
      this.state.start,
      this.state.end,
      currentTask?.name === IDLE_NAME ? currentTask.id : this.state.itemId
    );
  };

  /**
   * Loads the necessary to reload the application data after
   * all actions are done after pushing any button
   */
  reloadData = async () => {
    return Promise.all([
      this.loadData(),
      this.loadNextItem(),
      this.loadItemName(),
    ]);
  };

  /**
   * Requests the information about the start and end date columns
   * Saves requested data to the app's store
   * @param {String} startColumnId
   * @param {String} endColumnId
   * @param {Number} itemId
   */
  getAndSetDateValues = async (startColumnId, endColumnId, itemId) => {
    const response = await this.monday.query.getDateRangeColumnsByIdsForItem(
      itemId,
      startColumnId,
      endColumnId
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
      let startValue = startElement?.value;
      let endValue = endElement?.value;
      let startTimestamp = !!startValue ? JSON.parse(startValue).time : null;
      let endTimestamp = !!endValue ? JSON.parse(endValue).time : null;

      this.changeState({
        startTimestamp,
        endTimestamp,
        columnValues,
        loaded: true,
        idleLoaded: true,
        isIdle: startTimestamp && this.state.currentTask?.name === IDLE_NAME,
      });
    }
  };

  /**
   * Requests an information about the item from monday.com
   * Sends a request to create punch based on the information about the item
   * @param {Number} itemId
   */
  getItemAndPunch = async (itemId) => {
    try {
      const itemRes = await this.monday.query.getItemById(itemId);
      if (!itemRes.data.items?.length) {
        throw new PublicError(ERROR_CAN_NOT_GET_ITEM);
      }
      await this.monday.mutation.createPunch(
        this.state.userPunchesBoardID,
        itemRes.data.items[0].name,
        mapToPunchBoardFormat(itemRes.data.items[0].column_values)
      );
    } catch (error) {
      await this.hooks.createPunchError({ itemid: itemId });
      await this.reloadData();
      throw error;
    }
  };

  /**
   * This is the only entry point for the buttons' onClick action
   * Decides what button was clicked and runs the proper logic
   * @param {String} columnId - Start or End time column ID
   * @param {Number} itemId - the item we're working with
   * @param {Boolean} openNextItemCard - new item card should be loaded
   * TODO: Check if this method can be destructured to several simpler actions
   */
  changeDateValue = async (columnId, itemId, openNextItemCard = false) => {
    // Check whether a regular timepunch or idle time
    this.changeState(
      itemId === this.state.idleItemId
        ? { idleLoaded: false, isIdle: columnId === this.state.start }
        : { loaded: false }
    );

    // Construct date object in UTC
    const dateobject = getMondayDateObject(new Date());

    await this.catchError(
      async () => {
        // Set start/end column value
        const result = await this.monday.mutation.changeColumnValue(
          this.state.boardId,
          itemId,
          columnId,
          dateobject
        );

        // If start is clicked
        if (columnId === this.state.start) {
          const res = await this.monday.mutation.changeColumnValue(
            this.state.boardId,
            itemId,
            this.state.end,
            {}
          );
          this.logger.highlight('End Time is set to {}', res);

          // If Start is clicked and current task is empty
          if (
            isEmptyObject(this.state.currentTask) ||
            !this.state.currentTask?.id
          ) {
            this.logger.highlight('start is clicked and current task is empty');
            await this.monday.setItemToStorage(
              this.state.userId,
              result.data.change_column_value
            );
            this.changeState({
              currentTask: result.data.change_column_value,
            });
            await this.reloadData();
          }
          // If Start is clicked and another current task is being worked on
          else {
            this.logger.highlight(
              'start is clicked and another task is being worked on'
            );
            this.logger.highlight(
              'setting current task',
              result.data.change_column_value
            );
            await this.monday.mutation.changeColumnValue(
              this.state.boardId,
              this.state.currentTask.id,
              this.state.end,
              dateobject
            );
            await this.monday.setItemToStorage(
              this.state.userId,
              result.data.change_column_value
            );
            await this.getItemAndPunch(
              this.state.currentTask.id,
              openNextItemCard
            );
            // If start next item was clicked, open the next item card. Otherwise reload
            if (openNextItemCard) {
              await this.monday.openItemCard(this.state.nextItemId);
            } else {
              await this.reloadData();
            }
          }
          // Else, end is clicked
        } else {
          this.logger.highlight('end is clicked');
          await this.getItemAndPunch(itemId, openNextItemCard);
          this.logger.highlight('setting current to {}');
          this.changeState({ currentTask: {} });
          await this.monday.setItemToStorage(this.state.userId, {});
          await this.reloadData();
        }
        this.monday.successNotice('Timestamp saved!');
      },
      ERROR_TIMEPUNCH_WAS_NOT_SAVED,
      true
    );
  };

  /**
   * Renders the application
   */
  render() {
    const {
      startTimestamp,
      endTimestamp,
      loaded,
      userId,
      idleLoaded,
      nextLoaded,
      isIdle,
      nextItemId,
      error,
      itemName,
      nextItemName,
      theme,
      logger,
      version,
      errorMessage,
    } = this.state;

    const isButtonVisible = isButtonVisibleCreator(this.state);

    return (
      <div
        className="App"
        style={{ color: theme === 'dark' ? '#D5D8DE' : '#0' }}
      >
        <Version version={version} />
        <Logs
          turnedOn={logger}
          userId={userId}
          currentTask={this.state.currentTask}
          isIdle={isIdle}
          loaded={loaded}
          startTimestamp={startTimestamp}
          endTimestamp={endTimestamp}
          nextItemId={nextItemId}
          error={error}
          errorMessage={errorMessage}
        />
        {idleLoaded && loaded && nextLoaded && !error ? (
          <>
            {!error ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <ActiveTask currentTask={this.state.currentTask} />

                {isButtonVisible(BUTTON_TYPES.StartTask) && (
                  <ActionButton
                    loading={!loaded}
                    onClick={() => {
                      this.changeDateValue(this.state.start, this.state.itemId);
                    }}
                    backgroundColor={BACKGROUND_COLORS.StartTask}
                  >
                    Start Task: {itemName}
                  </ActionButton>
                )}

                {isButtonVisible(BUTTON_TYPES.EndTask) && (
                  <ActionButton
                    loading={!loaded}
                    onClick={() => {
                      this.changeDateValue(this.state.end, this.state.itemId);
                    }}
                    backgroundColor={BACKGROUND_COLORS.EndTask}
                  >
                    End Task
                  </ActionButton>
                )}

                {isButtonVisible(BUTTON_TYPES.StartNextTask) && (
                  <ActionButton
                    disabled={!nextItemId}
                    loading={!loaded}
                    onClick={() => {
                      this.changeDateValue(
                        this.state.start,
                        this.state.nextItemId,
                        true
                      );
                    }}
                    backgroundColor={BACKGROUND_COLORS.StartNextTask}
                  >
                    Start Next Task: {nextItemName}
                  </ActionButton>
                )}

                {isButtonVisible(BUTTON_TYPES.StartIdleTime) ? (
                  <ActionButton
                    loading={!idleLoaded}
                    onClick={() => {
                      this.changeDateValue(
                        this.state.start,
                        this.state.idleItemId
                      );
                    }}
                    backgroundColor={BACKGROUND_COLORS.StartIdleTime}
                  >
                    Start Idle Time
                  </ActionButton>
                ) : (
                  <ActionButton
                    loading={!idleLoaded}
                    onClick={() => {
                      this.changeDateValue(
                        this.state.end,
                        this.state.idleItemId
                      );
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
        ) : error ? (
          <Error errorMessage={errorMessage} />
        ) : (
          <Loading />
        )}
      </div>
    );
  }
}

export default App;
