import React, { createContext, useContext, useReducer } from 'react'

const AppContext = createContext(null)
const AppDispatchContext = createContext(null)

const initialState = {
  rootPath: null,
  tree: [],
  currentFile: null,
  content: '',
  savedContent: '',
  isDirty: false,
  refreshSignal: 0
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_ROOT': {
      return {
        ...initialState,
        rootPath: action.rootPath,
        tree: action.tree
      }
    }
    case 'UPDATE_TREE': {
      return { ...state, tree: action.tree }
    }
    case 'OPEN_FILE': {
      return {
        ...state,
        currentFile: action.filePath,
        content: action.content,
        savedContent: action.content,
        isDirty: false
      }
    }
    case 'UPDATE_CONTENT': {
      return {
        ...state,
        content: action.content,
        isDirty: action.content !== state.savedContent
      }
    }
    case 'SAVE_FILE': {
      return {
        ...state,
        savedContent: state.content,
        isDirty: false
      }
    }
    case 'REFRESH_TREE': {
      return {
        ...state,
        tree: action.tree,
        refreshSignal: state.refreshSignal + 1
      }
    }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  )
}

export function useAppState() {
  return useContext(AppContext)
}

export function useAppDispatch() {
  return useContext(AppDispatchContext)
}
