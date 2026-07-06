import apiMethods from "../methods/apiMethods";

export const fetchTodaysDailyReport = async (dateStr) => {
  try {
    const params = dateStr ? { date: dateStr } : {};
    const response = await apiMethods.get('/todaysDailyReport', params);
    return response;
  } catch (error) {
    console.error('Error fetching today’s daily report:', error);
    throw error;
  }
};

export const fetchAllMeetingCheckIns = async () => {
  try {
    const response = await apiMethods.get('/plannedMeetings/getAllMeetingCheckIn');
    return response;
  } catch (error) {
    console.error('[fetchAllMeetingCheckIns] error:', error);
    throw error;
  }
};
