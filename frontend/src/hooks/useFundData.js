import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export const useFundData = (token, API_URL) => {
  const [funds, setFunds] = useState([]);
  const [allFundsSPVs, setAllFundsSPVs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [myFundsRes, allFundsRes, teamRes] = await Promise.all([
          axios.get(`${API_URL}/api/my-funds`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/all-funds-spvs`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/team-members`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setFunds(myFundsRes.data);
        setAllFundsSPVs(allFundsRes.data);
        setTeamMembers(teamRes.data);
        if (myFundsRes.data.length > 0) {
          setSelectedFund(myFundsRes.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [token, API_URL]);

  const getFundName = (fundId) => {
    const fund = allFundsSPVs.find(f => f.id === fundId);
    return fund?.name || fundId;
  };

  const getTeamMemberName = (userId) => {
    const member = teamMembers.find(m => m.id === userId);
    return member ? `${member.first_name} ${member.last_name}` : userId;
  };

  // Offices are not separately fetched; return raw ID as fallback
  const getOfficeName = (officeId) => officeId;

  return {
    funds,
    allFundsSPVs,
    teamMembers,
    selectedFund,
    setSelectedFund,
    loading,
    getFundName,
    getTeamMemberName,
    getOfficeName,
  };
};
