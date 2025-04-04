/* eslint-disable @typescript-eslint/no-explicit-any */
export type MondayError = {
  message: string
  locations: {
    line: number
    column: number
  }[]
  path: string[]
  extensions: {
    code: string
    error_data: object
    status_code: number
  }
}

export type MondayResponse = {
  data: {
    [key: string]: any 
  }
  errors: MondayError[]
  account_id: string
}

export type MondatColumnValue = {
  id: string
  type: string
  value: string
  [key: string]: string
} & { 
  column: {
    id: string
    title: string
  } 
}

export type MondayItem = {
  id: string
  name: string
}

export type MondayRequestItems = {
  items_page_by_column_values: {
    cursor: string
    items: MondayItem[]
  }
}


export type MondayContext = {
  theme: string
  account: {
    id: string
  }
  user: {
    id: string
    isAdmin: boolean
    isGuest: boolean
    isViewOnly: boolean
    countryCode: string
    currentLanguage: string
    timeFormat: string
    timeZoneOffset: number
  }
  region: string
  productKind: string
  app: {
    id: number
    clientId: string
  }
  appVersion: {
    id: number
    name: string
    status: string
    type: string
    versionData: {
      major: number
      minor: number
      patch: number
      type: string
    }
  }
  workspaceId: number
  boardId: number
  boardIds: number[]
  itemId: number
  instanceId: number
  instanceType: string
}

export type Task = {
  id?: string
  name?: string
}


export type AppState = {
  // Coming from the monday.settings
  start: string; // Start Time column ID
  end: string; // End Time column ID
  logger: boolean; // Turn on/off the logger

  // Loading indicators
  loaded: boolean; // Data was loaded
  idleLoaded: boolean; // Idle task was loaded
  nextLoaded: boolean; // Next task was loaded

  // Error indicator
  error: boolean;
  errorMessage: string; // Error message in case it exists

  // Static data that should not change during the work
  userId: string; // Current user ID
  boardId: string; // Current board ID
  idleItemId: string; // Idle task ID
  userPunchesBoardID: string; // Punch board ID
  version: string; // Version of the application
  theme: string; // Theme

  // Other dynamic data
  currentTask: Task; // Current/Last active task from monday.storage
  itemId: string; // Current (opened) item ID
  itemName: string; // Current (opened) item name
  startTimestamp: string | null;
  endTimestamp: string | null;
  columnValues: MondatColumnValue[];
  isIdle: boolean; // Shows if Idle task is active
  nextItemName: string; // Next task name
  nextItemId: string; // Next task ID
}