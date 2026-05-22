// frontend/services/eventService.js
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl || 'http://YOUR_LOCAL_IP:3000';

// Send a network request to creation endpoint in server.js to post a new campus event
export const createNewEvent = async (eventData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to dispatch new event to cloud.');
    }

    return result.data;
  } catch (error) {
    console.error('Error within createNewEvent service tracker:', error);
    throw error;
  }
};

// Fetch the active global event registry list from database with optional category filtering
export const fetchGlobalEvents = async (category) => {
  try {
    let url = `${BASE_URL}/api/events`;
    
    // Append query parameter if filtering by a specific tab category
    if (category && category !== 'All Events') {
      url += `?category=${encodeURIComponent(category)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to sync event listings from cloud.');
    }

    return result.data || [];
  } catch (error) {
    console.error('Error within fetchGlobalEvents service tracker:', error);
    throw error;
  }
};