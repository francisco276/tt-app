import React from 'react';
import './App.css';
import mondaySdk from 'monday-sdk-js';
import 'monday-ui-react-core/dist/main.css';
import Button from 'monday-ui-react-core/dist/Button.js';
import Loader from 'monday-ui-react-core/dist/Loader.js';
import AttentionBox from 'monday-ui-react-core/dist/AttentionBox.js';
import _, { create } from 'lodash';
import moment from 'moment-timezone';

const monday = mondaySdk({ apiVersion: '2023-10' });
monday.setToken(
  'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjIyNTk5MjQ5NCwiYWFpIjoxMSwidWlkIjozMTc0MjU2NywiaWFkIjoiMjAyMy0wMS0xOVQxNzo0NTowOS4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTE4MjQwMzIsInJnbiI6InVzZTEifQ.f7cLiwfdIsuL15yVD0QFnm06JUCIIutMojHSyEJ63Ls'
);
const TimepunchCurrentColumnID = 'text9';
const EmployeesBoardID = 2772063654;
const PeopleColumnID = 'person';

class App extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      start: '',
      end: '',
      itemId: '',
      itemName: '',
      time: '',
      loaded: false,
      idleLoaded: false,
      nextLoaded: false,
      startTimestamp: null,
      endTimestamp: null,
      columnValues: [],
      currentTask: '{}',
      userId: '',
      boardId: '',
      idleValue: 'Idle',
      idleItemId: '',
      isIdle: false,
      nextItemId: '',
      error: false,
      logger: false,
      clock: moment().tz('America/Chicago').format('MMM Do h:mm:ss a'),
      version: '',
      userPunchesBoardID: '',
    };
  }

  componentDidMount() {
    monday.listen('settings', (res) => {
      this.setState({ logger: res.data.logger });
      if (!res.data.start || !res.data.end) {
        this.setState({ error: true });
      } else
        this.setState({
          error: false,
          start: Object.keys(res.data.start)[0],
          end: Object.keys(res.data.end)[0],
          logger: res.data.logger,
        });
    });
    this.loadData();
    this.interval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
  };

  tick() {
    this.setState({
      clock: moment().tz('America/Chicago').format('MMM Do h:mm:ss a'),
    });
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  loadData = async (itemId) => {
    monday
      .get('context')
      .then((res) => {
        this.setState({
          itemId: res.data.itemId,
          boardId: res.data.boardId,
          userId: res.data.user.id,
          theme: res.data.theme,
          version: `${res.data.appVersion.versionData.major}.${res.data.appVersion.versionData.minor}`,
        });
        return res.data.boardId;
      })
      .then(() =>
        monday.storage.instance
          .getItem(this.state.userId)
          .then((storageResult) => {
            // console.log('getItem', storageResult);
            if (!!storageResult.data.value) {
              if (!!JSON.parse(storageResult.data.value).id) {
                let getItemId = JSON.parse(storageResult.data.value).id;
                // console.log('getItemId?', getItemId);
                this.getDates(this.state.start, this.state.end, getItemId).then(
                  (date_res) => {
                    // console.log('get dates', date_res);
                    // console.log('state', JSON.stringify(this.state));
                    // check if start exists or was deleted by user / automation
                    if (
                      !!date_res.data.items[0].column_values[0].text &&
                      !date_res.data.items[0].column_values[1].text
                    ) {
                      // console.log('i am here', JSON.parse(storageResult.data.value).id, this.state.idleItemId);
                      this.setState({
                        currentTask: storageResult.data.value,
                        startTimestamp:
                          date_res.data.items[0].column_values[0].text,
                        endTimestamp: undefined,
                      });
                      if (
                        JSON.parse(storageResult.data.value).id ===
                        this.state.idleItemId
                      ) {
                        // console.log('idle set to true');
                        this.setState({ isIdle: true });
                      }
                    }
                    // if (!!date_res.data.items[0].column_values[0].text) this.setState({ currentTask: res.data.value })
                    else {
                      // console.log('setting current to {} from Load!');
                      this.setState({ currentTask: JSON.stringify({}) });
                      monday.storage.instance.setItem(this.state.userId, '{}');
                    }
                  }
                );
              } else this.setState({ currentTask: storageResult.data.value });
            }
          })
      )
      .then((boardId) => {
        if (!this.state.error) {
          let itemId =
            this.state.currentTask &&
            JSON.parse(this.state.currentTask).name === 'Idle'
              ? JSON.parse(this.state.currentTask).id
              : this.state.itemId;
          this.getIdleColumnNew();
          this.getAndSetDateValues(this.state.start, this.state.end, itemId);
          this.setItemName(this.state.itemId);
        } else this.setState({ loaded: true, idleLoaded: true });
      })
      .then(() => this.getUserBoardId())
      .then((res) => {
        // console.log('Console:', res);
        this.setState({
          userPunchesBoardID:
            res.data.items_page_by_column_values.items[0].column_values[0]
              .value,
        });
      })
      .then(() => this.getNextItemIdNew(this.state.boardId));
  };

  componentWillUnmount() {
    // delete the interval just before component is removed
    clearInterval(this.update);
  }

  getAndSetDateValues = async (startColumnId, endColumnId, itemId) => {
    itemId =
      this.state.currentTask &&
      JSON.parse(this.state.currentTask).name === 'Idle'
        ? JSON.parse(this.state.currentTask).id
        : itemId;
    // console.log('item id?????', itemId);
    monday
      .api(
        `query { items(ids:${itemId}) { name column_values(ids:["${startColumnId}","${endColumnId}"]) { id value } subitems { id column_values { type value } } } }`
      )
      .then((res) => {
        let columnValues = res.data.items[0].column_values;
        let subitemValues = res.data.items[0].subitems;
        let startElement = _.find(
          columnValues,
          (cv) => cv.id === startColumnId
        );
        let endElement = _.find(columnValues, (cv) => cv.id === endColumnId);
        let itemName = res.data.items[0].name;
        if (itemName !== 'Idle') this.setState({ itemName });
        if (!startElement || !endElement) {
          this.setState({ error: true, loaded: true, idleLoaded: true });
        } else {
          let startValue = _.find(
            columnValues,
            (cv) => cv.id === startColumnId
          ).value;
          let endValue = _.find(
            columnValues,
            (cv) => cv.id === endColumnId
          ).value;
          let startTimestamp = !!startValue
            ? JSON.parse(startValue).time
            : null;
          let endTimestamp = !!endValue ? JSON.parse(endValue).time : null;
          // console.log('set current task', this.state.currentTask);
          this.setState({
            startTimestamp,
            endTimestamp,
            columnValues,
            subitemValues,
            loaded: true,
            idleLoaded: true,
          });
          this.setState({
            columnValues,
            subitemValues,
            loaded: true,
            idleLoaded: true,
          });
          this.setState({
            isIdle:
              this.state.currentTask &&
              startTimestamp &&
              JSON.parse(this.state.currentTask).name === 'Idle',
          });
          return columnValues;
        }
      });
  };

  getUserBoardId = async () => {
    return monday.api(
      `query {
      items_page_by_column_values (limit: 1, board_id: ${EmployeesBoardID}, columns: [{column_id: "${PeopleColumnID}", column_values: ["${this.state.userId}"]}]) {
        cursor
        items {
          column_values(ids:"${TimepunchCurrentColumnID}") {
            id
            value
          }
        }
      }
    }`,
      { apiVersion: '2023-10' }
    );
  };

  createPunch = async (itemName, columnValues) => {
    const mutation = `mutation create_item($boardId: ID!, $itemName: String!, $columnValue: JSON) {
      create_item(board_id:$boardId, item_name:$itemName, column_values:$columnValue, create_labels_if_missing: true) {
          id
      }
    }`;
    const variables = {
      boardId: JSON.parse(this.state.userPunchesBoardID),
      itemName,
      columnValue: JSON.stringify(columnValues),
    };
    return monday.api(mutation, { apiVersion: '2023-10', variables });
  };

  getItemAndPunch = async (itemId, dataObject, nextItem) => {
    let query = `query {
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
    }
      `;
    fetch('https://api.monday.com/v2', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjIyNTk5MjQ5NCwiYWFpIjoxMSwidWlkIjozMTc0MjU2NywiaWFkIjoiMjAyMy0wMS0xOVQxNzo0NTowOS4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTE4MjQwMzIsInJnbiI6InVzZTEifQ.f7cLiwfdIsuL15yVD0QFnm06JUCIIutMojHSyEJ63Ls',
        'API-Version': '2023-10',
      },
      body: JSON.stringify({
        query: query,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        let columnData = res.data.items[0].column_values;
        let itemName = res.data.items[0].name;
        let start = JSON.parse(
          _.find(columnData, (item) => item.id === 'date').value
        );
        let end = JSON.parse(
          _.find(columnData, (item) => item.id === 'dup__of_start').value
        );
        delete start.changed_at;
        delete end.changed_at;
        // console.log('API Result', JSON.stringify(res));
        console.log(
          _.find(columnData, (item) => item.id === 'dup__of_pod').text
        );
        return {
          name: res.data.items[0].name,
          cv: {
            dropdown3: {
              labels: [
                _.find(columnData, (item) => item.id === 'mirror0')
                  .display_value,
              ],
            }, // Account
            dup__of_account_name6: {
              labels: [
                _.find(columnData, (item) => item.id === 'mirror3')
                  .display_value,
              ],
            }, // Opportunity
            dup__of_account_name: {
              labels: [
                _.find(columnData, (item) => item.id === 'mirror81')
                  .display_value,
              ],
            }, // PID
            label_1: {
              label: _.find(columnData, (item) => item.id === 'dup__of_pid')
                .text,
            }, // Pod
            status59: {
              labels: [
                _.find(columnData, (item) => item.id === 'dropdown').text,
              ],
            }, // Team
            dup__of_pod: {
              label: _.find(columnData, (item) => item.id === 'dup__of_pod9')
                .text,
            }, // Shift
            label: {
              label: _.find(columnData, (item) => item.id === 'dup__of_pod')
                .text,
            }, // Task
            numbers1: _.find(
              columnData,
              (item) => item.id === 'men__desplegable'
            ).text, // Frequency
            status: _.find(columnData, (item) => item.id === 'status').text, // Client
            texto_largo: _.find(columnData, (item) => item.id === 'text').text,
            people0: {
              personsAndTeams: _.find(
                columnData,
                (item) => item.id === 'dup__of_cfm'
              ).value
                ? JSON.parse(
                    _.find(columnData, (item) => item.id === 'dup__of_cfm')
                      .value
                  ).personsAndTeams
                : null,
            }, // CS
            dup__of_cs: {
              personsAndTeams: _.find(
                columnData,
                (item) => item.id === 'person'
              ).value
                ? JSON.parse(
                    _.find(columnData, (item) => item.id === 'person').value
                  ).personsAndTeams
                : null,
            }, // CSM
            people: {
              personsAndTeams: _.find(
                columnData,
                (item) => item.id === 'dup__of_cs'
              ).value
                ? JSON.parse(
                    _.find(columnData, (item) => item.id === 'dup__of_cs').value
                  ).personsAndTeams
                : null,
            }, // AS
            date: start, // Start Time date
            date_1: end, // End Time
          },
        };
      })
      .then((res) => this.createPunch(res.name, res.cv))
      .then((res) => {
        // console.log('res',res);
        // If start next item was clicked, open the next item card. Otherwise reload
        if (nextItem)
          monday.execute('openItemCard', {
            kind: 'updates',
            itemId: this.state.nextItemId,
          });
        else this.loadData();
        return res.data.create_item.id;
      })
      .catch((err) => {
        console.log('Error:', err);
        monday.execute('notice', {
          message: 'Something happened. Timepunch was not saved.',
          type: 'error',
          timeout: 5000,
        });
        let dataObject = {
          itemid: itemId,
        };
        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataObject),
        };
        fetch(
          'https://hook.us1.make.celonis.com/9icnjujhc7vi4ce6ar9cbo9ryyqbib65',
          requestOptions
        ).then(() => this.loadData());
      });
  };

  getDates = async (startColumnId, endColumnId, itemId) => {
    // itemId = (this.state.currentTask && JSON.parse(this.state.currentTask).name === 'Idle') ? JSON.parse(this.state.currentTask).id : itemId
    return monday.api(
      `query { items(ids:${itemId}) { id column_values(ids:["${startColumnId}","${endColumnId}"]) { id value text } } }`
    );
  };

  setItemName = async (itemId) => {
    return monday
      .api(`query { items(ids:${itemId}) { name } }`)
      .then((res) => this.setState({ itemName: res.data.items[0].name }));
  };

  getNextItemId = async (boardId) => {
    monday
      .api(
        `query {
      boards (ids: ${this.state.boardId}) {
        items { id name }
      }
    }`,
        { apiVersion: '2023-07' }
      )
      .then((res) => {
        let index = _.findIndex(
          res.data.boards[0].items,
          (item) => item.id == this.state.itemId
        );
        let nextItem = res.data.boards[0].items[index + 1];
        this.setState({
          nextItemName: nextItem ? nextItem.name : '',
          nextItemId:
            index === res.data.boards[0].items.length - 1
              ? ''
              : res.data.boards[0].items[index + 1].id,
        });
      })
      .then(() => this.getNextItemIdNew()); // remove
  };

  getNextItemIdNew = async () => {
    const firstPage = await monday.api(
      `query {
      items_page_by_column_values (limit: 100, board_id: ${JSON.parse(
        this.state.boardId
      )}, columns: [{column_id: "dup__of_cfm", column_values: ["${
        this.state.userId
      }"]}]) {
        cursor
        items {
          id
          name
        }
      }
    }`,
      { apiVersion: '2023-10' }
    );
    var cursor = firstPage.data.items_page_by_column_values.cursor;
    let items = firstPage.data.items_page_by_column_values.items;

    while (cursor) {
      // loop will stop when cursor is null
      const nextPage = await monday.api(
        `query {
        next_items_page (cursor:"${cursor}", limit: 100) {
          cursor
          items {
            id
            name
          }
        }
      }`,
        { apiVersion: '2023-10' }
      );
      cursor = nextPage.data.next_items_page.cursor;
      items = _.flatten(_.union(items, nextPage.data.next_items_page.items));
    }
    // items = items[0];
    let index = _.findIndex(
      items,
      (item) => Number(item.id) === this.state.itemId
    );

    // curser is flattening

    let nextItem = items[index + 1];
    this.setState({
      nextLoaded: true,
      nextItemName: nextItem ? nextItem.name : '',
      nextItemId: index === items.length - 1 ? '' : items[index + 1].id,
    });
  };

  getIdleColumnNew = async () => {
    monday
      .api(
        `query {
      boards (ids: ${this.state.boardId}) {
        items_page (query_params: {rules: [{column_id: "name", compare_value: ["Idle"]}, {column_id: "dup__of_cfm", compare_value:["person-${this.state.userId}"], operator:any_of}]}) {
          cursor
          items {
            id
          }
        }
      }
    }`
      )
      .then((res) => {
        console.log('res', res);
        let idleItem = res.data.boards[0].items_page.items[0];
        if (!idleItem) {
          this.setState({ error: true });
        } else this.setState({ idleItemId: idleItem.id });
      });
  };

  timeStampSaved = async () => {
    monday.execute('notice', {
      message: 'Timestamp saved!',
      type: 'success',
      timeout: 2000,
    });
  };

  changeDateValue = async (columnId, itemId, nextItem) => {
    // Check whether a regular timepunch or idle time
    // console.log('columnid', columnId, this.state.start, itemId);
    this.setState(
      itemId === this.state.idleItemId
        ? { idleLoaded: false, isIdle: columnId === this.state.start }
        : { loaded: false }
    );
    // Get date in UTC
    let dateNow = new Date();
    let year = dateNow.getFullYear();
    let month = ('0' + (dateNow.getUTCMonth() + 1)).slice(-2);
    let day = ('0' + dateNow.getUTCDate()).slice(-2);
    let hours = ('0' + dateNow.getUTCHours()).slice(-2);
    let minutes = ('0' + dateNow.getUTCMinutes()).slice(-2);
    let seconds = ('0' + dateNow.getUTCSeconds()).slice(-2);

    // Construct date object
    let dateobject = {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}:${seconds}`,
    };

    // Set start/end column value
    monday
      .api(
        `mutation {
      change_column_value(item_id: ${itemId}, board_id: ${
          this.state.boardId
        }, column_id: "${columnId}", value: ${JSON.stringify(
          JSON.stringify(dateobject)
        )}) {
        id
        name
      }
    }`
      )

      .then((result) => {
        // If start is clicked
        if (columnId === this.state.start) {
          monday
            .api(
              `mutation {
          change_column_value(item_id: ${itemId}, board_id: ${this.state.boardId}, column_id: "${this.state.end}", value: "{}") {
            id
          }
        }`
            )
            .then((res) => {
              // console.log('End is set to {}', res)
              return monday.storage.instance.getItem(this.state.userId);
            })
            .then((storage) => {
              let currentTaskObj = JSON.parse(storage.data.value);
              // If Start is clicked and current task is empty
              if (_.isEmpty(currentTaskObj)) {
                // console.log('start is clicked and current task is empty')
                monday.storage.instance
                  .setItem(
                    this.state.userId,
                    JSON.stringify(result.data.change_column_value)
                  )
                  .then(() =>
                    this.setState({
                      currentTask: JSON.stringify(
                        result.data.change_column_value
                      ),
                    })
                  )
                  .then(() =>
                    this.loadData().then(() => {
                      this.timeStampSaved();
                    })
                  );
              }
              // If Start is clicked and another current task is being worked on
              else {
                // console.log('start is clicked and another task is being worked on')
                // console.log('setting current task', result.data.change_column_value);
                monday.storage.instance
                  .setItem(
                    this.state.userId,
                    JSON.stringify(result.data.change_column_value)
                  )
                  .then(() => {
                    monday
                      .api(
                        `mutation {
                change_column_value(item_id: ${currentTaskObj.id}, board_id: ${
                          this.state.boardId
                        }, column_id: "${
                          this.state.end
                        }", value: ${JSON.stringify(
                          JSON.stringify(dateobject)
                        )}) {
                  id
                }
              }`
                      )
                      .then((res) => {
                        // console.log('RES Start & another current',res);
                        this.getDates(
                          this.state.start,
                          this.state.end,
                          currentTaskObj.id
                        )
                          .then((data) => {
                            let dataObject = {
                              itemid: data.data.items[0].id,
                              first: {
                                id: data.data.items[0].column_values[0].id,
                                value: JSON.parse(
                                  data.data.items[0].column_values[0].value
                                ).date,
                                time: JSON.parse(
                                  data.data.items[0].column_values[0].value
                                ).time,
                                changed_at: JSON.parse(
                                  data.data.items[0].column_values[0].value
                                ).changed_at,
                              },
                              second: {
                                id: data.data.items[0].column_values[1].id,
                                value: JSON.parse(
                                  data.data.items[0].column_values[1].value
                                ).date,
                                time: JSON.parse(
                                  data.data.items[0].column_values[0].value
                                ).time,
                                changed_at: JSON.parse(
                                  data.data.items[0].column_values[1].value
                                ).changed_at,
                              },
                            };
                            return dataObject;
                          })
                          .then((dataObject) =>
                            this.getItemAndPunch(
                              currentTaskObj.id,
                              dataObject,
                              nextItem
                            )
                          );
                      });
                  });
              }
            });
          // Else, end is clicked
        } else {
          this.getDates(this.state.start, this.state.end, itemId).then(
            (data) => {
              // console.log('setting current to {}');
              this.setState({ currentTask: '{}' });
              monday.storage.instance.setItem(this.state.userId, '{}');
              let dataObject = {
                itemid: data.data.items[0].id,
                first: {
                  id: data.data.items[0].column_values[0].id,
                  value: JSON.parse(data.data.items[0].column_values[0].value)
                    .date,
                  time: JSON.parse(data.data.items[0].column_values[0].value)
                    .time,
                  changed_at: JSON.parse(
                    data.data.items[0].column_values[0].value
                  ).changed_at,
                },
                second: {
                  id: data.data.items[0].column_values[1].id,
                  value: JSON.parse(data.data.items[0].column_values[1].value)
                    .date,
                  time: JSON.parse(data.data.items[0].column_values[0].value)
                    .time,
                  changed_at: JSON.parse(
                    data.data.items[0].column_values[1].value
                  ).changed_at,
                },
              };
              this.getItemAndPunch(itemId, dataObject, nextItem)
                // .then(() => this.loadData()
                .then(() => {
                  this.timeStampSaved();
                });
            }
          );
        }
      })
      .catch((err) => {
        monday.execute('notice', {
          message: 'Something happened. Timepunch was not saved.',
          type: 'error',
          timeout: 5000,
        });
      });
  };

  render() {
    console.log('re-render');
    const {
      startTimestamp,
      endTimestamp,
      loaded,
      columnValues,
      userId,
      currentTask,
      idleLoaded,
      nextLoaded,
      isIdle,
      nextItemId,
      error,
      clock,
      itemName,
      nextItemName,
      theme,
      idleItemId,
      itemId,
      logger,
      version,
    } = this.state;
    return (
      <div
        className="App"
        style={{ color: theme === 'dark' ? '#D5D8DE' : '#0' }}
      >
        <div style={{ position: 'fixed', top: '10px', right: '10px' }}>
          Version: {version}
        </div>
        {logger && (
          <div style={{ position: 'fixed', top: '10px', left: '10px' }}>
            <p>
              User ID: {userId} <br />
              Current Task: {currentTask} <br />
              Idle: {JSON.stringify(isIdle)} <br />
              Loaded: {JSON.stringify(loaded)} <br />
              Timestamps:{' '}
              {`${JSON.stringify(startTimestamp)} and ${JSON.stringify(
                endTimestamp
              )}`}{' '}
              <br />
              Next Item ID: {nextItemId} <br />
              Error: {error}
            </p>
          </div>
        )}
        {idleLoaded && loaded && nextLoaded ? (
          <>
            {!error ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* <div>
            <h3>Active Task: {JSON.parse(currentTask) && JSON.parse(currentTask).name ? JSON.parse(currentTask).name : 'No active task'}</h3>
          </div> */}
                {
                  <AttentionBox
                    className="monday-style-attention-box_box"
                    text={`CST Time: ${clock}`}
                    title={
                      JSON.parse(currentTask) && JSON.parse(currentTask).name
                        ? `Active task: ${JSON.parse(currentTask).name}`
                        : 'No active task'
                    }
                  />
                }
                {(!startTimestamp ||
                  isIdle ||
                  (!!startTimestamp && !!endTimestamp)) &&
                  itemName !== 'Idle' &&
                  !isIdle && (
                    <>
                      <div style={{ padding: '10px ' }}>
                        <Button
                          style={{ backgroundColor: '#FD500B' }}
                          size={Button.sizes.LARGE}
                          loading={!loaded}
                          onClick={() =>
                            this.changeDateValue(
                              this.state.start,
                              this.state.itemId
                            )
                          }
                        >
                          Start Task: {itemName}
                        </Button>
                      </div>
                    </>
                  )}
                {(!startTimestamp && !endTimestamp) ||
                  (!!startTimestamp && !endTimestamp && !isIdle && (
                    <>
                      <div style={{ padding: '10px ' }}>
                        <Button
                          style={{ backgroundColor: '#ED2929' }}
                          size={Button.sizes.LARGE}
                          loading={!loaded}
                          onClick={() =>
                            this.changeDateValue(
                              this.state.end,
                              this.state.itemId
                            )
                          }
                        >
                          End Task
                        </Button>
                      </div>
                    </>
                  ))}
                {(startTimestamp ||
                  isIdle ||
                  (!!startTimestamp && !!endTimestamp)) &&
                  nextItemId &&
                  idleItemId != itemId &&
                  JSON.parse(currentTask) &&
                  JSON.parse(currentTask).name &&
                  !isIdle && (
                    <div style={{ padding: '10px ' }}>
                      <Button
                        style={{ backgroundColor: '#FD500B' }}
                        size={Button.sizes.LARGE}
                        disabled={!nextItemId}
                        loading={!loaded}
                        onClick={() => {
                          this.changeDateValue(
                            this.state.start,
                            this.state.nextItemId,
                            true,
                            this.state.itemId
                          );
                        }}
                      >
                        Start Next Task: {nextItemName}
                      </Button>
                    </div>
                  )}
                <div>
                  {(!startTimestamp ||
                    (!!startTimestamp && !!endTimestamp) ||
                    (!!startTimestamp && !endTimestamp && !isIdle)) &&
                  !isIdle ? (
                    <div style={{ padding: '10px ' }}>
                      <Button
                        style={{ backgroundColor: '#FD8D60' }}
                        size={Button.sizes.LARGE}
                        loading={!idleLoaded}
                        onClick={() => {
                          this.changeDateValue(
                            this.state.start,
                            this.state.idleItemId
                          );
                        }}
                      >
                        Start Idle Time
                      </Button>
                    </div>
                  ) : (
                    <div style={{ padding: '10px ' }}>
                      <Button
                        style={{ backgroundColor: '#ED2929' }}
                        size={Button.sizes.LARGE}
                        loading={!idleLoaded}
                        onClick={() => {
                          this.changeDateValue(
                            this.state.end,
                            this.state.idleItemId
                          );
                        }}
                      >
                        End Idle Time
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ width: '80%' }}>
                <AttentionBox
                  title="Configuration Error"
                  text="Make sure you have an 'Idle' item on the top of your board, a 'Start' & 'End' date columns selected in the app settings. Then refresh."
                  type={AttentionBox.types.DANGER}
                  className="monday-style-attention-box_box"
                />
              </div>
            )}
          </>
        ) : (
          <div>
            <div style={{ width: '24px', height: '24px', margin: 'auto' }}>
              <Loader size={16} />
            </div>
            <div style={{ color: 'red', fontSize: 'x-large' }}>
              Do not close this window!
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;
