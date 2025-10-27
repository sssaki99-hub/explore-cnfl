import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { Event, Player, PlayerCategory, PlayerType, ParticipantTeam, ParticipantTeamPlayer, ReplacementRequest, UserRole } from '../types';
import { 
    CreateTeamIcon, ViewTeamIcon, ReplacementIcon, MessageIcon, 
    AnnouncementIcon, HistoryIcon, HomeIcon, LeaderboardIcon, ChevronDownIcon
} from '../components/icons';

type ParticipantView = 'dashboard' | 'createTeam' | 'viewMyXI' | 'replacePlayer' | 'chatBox' | 'notifications' | 'replacementHistory' | 'viewAllTeams';
type EventStatus = 'UPCOMING' | 'RUNNING' | 'FINISHED' | 'NO_EVENT';

const ParticipantDashboard: React.FC = () => {
    const { user } = useAuth();
    const { state } = useData();
    const now = new Date();

    // FIX: Explicitly type the return value of useMemo to ensure type safety for `eventStatus`.
    // This resolves errors where 'string' was not assignable to 'EventStatus'.
    const { activeEvent, participantTeam, eventStatus } = useMemo<{
        activeEvent?: Event;
        participantTeam?: ParticipantTeam;
        eventStatus: EventStatus;
    }>(() => {
        if (!user) return { eventStatus: 'NO_EVENT' };

        const myTeams = state.participantTeams.filter(pt => pt.participantId === user.id);
        const myEvents = myTeams.map(team => state.events.find(e => e.id === team.eventId)).filter(Boolean) as Event[];
        
        // Priority 1: A running event they are part of
        const runningEvent = myEvents.find(e => now > new Date(e.registrationDeadline) && now < new Date(e.tournamentEndTime));
        if (runningEvent) {
            return {
                activeEvent: runningEvent,
                participantTeam: myTeams.find(t => t.eventId === runningEvent.id),
                eventStatus: 'RUNNING'
            };
        }
        
        // Priority 2: An upcoming event they have registered for
        const upcomingRegisteredEvent = myEvents.find(e => now < new Date(e.registrationDeadline));
        if (upcomingRegisteredEvent) {
             return {
                activeEvent: upcomingRegisteredEvent,
                participantTeam: myTeams.find(t => t.eventId === upcomingRegisteredEvent.id),
                eventStatus: 'UPCOMING'
            };
        }

        // Priority 3: The most recently finished event they were part of
        const latestFinishedEvent = myEvents
            .filter(e => now > new Date(e.tournamentEndTime))
            .sort((a,b) => new Date(b.tournamentEndTime).getTime() - new Date(a.tournamentEndTime).getTime())[0];
        
        if (latestFinishedEvent) {
            return {
                activeEvent: latestFinishedEvent,
                participantTeam: myTeams.find(t => t.eventId === latestFinishedEvent.id),
                eventStatus: 'FINISHED'
            };
        }
        
        // Priority 4: An upcoming event they can still register for
        const openRegistrationEvent = state.events.find(event => now < new Date(event.registrationDeadline));
        if (openRegistrationEvent) {
            return {
                activeEvent: openRegistrationEvent,
                participantTeam: undefined,
                eventStatus: 'UPCOMING'
            }
        }

        return { eventStatus: 'NO_EVENT' };
    }, [user, state.events, state.participantTeams, now]);


    const getInitialView = (): ParticipantView => {
        if (participantTeam) return 'viewMyXI';
        return 'dashboard';
    };
    
    const [activeView, setActiveView] = useState<ParticipantView>(getInitialView());
    
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
        { id: 'viewMyXI', label: 'View My XI', icon: <ViewTeamIcon />, disabled: !participantTeam },
        { id: 'viewAllTeams', label: 'Leaderboard', icon: <LeaderboardIcon />, disabled: !participantTeam || (eventStatus !== 'FINISHED' && !state.siteSettings.showParticipantTeams) },
        { id: 'replacePlayer', label: 'Replace Player', icon: <ReplacementIcon />, disabled: eventStatus !== 'RUNNING' || participantTeam?.replacementsLeft === 0 },
        { id: 'chatBox', label: 'Chat with Admin', icon: <MessageIcon /> },
        { id: 'notifications', label: 'Notifications', icon: <AnnouncementIcon /> },
        { id: 'replacementHistory', label: 'Replacement History', icon: <HistoryIcon />, disabled: !participantTeam },
    ];
    
    const renderContent = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView setActiveView={setActiveView} event={activeEvent} team={participantTeam} status={eventStatus} />;
            case 'createTeam': return <CreateTeamView setActiveView={setActiveView} />;
            case 'viewMyXI': return <ViewMyXIView setActiveView={setActiveView} event={activeEvent} team={participantTeam} status={eventStatus} />;
            case 'viewAllTeams': return <ViewAllTeamsView />;
            case 'replacePlayer': return <ReplacePlayerView setActiveView={setActiveView} />;
            case 'chatBox': return <ChatBoxView />;
            case 'notifications': return <NotificationsView />;
            case 'replacementHistory': return <ReplacementHistoryView />;
            default: return <DashboardView setActiveView={setActiveView} event={activeEvent} team={participantTeam} status={eventStatus} />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-white">
            <aside className="w-full md:w-64 bg-gray-800 p-4 space-y-2 flex-shrink-0">
                 <h2 className="text-xl font-bold text-green-400 mb-4">Welcome, {user?.fullName}</h2>
                 {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as ParticipantView)}
                        disabled={item.disabled}
                        className={`w-full flex items-center space-x-3 p-2 rounded-md text-left transition-colors ${activeView === item.id ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </aside>
             <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

interface DashboardViewProps {
    setActiveView: (view: ParticipantView) => void;
    event?: Event;
    team?: ParticipantTeam;
    status: EventStatus;
}

const DashboardView: React.FC<DashboardViewProps> = ({ setActiveView, event, team, status }) => {
    if (status === 'NO_EVENT') {
        return <div className="text-center p-8 bg-gray-800 rounded-lg"><h2 className="text-2xl font-bold">No Active Event</h2><p>Please wait for the admin to create a new event.</p></div>
    }

    if (team) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold">Welcome Back!</h2>
                <p className="mt-2 text-gray-300">You have already created a team for the event: {event?.name}.</p>
                <button onClick={() => setActiveView('viewMyXI')} className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">
                    View My XI
                </button>
            </div>
        )
    }

    if (status === 'UPCOMING' && event) {
         return (
            <div className="bg-gray-800 p-8 rounded-lg">
                <h2 className="text-3xl font-bold mb-4 text-green-400">{event.name}</h2>
                <p className="mb-6 text-gray-300">{event.description}</p>
                <button onClick={() => setActiveView('createTeam')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg animate-pulse">
                    Create Your Team Now!
                </button>
            </div>
        )
    }

    return (
        <div className="text-center p-8 bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-bold">Registration Closed</h2>
            <p>The registration period for the current event has ended. Please check back for future events.</p>
        </div>
    )
}

const CreateTeamView: React.FC<{ setActiveView: (view: ParticipantView) => void }> = ({ setActiveView }) => {
    const { state, dispatch } = useData();
    const { user } = useAuth();
    const activeEvent = state.events.find(event => new Date(event.registrationDeadline) >= new Date());
    
    const [teamName, setTeamName] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<(ParticipantTeamPlayer | null)[]>(Array(11).fill(null));
    const [error, setError] = useState('');

    const playerDetails = useMemo(() => {
        return selectedPlayers.map(p => {
            if (!p) return null;
            return state.players.find(player => player.id === p.playerId);
        });
    }, [selectedPlayers, state.players]);

    const validationStatus = useMemo(() => {
        if (!activeEvent) return {};
        const finalPlayers = selectedPlayers.filter(p => p !== null) as ParticipantTeamPlayer[];
        const details = playerDetails.filter(Boolean) as Player[];

        const vipCount = finalPlayers.filter(p => p.isVip).length;
        const teamCounts = details.reduce((acc, p) => { acc[p.teamId] = (acc[p.teamId] || 0) + 1; return acc; }, {} as {[key: string]: number});
        const maxFromTeam = Math.max(0, ...Object.values(teamCounts));
        const wkCount = details.filter(p => p.category === PlayerCategory.WICKETKEEPER).length;
        const bowlerCount = details.filter(p => p.category === PlayerCategory.BOWLER).length;
        const bowlCapableCount = details.filter(p => p.category === PlayerCategory.BOWLER || p.category === PlayerCategory.ALL_ROUNDER).length;
        const foreignPlayerCount = details.filter(p => p.playerType === PlayerType.FOREIGN).length;
        
        const isDomestic = activeEvent.leagueType === 'domestic';

        return {
            players: { valid: finalPlayers.length === 11, count: finalPlayers.length, needed: 11 },
            vips: { valid: vipCount <= activeEvent.maxVipPlayers, count: vipCount, max: activeEvent.maxVipPlayers },
            team: { valid: maxFromTeam <= activeEvent.maxPlayersFromSingleTeam, count: maxFromTeam, max: activeEvent.maxPlayersFromSingleTeam },
            wk: { valid: wkCount >= 1, count: wkCount, needed: 1 },
            bow: { valid: bowlerCount >= 2, count: bowlerCount, needed: 2 },
            bowlCapable: { valid: bowlCapableCount >= 5, count: bowlCapableCount, needed: 5 },
            foreign: { valid: !isDomestic || foreignPlayerCount <= (activeEvent.maxForeignPlayers ?? 99), count: foreignPlayerCount, max: activeEvent.maxForeignPlayers, isDomestic }
        };
    }, [selectedPlayers, playerDetails, activeEvent]);

    if (!activeEvent || !user) return <div>Loading...</div>;

    const allPlayersInEvent = useMemo(() => state.players.filter(p => p.eventId === activeEvent.id), [state.players, activeEvent.id]);

    const handlePlayerSelect = (playerId: string, index: number) => {
        const newSelection = [...selectedPlayers];
        newSelection[index] = {playerId, isVip: newSelection[index]?.isVip || false};
        setSelectedPlayers(newSelection);
    }
    
    const toggleVip = (index: number) => {
        const newSelection = [...selectedPlayers];
        if(newSelection[index]) {
            newSelection[index]!.isVip = !newSelection[index]!.isVip;
            setSelectedPlayers(newSelection);
        }
    }
    
    const handleSubmit = () => {
        setError('');
        if (!teamName.trim()) { setError('Team name is required.'); return; }
        if (!validationStatus.players.valid) { setError('You must select exactly 11 players.'); return; }
        if (!validationStatus.vips.valid) { setError(`You can select a maximum of ${activeEvent.maxVipPlayers} VIP players.`); return; }
        if (!validationStatus.team.valid) { setError(`You can select a maximum of ${activeEvent.maxPlayersFromSingleTeam} players from a single real-life team.`); return; }
        if (validationStatus.foreign.isDomestic && !validationStatus.foreign.valid) { setError(`You can select a maximum of ${activeEvent.maxForeignPlayers} foreign players.`); return; }
        if (!validationStatus.wk.valid) { setError('You must have at least one Wicketkeeper.'); return; }
        if (!validationStatus.bow.valid) { setError('You must have at least two dedicated Bowlers.'); return; }
        if (!validationStatus.bowlCapable.valid) { setError('You must have at least 5 players who can bowl (Bowlers or All-rounders).'); return; }

        const finalPlayers = selectedPlayers.filter(p => p !== null) as ParticipantTeamPlayer[];

        const newTeam: ParticipantTeam = {
            id: `pteam-${Date.now()}`,
            participantId: user.id, participantName: user.fullName, teamName, eventId: activeEvent.id,
            players: finalPlayers, replacementsLeft: activeEvent.maxReplacements, archivedPoints: 0, joinHistory: {}
        };
        dispatch({ type: 'ADD_PARTICIPANT_TEAM', payload: newTeam });
        alert('Team created successfully!');
        setActiveView('viewMyXI');
    };

    const teamSlots = [
        { label: 'Batsman', cats: [PlayerCategory.BATSMAN]}, { label: 'Batsman', cats: [PlayerCategory.BATSMAN]},
        { label: 'Wicketkeeper', cats: [PlayerCategory.WICKETKEEPER]}, { label: 'Any Player', cats: Object.values(PlayerCategory)},
        { label: 'All-rounder', cats: [PlayerCategory.ALL_ROUNDER]}, { label: 'Any Player', cats: Object.values(PlayerCategory)},
        { label: 'Any Player', cats: Object.values(PlayerCategory)}, { label: 'All-rounder/Bowler', cats: [PlayerCategory.ALL_ROUNDER, PlayerCategory.BOWLER]},
        { label: 'All-rounder/Bowler', cats: [PlayerCategory.ALL_ROUNDER, PlayerCategory.BOWLER]}, { label: 'Bowler', cats: [PlayerCategory.BOWLER]},
        { label: 'Bowler', cats: [PlayerCategory.BOWLER]},
    ];
    
    const getAvailablePlayersForSlot = (slotCats: PlayerCategory[], index: number) => {
        const selectedIds = selectedPlayers.map(p => p?.playerId).filter(Boolean);
        const currentPlayerId = selectedPlayers[index]?.playerId;
        return allPlayersInEvent
            .filter(p => slotCats.includes(p.category) && (!selectedIds.includes(p.id) || p.id === currentPlayerId))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const ValidationItem: React.FC<{label: string, status: {valid: boolean, count: number, needed?: number, max?: number} }> = ({label, status}) => (
        <li className={`flex justify-between items-center text-sm ${status.valid ? 'text-green-400' : 'text-red-400'}`}>
            <span>{label}</span>
            <span className="font-mono">{status.needed ? `${status.count}/${status.needed}` : `${status.count}/${status.max}`}</span>
        </li>
    );

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-2/3 bg-gray-800 p-8 rounded-lg">
                <h2 className="text-2xl font-bold mb-6 text-green-400">Create Your Team for {activeEvent.name}</h2>
                <input type="text" placeholder="Your Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-gray-700 p-2 rounded mb-4" />
                
                <div className="space-y-2">
                    {teamSlots.map((slot, i) => (
                        <div key={i} className="flex items-center space-x-2 bg-gray-700 p-2 rounded">
                            <span className="w-1/4 text-gray-400">{i+1}. {slot.label}</span>
                            <select onChange={(e) => handlePlayerSelect(e.target.value, i)} className="w-1/2 bg-gray-900 p-2 rounded" value={selectedPlayers[i]?.playerId || ""}>
                                <option value="" disabled>Select Player</option>
                                {getAvailablePlayersForSlot(slot.cats, i).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.teamName})</option>
                                ))}
                            </select>
                             <button onClick={() => toggleVip(i)} disabled={!selectedPlayers[i]?.playerId} className={`px-3 py-1 rounded text-sm ${selectedPlayers[i]?.isVip ? 'bg-yellow-500 text-black' : 'bg-gray-600'} disabled:opacity-50`}>
                                VIP
                            </button>
                        </div>
                    ))}
                </div>
                
                {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md mt-4">{error}</p>}
                <div className="mt-6 flex items-center gap-4">
                     <input type="checkbox" id="terms" required />
                     <label htmlFor="terms" className="text-sm text-gray-400">I agree that this is for fun and no money or betting is involved.</label>
                </div>
                <div className="mt-6">
                     <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">Submit Team</button>
                </div>
            </div>
            <div className="w-full md:w-1/3 bg-gray-800 p-6 rounded-lg self-start">
                <h3 className="text-lg font-bold text-green-400 border-b border-gray-700 pb-2 mb-4">Team Summary</h3>
                <ul className="space-y-2 mb-4">
                    {validationStatus.players && <ValidationItem label="Players Selected" status={validationStatus.players} />}
                    {validationStatus.wk && <ValidationItem label="Wicketkeepers" status={validationStatus.wk} />}
                    {validationStatus.bow && <ValidationItem label="Bowlers" status={validationStatus.bow} />}
                    {validationStatus.bowlCapable && <ValidationItem label="Bowl Capable" status={validationStatus.bowlCapable} />}
                    {validationStatus.vips && <ValidationItem label="VIP Players" status={validationStatus.vips} />}
                    {validationStatus.team && <ValidationItem label="Max from one team" status={validationStatus.team} />}
                    {validationStatus.foreign.isDomestic && <ValidationItem label="Foreign Players" status={validationStatus.foreign} />}
                </ul>
                 <h4 className="text-md font-semibold text-green-400 mt-4">Your XI</h4>
                 <ul className="text-sm space-y-1 mt-2">
                    {playerDetails.map((p, i) => (
                        p ? <li key={i} className="truncate">{i+1}. {p.name} {selectedPlayers[i]?.isVip && <span className="text-yellow-400">(VIP)</span>}</li> : <li key={i} className="text-gray-500">{i+1}. Slot empty</li>
                    ))}
                 </ul>
            </div>
        </div>
    );
};

interface ViewMyXIViewProps {
    setActiveView: (view: ParticipantView) => void;
    event?: Event;
    team?: ParticipantTeam;
    status: EventStatus;
}


const ViewMyXIView: React.FC<ViewMyXIViewProps> = ({setActiveView, team, status}) => {
    const { state } = useData();

    if (!team) return <div>You have not created a team yet.</div>;
    
    const getPlayerDetails = (playerId: string) => state.players.find(p => p.id === playerId);

    const getParticipantTotalPoints = useCallback((participantTeam: ParticipantTeam) => {
        const currentPlayersPoints = participantTeam.players.reduce((total, p) => {
            const player = state.players.find(playerData => playerData.id === p.playerId);
            if (!player) return total;
            
            const totalPlayerPoints = player.points.reduce((sum, current) => sum + (current || 0), 0);
            const pointsAtJoining = participantTeam.joinHistory?.[p.playerId] || 0;
            const pointsSinceJoining = totalPlayerPoints - pointsAtJoining;
            
            return total + (p.isVip ? pointsSinceJoining * 2 : pointsSinceJoining);
        }, 0);
        return (participantTeam.archivedPoints || 0) + currentPlayersPoints;
    }, [state.players]);

    const { totalPoints, rank } = useMemo(() => {
        if (!team) return { totalPoints: 0, rank: 'N/A' };
        
        const leaderboardData = state.participantTeams
            .map(pt => ({
                id: pt.id,
                totalPoints: getParticipantTotalPoints(pt),
            }))
            .sort((a, b) => b.totalPoints - a.totalPoints);
            
        const myRank = leaderboardData.findIndex(item => item.id === team.id) + 1;

        return {
            totalPoints: leaderboardData.find(item => item.id === team.id)?.totalPoints || 0,
            rank: myRank > 0 ? myRank : 'N/A'
        };
    }, [team, state.participantTeams, getParticipantTotalPoints]);


    return (
        <div className="bg-gray-800 p-8 rounded-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-green-400">
                    {team.teamName}
                    {status === 'FINISHED' && <span className="ml-4 text-sm font-normal text-yellow-400">(Event Finished)</span>}
                    {status === 'UPCOMING' && <span className="ml-4 text-sm font-normal text-blue-400">(Event Upcoming)</span>}
                </h2>
                {status === 'RUNNING' && team.replacementsLeft > 0 && <button onClick={() => setActiveView('replacePlayer')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Request Replacement</button>}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-center">
                <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Your Rank</p>
                    <p className="text-2xl font-bold text-yellow-400">#{rank}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Total Points</p>
                    <p className="text-2xl font-bold">{totalPoints}</p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Replacements Left</p>
                    <p className="text-2xl font-bold">{team.replacementsLeft}</p>
                </div>
                 <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Archived Points</p>
                    <p className="text-2xl font-bold">{team.archivedPoints || 0}</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                     <thead>
                        <tr className="bg-gray-700">
                            <th className="p-3">Player Name</th><th className="p-3">Category</th>
                            <th className="p-3">Team</th><th className="p-3">Points</th><th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team.players.map(({playerId, isVip}) => {
                            const player = getPlayerDetails(playerId);
                            if (!player) return null;
                            const individualPoints = player.points.reduce((a, b) => a + (b || 0), 0);
                            return (
                                <tr key={playerId} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3">{player.name}</td><td className="p-3">{player.category}</td>
                                    <td className="p-3">{player.teamName}</td>
                                    <td className="p-3 font-mono">{isVip ? `${individualPoints} x 2 = ${individualPoints*2}` : individualPoints}</td>
                                    <td className="p-3">{isVip && <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">VIP</span>}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ViewAllTeamsView: React.FC = () => {
    const { state } = useData();
    const { user } = useAuth();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const activeEvent = state.events.find(event => new Date(event.registrationDeadline) >= new Date());
    if (!activeEvent) return <div>No active event.</div>;
    
    const participantTeams = state.participantTeams.filter(pt => pt.eventId === activeEvent.id);
    const getPlayerName = (id: string) => state.players.find(p => p.id === id)?.name || 'Unknown Player';

    if (!state.siteSettings.showParticipantTeams) {
        return (
            <div className="bg-gray-800 p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4 text-yellow-400">Feature Disabled</h2>
                <p>The admin has currently disabled viewing other participants' teams.</p>
            </div>
        )
    }

    return (
         <div className="bg-gray-800 p-8 rounded-lg">
             <h2 className="text-2xl font-bold mb-6 text-green-400">All Participant Teams</h2>
             <div className="space-y-4">
                 {participantTeams.map(pt => (
                     <div key={pt.id} className="bg-gray-700 rounded-lg">
                         <button onClick={() => setExpandedId(expandedId === pt.id ? null : pt.id)} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-600/50">
                             <div>
                                <p className={`font-bold ${pt.participantId === user?.id ? 'text-yellow-400' : ''}`}>{pt.participantName} - <span className="text-green-400">{pt.teamName}</span></p>
                             </div>
                             <ChevronDownIcon />
                         </button>
                         {expandedId === pt.id && (
                             <div className="p-4 border-t border-gray-600">
                                <h4 className="font-semibold mt-2">Selected XI:</h4>
                                <ul className="list-disc list-inside columns-2 text-sm">
                                    {pt.players.map(p => (
                                        <li key={p.playerId}>{getPlayerName(p.playerId)} {p.isVip && <span className="text-yellow-400 font-bold">(VIP)</span>}</li>
                                    ))}
                                </ul>
                             </div>
                         )}
                     </div>
                 ))}
             </div>
         </div>
    );
};

const ReplacePlayerView: React.FC<{setActiveView: (view: ParticipantView) => void}> = ({ setActiveView }) => {
    const { state, dispatch } = useData();
    const { user } = useAuth();
    const myTeam = state.participantTeams.find(pt => pt.participantId === user?.id)!;
    const activeEvent = state.events.find(e => e.id === myTeam.eventId)!;
    const allPlayersInEvent = state.players.filter(p => p.eventId === activeEvent.id);

    const [currentPlayaerId, setCurrentPlayerId] = useState('');
    const [newPlayerId, setNewPlayerId] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    const currentTeamPlayerIds = myTeam.players.map(p => p.playerId);
    const availablePlayers = allPlayersInEvent.filter(p => !currentTeamPlayerIds.includes(p.id));

    const handleSubmit = () => {
        setError('');
        if (!currentPlayaerId || !newPlayerId) { setError("You must select a current and a new player."); return; }
        
        let potentialTeam = myTeam.players.map(p => p.playerId === currentPlayaerId ? {playerId: newPlayerId, isVip: false} : p);
        const playerDetails = potentialTeam.map(p => allPlayersInEvent.find(ap => ap.id === p.playerId)!);

        const wkCount = playerDetails.filter(p => p.category === PlayerCategory.WICKETKEEPER).length;
        if (wkCount < 1) { setError('Invalid request: Team must have at least one Wicketkeeper.'); return; }

        const bowlerCount = playerDetails.filter(p => p.category === PlayerCategory.BOWLER).length;
        if (bowlerCount < 2) { setError('Invalid request: Team must have at least two dedicated Bowlers.'); return; }

        const bowlCapableCount = playerDetails.filter(p => p.category === PlayerCategory.BOWLER || p.category === PlayerCategory.ALL_ROUNDER).length;
        if (bowlCapableCount < 5) { setError('Invalid request: Team must have at least 5 bowl-capable players.'); return; }
        
        const teamCounts = playerDetails.reduce((acc, p) => { acc[p.teamId] = (acc[p.teamId] || 0) + 1; return acc; }, {} as {[key: string]: number});
        if (Object.values(teamCounts).some(count => count > activeEvent.maxPlayersFromSingleTeam)) { 
            const newPlayerDetails = allPlayersInEvent.find(p => p.id === newPlayerId)!;
            setError(`Invalid request: This would result in more than ${activeEvent.maxPlayersFromSingleTeam} players from ${newPlayerDetails.teamName}.`); 
            return; 
        }

        if(activeEvent.leagueType === 'domestic') {
            const foreignPlayerCount = playerDetails.filter(p => p.playerType === PlayerType.FOREIGN).length;
            if (foreignPlayerCount > (activeEvent.maxForeignPlayers ?? 99)) {
                setError(`Invalid request: This would result in more than ${activeEvent.maxForeignPlayers} foreign players in your team.`);
                return;
            }
        }
        
        const newRequest: ReplacementRequest = {
            id: `req-${Date.now()}`,
            participantTeamId: myTeam.id, participantName: myTeam.participantName,
            currentPlayaerId, newPlayerId, note, status: 'pending', timestamp: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_REPLACEMENT_REQUEST', payload: newRequest });
        alert('Replacement request submitted!');
        setActiveView('viewMyXI');
    };

    return (
        <div className="bg-gray-800 p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Request Player Replacement</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-400">Player to Replace</label>
                    <select value={currentPlayaerId} onChange={e => setCurrentPlayerId(e.target.value)} className="w-full bg-gray-700 p-2 rounded">
                        <option value="">Select from your XI</option>
                        {myTeam.players.map(p => <option key={p.playerId} value={p.playerId}>{allPlayersInEvent.find(ap => ap.id === p.playerId)?.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm text-gray-400">New Player</label>
                    <select value={newPlayerId} onChange={e => setNewPlayerId(e.target.value)} className="w-full bg-gray-700 p-2 rounded">
                        <option value="">Select from available players</option>
                        {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category} / {p.teamName})</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm text-gray-400">Note for Admin (Optional)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full bg-gray-700 p-2 rounded h-20"></textarea>
                </div>
                {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
                <div className="flex gap-4">
                    <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">Submit Request</button>
                    <button onClick={() => setActiveView('viewMyXI')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cancel</button>
                </div>
            </div>
        </div>
    );
}

const ChatBoxView: React.FC = () => {
    const { state, dispatch } = useData();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    
    if (!user) return null;
    const adminId = state.users.find(u => u.role === UserRole.ADMIN)?.id || 'admin';
    
    const chatMessages = state.chatMessages.filter(
        msg => (msg.senderId === user.id && msg.receiverId === adminId) || (msg.senderId === adminId && msg.receiverId === user.id)
    );

    const handleSend = () => {
        if (!message) return;
        dispatch({
            type: 'ADD_CHAT_MESSAGE',
            payload: {
                id: `msg-${Date.now()}`,
                senderId: user.id, senderName: user.fullName, receiverId: adminId,
                message, timestamp: new Date().toISOString(), isRead: false
            }
        });
        setMessage('');
    };

    return (
        <div className="bg-gray-800 p-8 rounded-lg h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Chat with Admin</h2>
            <div className="flex-grow bg-gray-700 rounded-lg p-4 space-y-4 overflow-y-auto mb-4">
                {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.senderId === user.id ? 'bg-green-800' : 'bg-gray-600'}`}>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message..." className="bg-gray-900 p-2 rounded flex-grow" onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white font-bold p-2 rounded">Send</button>
            </div>
        </div>
    );
};

