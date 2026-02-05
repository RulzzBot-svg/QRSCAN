import { API } from "./api";

/**
 * Get schedule summary for a given schedule_id
 * @param {number} scheduleId - The schedule ID (typically hospital_id)
 * @param {object} params - Query parameters
 * @param {string} params.start_date - Start date in YYYY-MM-DD format
 * @param {string} params.end_date - End date in YYYY-MM-DD format
 * @returns {Promise} Schedule summary data
 */
export const getScheduleSummary = (scheduleId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);
  
  const queryString = queryParams.toString();
  const url = `/schedule/${scheduleId}${queryString ? `?${queryString}` : ''}`;
  
  return API.get(url);
};
