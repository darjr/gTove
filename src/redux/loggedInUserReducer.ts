import {Action, AnyAction} from 'redux';

import {DriveUser} from '../util/googleDriveUtils';

// =========================== Action types and generators

export enum LoggedInUserActionTypes {
    SET_LOGGED_IN_USER = 'set-logged-in-user'
}

export type LoggedInUserReducerType = DriveUser | null;

interface SetLoggedInUserActionType extends Action {
    type: LoggedInUserActionTypes.SET_LOGGED_IN_USER;
    user: LoggedInUserReducerType;
}

export function setLoggedInUserAction(user: LoggedInUserReducerType): SetLoggedInUserActionType {
    return {type: LoggedInUserActionTypes.SET_LOGGED_IN_USER, user};
}

// =========================== Reducers

function loggedInUserReducer(state: LoggedInUserReducerType = null, action: SetLoggedInUserActionType) {
    switch (action.type) {
        case LoggedInUserActionTypes.SET_LOGGED_IN_USER:
            // Ignore this action if it doesn't originate locally
            return ((action as AnyAction).fromPeerId) ? state : action.user;
        default:
            return state;
    }
}

export default loggedInUserReducer;
