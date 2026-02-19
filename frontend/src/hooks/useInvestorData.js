import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { emptyProfile } from '@/components/fund-manager';

export const useInvestorData = (selectedFund, token, API_URL) => {
  const [investors, setInvestors] = useState([]);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [profileData, setProfileData] = useState(emptyProfile);
  const [historicalData, setHistoricalData] = useState({ has_invested_before: false, historical_fund_ids: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingInvestors, setLoadingInvestors] = useState(false);
  const [pipelineStages, setPipelineStages] = useState([]);

  const fetchFundData = useCallback(async () => {
    if (!selectedFund) {
      setInvestors([]);
      setPipelineStages([]);
      return null;
    }

    setLoadingInvestors(true);
    try {
      const [investorsRes, stagesRes] = await Promise.all([
        axios.get(
          `${API_URL}/api/investor-profiles-with-pipeline/fund/${selectedFund.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API_URL}/api/funds/${selectedFund.id}/pipeline-stages`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);
      setInvestors(investorsRes.data);
      setPipelineStages(stagesRes.data);
      return investorsRes.data;
    } catch (error) {
      console.error('Failed to fetch fund data:', error);
      toast.error('Failed to load fund data');
      return null;
    } finally {
      setLoadingInvestors(false);
    }
  }, [selectedFund, token, API_URL]);

  useEffect(() => {
    fetchFundData();
    setSelectedInvestor(null);
  }, [fetchFundData]);

  const handleSelectInvestor = async (investor) => {
    setSelectedInvestor(investor);
    setProfileData({ ...emptyProfile, ...investor });
    setIsEditing(false);

    try {
      const historyRes = await axios.get(
        `${API_URL}/api/investor-profiles/${investor.id}/check-history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistoricalData(historyRes.data);

      if (!investor.has_invested_override && investor.has_invested_with_alknz === null) {
        setProfileData(prev => ({
          ...prev,
          has_invested_with_alknz: historyRes.data.has_invested_before,
          previous_alknz_funds: historyRes.data.historical_fund_ids.length > 0
            ? historyRes.data.historical_fund_ids
            : prev.previous_alknz_funds
        }));
      }
    } catch (error) {
      console.error('Failed to check history:', error);
      setHistoricalData({ has_invested_before: false, historical_fund_ids: [] });
    }
  };

  const handleCreateInvestor = async () => {
    if (!profileData.investor_name) {
      toast.error('Investor name is required');
      return false;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...profileData,
        fund_id: selectedFund.id,
        office_id: selectedFund.office_id || null,
        age: profileData.age ? parseInt(profileData.age) : null,
        expected_ticket_amount: profileData.expected_ticket_amount ? parseFloat(profileData.expected_ticket_amount) : null,
        typical_ticket_size: profileData.typical_ticket_size ? parseFloat(profileData.typical_ticket_size) : null,
        previous_alknz_funds: profileData.previous_alknz_funds || []
      };

      const response = await axios.post(
        `${API_URL}/api/investor-profiles`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInvestors(prev => [...prev, response.data]);
      toast.success('Investor profile created');
      return true;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create investor';
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateInvestor = async () => {
    if (!selectedInvestor) return;

    setIsSaving(true);
    try {
      const payload = {
        ...profileData,
        age: profileData.age ? parseInt(profileData.age) : null,
        expected_ticket_amount: profileData.expected_ticket_amount ? parseFloat(profileData.expected_ticket_amount) : null,
        typical_ticket_size: profileData.typical_ticket_size ? parseFloat(profileData.typical_ticket_size) : null,
        previous_alknz_funds: profileData.previous_alknz_funds || [],
        has_invested_override: profileData.has_invested_with_alknz !== historicalData.has_invested_before
      };

      const response = await axios.put(
        `${API_URL}/api/investor-profiles/${selectedInvestor.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInvestors(prev => prev.map(i => i.id === selectedInvestor.id ? response.data : i));
      setSelectedInvestor(response.data);
      setIsEditing(false);
      toast.success('Investor profile updated');
    } catch {
      toast.error('Failed to update investor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvestor = async () => {
    if (!selectedInvestor) return;

    try {
      await axios.delete(
        `${API_URL}/api/investor-profiles/${selectedInvestor.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvestors(prev => prev.filter(i => i.id !== selectedInvestor.id));
      setSelectedInvestor(null);
      toast.success('Investor profile deleted');
    } catch {
      toast.error('Failed to delete investor');
    }
  };

  const handleQuickDelete = async (investor) => {
    try {
      await axios.delete(`${API_URL}/api/investor-profiles/${investor.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Deleted ${investor.investor_name}`);
      setInvestors(prev => prev.filter(inv => inv.id !== investor.id));
      if (selectedInvestor?.id === investor.id) {
        setSelectedInvestor(null);
      }
    } catch {
      toast.error('Failed to delete investor');
    }
  };

  return {
    investors,
    setInvestors,
    selectedInvestor,
    setSelectedInvestor,
    profileData,
    setProfileData,
    historicalData,
    isEditing,
    setIsEditing,
    isSaving,
    loadingInvestors,
    pipelineStages,
    setPipelineStages,
    fetchFundData,
    handleSelectInvestor,
    handleCreateInvestor,
    handleUpdateInvestor,
    handleDeleteInvestor,
    handleQuickDelete,
  };
};
