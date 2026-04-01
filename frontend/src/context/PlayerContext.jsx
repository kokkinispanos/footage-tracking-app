import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import { useAuth } from './AuthContext';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (user?.uid && user.role === 'player') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dbService.getPlayerData(user.uid);
      setPlayerData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Generic fast-update that optimistic applies state locally and debounces a db push
  const updatePlayerState = (updaterFn) => {
    setPlayerData(prev => {
      const newData = updaterFn(prev);
      debouncedSave(newData);
      return newData;
    });
  };

  const debouncedSave = (dataToSave) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await dbService.updatePlayerData(user.uid, dataToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        setSaveStatus('error');
      }
    }, 1000); // 1 second debounce
  };

  return (
    <PlayerContext.Provider value={{
      playerData, 
      loading, 
      saveStatus,
      updatePlayerState,
      setPlayerData // direct setter if needed rarely
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
