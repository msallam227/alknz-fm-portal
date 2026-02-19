import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export const usePersonaData = (fundId, token, API_URL) => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchPersonas = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/funds/${fundId}/personas`, { headers: authHeader });
      setPersonas(res.data.personas || []);
    } catch (err) {
      console.error('Failed to fetch personas:', err);
    } finally {
      setLoading(false);
    }
  }, [fundId, token, API_URL]);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const createPersona = async (data) => {
    const res = await axios.post(`${API_URL}/api/funds/${fundId}/personas`, data, { headers: authHeader });
    setPersonas(prev => [...prev, res.data.persona]);
    return res.data.persona;
  };

  const updatePersona = async (personaId, data) => {
    const res = await axios.put(`${API_URL}/api/funds/${fundId}/personas/${personaId}`, data, { headers: authHeader });
    setPersonas(prev => prev.map(p => p.id === personaId ? res.data.persona : p));
    return res.data.persona;
  };

  const deletePersona = async (personaId) => {
    await axios.delete(`${API_URL}/api/funds/${fundId}/personas/${personaId}`, { headers: authHeader });
    setPersonas(prev => prev.filter(p => p.id !== personaId));
  };

  const matchInvestor = async (investorId) => {
    const res = await axios.post(
      `${API_URL}/api/funds/${fundId}/personas/match`,
      { investor_id: investorId },
      { headers: authHeader }
    );
    return res.data;
  };

  const suggestPersonas = async () => {
    const res = await axios.post(`${API_URL}/api/funds/${fundId}/personas/suggest`, {}, { headers: authHeader });
    return res.data;
  };

  /**
   * Compute persona match scores client-side using rule-based logic.
   * Used for investor list badges (avoids an API call per investor).
   */
  const scoreInvestorClientSide = useCallback((investor) => {
    if (!personas.length) return [];
    const GCC = new Set(['saudi arabia', 'uae', 'united arab emirates', 'qatar', 'bahrain', 'oman', 'kuwait']);

    return personas.map(persona => {
      let totalW = 0;
      let earnedW = 0;

      if (persona.target_investor_type) {
        totalW += 35;
        if ((investor.investor_type || '').toLowerCase() === persona.target_investor_type.toLowerCase()) earnedW += 35;
      }
      if (persona.target_nationalities?.length) {
        totalW += 25;
        const invNat = (investor.nationality || '').toLowerCase();
        const targets = persona.target_nationalities.map(n => n.toLowerCase());
        if (targets.includes(invNat) || (targets.includes('gcc') && GCC.has(invNat))) earnedW += 25;
      }
      if (persona.target_sectors?.length) {
        totalW += 20;
        const invS = (investor.sector || '').toLowerCase();
        const targets = persona.target_sectors.map(s => s.toLowerCase());
        if (targets.some(t => t && (invS.includes(t) || t.includes(invS)))) earnedW += 20;
      }
      if (persona.target_gender && persona.target_gender.toLowerCase() !== 'diverse') {
        totalW += 10;
        if ((investor.gender || '').toLowerCase() === persona.target_gender.toLowerCase()) earnedW += 10;
      }
      if (persona.target_age_min != null) {
        totalW += 10;
        if (investor.age != null && investor.age >= persona.target_age_min) earnedW += 10;
      }

      const score = totalW > 0 ? Math.round((earnedW / totalW) * 100) : 0;
      return { persona_id: persona.id, persona_name: persona.name, score };
    }).sort((a, b) => b.score - a.score);
  }, [personas]);

  return {
    personas,
    loading,
    fetchPersonas,
    createPersona,
    updatePersona,
    deletePersona,
    matchInvestor,
    suggestPersonas,
    scoreInvestorClientSide,
  };
};
