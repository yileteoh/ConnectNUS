// backend/utils/timeFormatter.js

function getRelativeTime(timeData) {
  if (!timeData) return 'Just now';
  let date;
  
  // Handle Firebase Timestamp format
  if (timeData._seconds) {
    date = new Date(timeData._seconds * 1000);
  } else if (timeData.seconds) {
    date = new Date(timeData.seconds * 1000);
  } else {
    date = new Date(timeData); 
  }

  // Handle invalid date
  if (isNaN(date.getTime())) return 'Just now';

  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'Just now'; // Future dates fallback

  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  
  return `${Math.floor(hours / 24)}d ago`;
}

module.exports = { getRelativeTime };