const NotificationsView: React.FC = () => {
    const { state } = useData();
    const { user } = useAuth();
    const myTeam = state.participantTeams.find(pt => pt.participantId === user?.id);
    const myRequests = state.replacementRequests.filter(r => r.participantTeamId === myTeam?.id && r.status !== 'pending');
    const participantAnnouncements = state.announcements.filter(a => a.scope === 'participant');

    return (
        <div className="bg-gray-800 p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Notifications</h2>
            <div className="space-y-6">
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-green-300">Admin Announcements</h3>
                     <div className="space-y-3">
                        {participantAnnouncements.map(anno => (
                            <div key={anno.id} className="bg-gray-700 p-4 rounded-lg">
                                <p>{anno.message}</p>
                                <p className="text-xs text-gray-400 mt-2 text-right">{new Date(anno.timestamp).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-semibold mb-2 text-green-300">Replacement Request Status</h3>
                    <div className="space-y-3">
                        {myRequests.map(req => (
                             <div key={req.id} className="bg-gray-700 p-4 rounded-lg">
                                 <p>Your request to replace <strong>{state.players.find(p=>p.id===req.currentPlayaerId)?.name}</strong> with <strong>{state.players.find(p=>p.id===req.newPlayerId)?.name}</strong> was <span className={`font-bold ${req.status==='accepted' ? 'text-green-400' : 'text-red-400'}`}>{req.status}</span>.</p>
                                 {req.reason && <p className="mt-1 text-sm text-yellow-300">Admin's reason: {req.reason}</p>}
                             </div>
                        ))}
                        {myRequests.length === 0 && <p className="text-gray-400">No updates on replacement requests.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReplacementHistoryView: React.FC = () => {
    const { state } = useData();
    const { user } = useAuth();
    const myTeam = state.participantTeams.find(pt => pt.participantId === user?.id);
    const myRequests = state.replacementRequests.filter(r => r.participantTeamId === myTeam?.id);

    const getStatusColor = (status: string) => {
        if(status === 'accepted') return 'text-green-400';
        if(status === 'rejected') return 'text-red-400';
        return 'text-yellow-400';
    }

    return (
        <div className="bg-gray-800 p-8 rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-green-400">Replacement History</h2>
            <div className="space-y-3">
                {myRequests.map(req => (
                     <div key={req.id} className="bg-gray-700 p-4 rounded-lg">
                         <div className="flex justify-between items-start">
                            <div>
                                <p><strong>Out:</strong> {state.players.find(p=>p.id===req.currentPlayaerId)?.name}</p>
                                <p><strong>In:</strong> {state.players.find(p=>p.id===req.newPlayerId)?.name}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(req.timestamp).toLocaleString()}</p>
                            </div>
                            <span className={`font-bold ${getStatusColor(req.status)}`}>{req.status.toUpperCase()}</span>
                         </div>
                         {req.reason && <p className="mt-2 pt-2 border-t border-gray-600 text-sm text-yellow-300">Reason: {req.reason}</p>}
                     </div>
                ))}
                {myRequests.length === 0 && <p className="text-gray-400">You haven't made any replacement requests yet.</p>}
            </div>
        </div>
    );
};

export default ParticipantDashboard;