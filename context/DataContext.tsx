import React, { createContext, useReducer, ReactNode } from 'react';
import { 
    Event, CricketTeam, Player, ParticipantTeam, ReplacementRequest, 
    Announcement, ChatMessage, User, SiteSettings, CnflHistory
} from '../types';
import { MOCK_DATA } from './context/mockData.ts';

interface AppState {
  users: User[];
  events: Event[];
  teams: CricketTeam[];
  players: Player[];
  participantTeams: ParticipantTeam[];
  replacementRequests: ReplacementRequest[];
  announcements: Announcement[];
  chatMessages: ChatMessage[];
  cnflHistory: CnflHistory[];
  siteSettings: SiteSettings;
}

type Action =
  | { type: 'CREATE_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_TEAM'; payload: CricketTeam }
  | { type: 'UPDATE_TEAM'; payload: CricketTeam }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'ADD_BULK_PLAYERS'; payload: Player[] }
  | { type: 'UPDATE_PLAYER'; payload: Player }
  | { type: 'DELETE_PLAYER'; payload: string }
  | { type: 'UPDATE_PLAYER_POINTS'; payload: { playerId: string; points: number[] } }
  | { type: 'UPDATE_REPLACEMENT_REQUEST'; payload: ReplacementRequest }
  | { type: 'ADD_REPLACEMENT_REQUEST'; payload: ReplacementRequest }
  | { type: 'ADD_ANNOUNCEMENT'; payload: Announcement }
  | { type: 'DELETE_ANNOUNCEMENT'; payload: string }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_SITE_SETTINGS'; payload: SiteSettings }
  | { type: 'ADD_HISTORY'; payload: CnflHistory }
  | { type: 'UPDATE_HISTORY'; payload: CnflHistory }
  | { type: 'DELETE_HISTORY'; payload: string }
  | { type: 'ADD_PARTICIPANT_TEAM'; payload: ParticipantTeam }
  | { type: 'UPDATE_PARTICIPANT_TEAM'; payload: ParticipantTeam }
  | { type: 'ADD_USER', payload: User }
  | { type: 'UPDATE_USER', payload: User };

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'CREATE_EVENT': return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT': return { ...state, events: state.events.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EVENT': return { ...state, events: state.events.filter(e => e.id !== action.payload) };
    case 'ADD_TEAM': return { ...state, teams: [...state.teams, action.payload] };
    case 'UPDATE_TEAM': return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TEAM': return { ...state, teams: state.teams.filter(t => t.id !== action.payload) };
    case 'ADD_PLAYER': return { ...state, players: [...state.players, action.payload] };
    case 'ADD_BULK_PLAYERS': return { ...state, players: [...state.players, ...action.payload] };
    case 'UPDATE_PLAYER': return { ...state, players: state.players.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PLAYER': return { ...state, players: state.players.filter(p => p.id !== action.payload) };
    case 'UPDATE_PLAYER_POINTS': return { ...state, players: state.players.map(p => p.id === action.payload.playerId ? { ...p, points: action.payload.points } : p) };
    case 'UPDATE_REPLACEMENT_REQUEST': return { ...state, replacementRequests: state.replacementRequests.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'ADD_REPLACEMENT_REQUEST': return { ...state, replacementRequests: [action.payload, ...state.replacementRequests] };
    case 'ADD_ANNOUNCEMENT': return { ...state, announcements: [action.payload, ...state.announcements] };
    case 'DELETE_ANNOUNCEMENT': return { ...state, announcements: state.announcements.filter(a => a.id !== action.payload) };
    case 'ADD_CHAT_MESSAGE': return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'UPDATE_SITE_SETTINGS': return { ...state, siteSettings: { ...state.siteSettings, ...action.payload } };
    case 'ADD_HISTORY': return { ...state, cnflHistory: [...state.cnflHistory, action.payload].sort((a,b) => parseInt(a.seasonNumber) - parseInt(b.seasonNumber)) };
    case 'UPDATE_HISTORY': return { ...state, cnflHistory: state.cnflHistory.map(h => h.id === action.payload.id ? action.payload : h).sort((a,b) => parseInt(a.seasonNumber) - parseInt(b.seasonNumber)) };
    case 'DELETE_HISTORY': return { ...state, cnflHistory: state.cnflHistory.filter(h => h.id !== action.payload) };
    case 'ADD_PARTICIPANT_TEAM': return { ...state, participantTeams: [...state.participantTeams, action.payload] };
    case 'UPDATE_PARTICIPANT_TEAM': return { ...state, participantTeams: state.participantTeams.map(pt => pt.id === action.payload.id ? action.payload : pt) };
    case 'ADD_USER': return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER': return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    default: return state;
  }
};

interface DataContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, MOCK_DATA);

  return (
    <DataContext.Provider value={{ state, dispatch }}>
      {children}
    </DataContext.Provider>
  );
};
