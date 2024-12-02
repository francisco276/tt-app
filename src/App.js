import React from 'react';
import _ from 'lodash';

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

import { ENV, IDLE_NAME } from './config/constants';
import {
  DEFAULT_ERROR,
  ERROR_CAN_NOT_GET_ITEM,
  ERROR_CONFIGURATION,
  ERROR_IDLE_ITEM_IS_ABSENT,
  ERROR_NO_LINKED_PUBCH_BOARD,
  ERROR_SETTINGS_WERE_NOT_CONFIGURED,
  ERROR_START_OR_END_ELEMENT_IS_ABSENT,
  ERROR_TIMEPUNCH_WAS_NOT_SAVED,
  ERROR_WRONG_ENVIRONMENT,
} from './config/errors';
import { PublicError } from './errors/PublicError';
import { fetchHook } from './api/fetchHook';
import { MondayApi } from './services/monday/api';
import { Logger } from './services/logger';
import { mapItem } from './utils/mappers';
import { getMondayDateObject } from './utils/utils';

import 'monday-ui-react-core/dist/main.css';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.logger = new Logger();
    this.monday = new MondayApi(this.logger);

    // Default state
    this.state = {
      start: '',
      end: '',
      itemId: '',
      itemName: '',
      loaded: false,
      idleLoaded: false,
      nextLoaded: false,
      startTimestamp: null,
      endTimestamp: null,
      columnValues: [],
      currentTask: {},
      userId: '',
      boardId: '',
      idleItemId: '',
      isIdle: false,
      nextItemName: '',
      nextItemId: '',
      error: false,
      errorMessage: '',
      logger: false,
      version: '',
      userPunchesBoardID: '',
    };
  }

  // @done & @todos
  componentDidMount() {
    this.catchError(async () => {
      await this.monday.listen('settings', (res) => {
        this.logger.highlight('settings', res);
        if (ENV === 'production') {
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
          }
        } else {
          this.clearError();
          this.changeState({
            start: 'date',
            end: 'dup__of_start',
            logger: true,
          });
          this.logger.turnOn();
        }
      });
      await this.loadContext();
      await Promise.all([
        this.loadPunchBoard(),
        this.loadIdleColumn(),
        this.loadData(),
        this.getNextItemId(),
        this.setItemName(),
      ]);
    });
  }

  // @done
  async catchError(callback, defaultMessage, showErrorNotice = false) {
    try {
      if (this.error) {
        this.logger.log('Error is already exist. No need in teh next actions.');
        return;
      }
      await callback();
    } catch (error) {
      const errorMessage = this.getErrorMessage(error, defaultMessage);

      this.logger.error(error);
      this.setError(errorMessage);

      if (showErrorNotice) {
        await this.monday.errorNotice(errorMessage);
      }
    }
  }

  // @done
  changeState(values) {
    this.setState((state) => ({
      ...state,
      ...values,
    }));

    this.logger.stateChange(values);
  }

  // @done
  setError(errorMessage) {
    if (this.state.error === true) {
      this.logger.highlight('previous error', this.state.errorMessage);
    }
    this.changeState({
      error: true,
      errorMessage: errorMessage,
    });
  }

  // @done
  clearError() {
    if (this.state.error === true || !!this.state.errorMessage) {
      this.changeState({
        error: false,
        errorMessage: '',
      });
    }
  }

  // @done
  isContextValid(context) {
    return (
      !!context &&
      !!context.data &&
      !!context.data.itemId &&
      !!context.data.boardId &&
      !!context.data.theme &&
      !!context.data.user?.id &&
      !!context.data.appVersion.versionData
    );
  }

  // @done
  getErrorMessage(error, defaultMessage = DEFAULT_ERROR) {
    return error instanceof PublicError ? error.message : defaultMessage;
  }

  // @done
  loadContext = async () => {
    const context = await this.monday.getContext();
    this.logger.highlight('context', context);

    if (!this.isContextValid(context)) {
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

  // @done
  loadPunchBoard = async () => {
    const punchBoard = await this.monday.query.getPunchBoard(this.state.userId);
    const punchBoardId =
      punchBoard.data?.items_page_by_column_values?.items?.[0]
        ?.column_values?.[0]?.value;
    if (!punchBoardId) {
      throw new PublicError(ERROR_NO_LINKED_PUBCH_BOARD);
    }
    this.changeState({
      userPunchesBoardID: JSON.parse(punchBoardId),
    });
  };

  // @done
  reloadData = async () => {
    return Promise.all([
      this.loadData(),
      this.getNextItemId(),
      this.setItemName(),
    ]);
  };

  // @done
  loadData = async () => {
    // Current task is stored under userId key in monday.storage
    const currentTask = await this.monday.getItemFromStorage(
      this.state.userId,
      {}
    );

    // If current task exists in the storage
    if (!_.isEmpty(currentTask)) {
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

        this.logger.highlight('dates', {
          startDate,
          endDate,
        });

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
        } else {
          // If current task is not active or does not exist
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

  // @done
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

    // const itemName = response.data?.items?.[0]?.name;
    const startElement = _.find(columnValues, (cv) => cv.id === startColumnId);
    const endElement = _.find(columnValues, (cv) => cv.id === endColumnId);

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

  // @done & @todos
  getItemAndPunch = async (itemId) => {
    try {
      const itemRes = await this.monday.query.getItemById(itemId);
      if (!itemRes.data.items?.length) {
        throw new PublicError(ERROR_CAN_NOT_GET_ITEM);
      }
      const { name, cv } = mapItem(
        itemRes.data.items[0].column_values,
        itemRes.data.items[0].name
      );
      await this.monday.mutation.createPunch(
        this.state.userPunchesBoardID,
        name,
        cv
      );
    } catch (error) {
      await fetchHook({ itemid: itemId });
      await this.reloadData(); // TODO: Check if we need it
      throw error;
    }
  };

  // @done
  setItemName = async () => {
    const res = await this.monday.query.getItemNameById(this.state.itemId);
    if (!res.data?.items?.[0]?.name) {
      throw new PublicError(ERROR_CAN_NOT_GET_ITEM);
    }
    this.changeState({ itemName: res.data.items[0].name });
  };

  // @done
  getNextItemId = async () => {
    // Current task is stored under userId key in monday.storage
    const firstPage = await this.monday.query.getItemsPageByColumnValues(
      JSON.parse(this.state.boardId),
      this.state.userId
    );
    let cursor = firstPage.data?.items_page_by_column_values?.cursor;
    let items = firstPage.data?.items_page_by_column_values?.items;

    while (cursor) {
      // loop will stop when cursor is null
      const nextPage = await this.monday.query.getNextItemsPage(cursor);
      cursor = nextPage.data.next_items_page.cursor;
      items = _.flatten(_.union(items, nextPage.data.next_items_page.items));
    }

    const currentTaskIndex = this.state.currentTask?.id
      ? _.findIndex(
          items,
          (item) => Number(item.id) === Number(this.state.currentTask?.id)
        )
      : -1;
    const currentItemIndex = _.findIndex(
      items,
      (item) => Number(item.id) === Number(this.state.itemId)
    );
    const index =
      currentItemIndex > currentTaskIndex ? currentItemIndex : currentTaskIndex;

    const nextItem = items[index + 1];
    this.changeState({
      nextLoaded: true,
      nextItemName: nextItem ? nextItem.name : '',
      nextItemId: index === items.length - 1 ? '' : items[index + 1].id,
    });
  };

  // @done
  loadIdleColumn = async () => {
    const res = await this.monday.query.getIdleColumnByBoardId(
      this.state.boardId,
      this.state.userId
    );

    let idleItem = res.data.boards[0].items_page.items[0];
    if (!idleItem) {
      throw new PublicError(ERROR_IDLE_ITEM_IS_ABSENT);
    } else {
      this.changeState({ idleItemId: idleItem.id });
    }
  };

  // @done
  timeStampSaved = async () => {
    await this.monday.successNotice('Timestamp saved!');
  };

  // @action & @done
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
          this.logger.highlight('End is set to {}', res);
          const currentTask = await this.monday.getItemFromStorage(
            this.state.userId,
            {}
          );
          // If Start is clicked and current task is empty
          if (_.isEmpty(currentTask) || !currentTask?.id) {
            this.logger.highlight('start is clicked and current task is empty');
            await this.monday.setItemToStorage(
              this.state.userId,
              result.data.change_column_value
            );
            this.changeState({
              currentTask: result.data.change_column_value,
            });
            await this.reloadData();
            this.timeStampSaved();
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
              currentTask.id,
              this.state.end,
              dateobject
            );
            await this.monday.setItemToStorage(
              this.state.userId,
              result.data.change_column_value
            );
            await this.getItemAndPunch(currentTask.id, openNextItemCard);
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
          this.timeStampSaved();
        }
      },
      ERROR_TIMEPUNCH_WAS_NOT_SAVED,
      true
    );
  };

  // @done
  isButtonVisible(type) {
    const {
      startTimestamp,
      endTimestamp,
      isIdle,
      nextItemId,
      idleItemId,
      currentTask,
      itemId,
      itemName,
    } = this.state;

    switch (type) {
      case BUTTON_TYPES.StartTask:
        return (
          (!startTimestamp || isIdle || (!!startTimestamp && !!endTimestamp)) &&
          itemName !== 'Idle' &&
          !isIdle
        );
      case BUTTON_TYPES.EndTask:
        return (
          (!startTimestamp && !endTimestamp) ||
          (!!startTimestamp && !endTimestamp && !isIdle)
        );
      case BUTTON_TYPES.StartNextTask:
        return (
          (startTimestamp || isIdle || (!!startTimestamp && !!endTimestamp)) &&
          nextItemId &&
          idleItemId !== itemId &&
          currentTask?.name &&
          !isIdle
        );
      case BUTTON_TYPES.StartIdleTime:
        return (
          (!startTimestamp ||
            (!!startTimestamp && !!endTimestamp) ||
            (!!startTimestamp && !endTimestamp && !isIdle)) &&
          !isIdle
        );
      case BUTTON_TYPES.EndIdleTime:
        return !this.isButtonVisible(BUTTON_TYPES.StartIdleTime);
      default:
        return false;
    }
  }

  // @done
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

                {this.isButtonVisible(BUTTON_TYPES.StartTask) && (
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

                {this.isButtonVisible(BUTTON_TYPES.EndTask) && (
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

                {this.isButtonVisible(BUTTON_TYPES.StartNextTask) && (
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

                {this.isButtonVisible(BUTTON_TYPES.StartIdleTime) ? (
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
