import apiMethods from "../methods/apiMethods";

export const fetchDailyReportByDate = async (dateStr) => {
  try {
    const params = dateStr ? { date: dateStr } : {};
    try {
      return await apiMethods.get('/api/v1/getDailyReportByDate', params);
    } catch (err) {
      if (err?.response?.status === 404) {
        return await apiMethods.get('/getDailyReportByDate', params);
      }
      throw err;
    }
  } catch (error) {
    console.error('Error fetching daily report by date, trying legacy endpoint:', error);
    try {
      return await apiMethods.get('/todaysDailyReport', dateStr ? { date: dateStr } : {});
    } catch (fallbackError) {
      console.error('Error in fallback fetchTodaysDailyReport:', fallbackError);
      throw error;
    }
  }
};

export const fetchTodaysDailyReport = fetchDailyReportByDate;


export const fetchAllMeetingCheckIns = async () => {
  try {
    const response = await apiMethods.get('/plannedMeetings/getAllMeetingCheckIn');
    return response;
  } catch (error) {
    console.error('[fetchAllMeetingCheckIns] error:', error);
    throw error;
  }
};
