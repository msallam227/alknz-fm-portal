import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export const useTaskCount = (selectedFund, token, API_URL) => {
  const [taskCount, setTaskCount] = useState(0);

  const fetchTaskCount = useCallback(async () => {
    if (!selectedFund) {
      setTaskCount(0);
      return;
    }
    try {
      const response = await axios.get(
        `${API_URL}/api/funds/${selectedFund.id}/all-tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTaskCount(response.data.total_tasks || 0);
    } catch (error) {
      console.error('Failed to fetch task count:', error);
    }
  }, [selectedFund, token, API_URL]);

  useEffect(() => {
    fetchTaskCount();
  }, [fetchTaskCount]);

  return { taskCount, setTaskCount, fetchTaskCount };
};
