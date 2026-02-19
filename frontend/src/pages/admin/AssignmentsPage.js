import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link2, Search, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

const AssignmentsPage = () => {
  const { token, API_URL } = useAuth();
  const [users, setUsers] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, fundsRes] = await Promise.all([
          axios.get(`${API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/api/funds`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setUsers(usersRes.data);
        setFunds(fundsRes.data);
        
        // Initialize assignments from users
        const initialAssignments = {};
        usersRes.data.forEach(user => {
          initialAssignments[user.id] = user.assigned_funds || [];
        });
        setAssignments(initialAssignments);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, API_URL]);

  const handleToggleFund = (userId, fundId) => {
    setAssignments(prev => {
      const userFunds = prev[userId] || [];
      if (userFunds.includes(fundId)) {
        return { ...prev, [userId]: userFunds.filter(id => id !== fundId) };
      }
      return { ...prev, [userId]: [...userFunds, fundId] };
    });
  };

  const handleSaveAssignments = async (userId) => {
    setSaving(prev => ({ ...prev, [userId]: true }));
    
    try {
      await axios.post(
        `${API_URL}/api/assignments`,
        {
          user_id: userId,
          fund_ids: assignments[userId] || []
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Assignments saved');
    } catch (error) {
      toast.error('Failed to save assignments');
    } finally {
      setSaving(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const filteredUsers = users.filter(user => {
    if (user.role === 'ADMIN') return false; // Only show Fund Managers
    const search = searchQuery.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0047AB]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="assignments-page">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Fund Assignments</h1>
        <p className="text-[#94A3B8] mt-1">Assign funds to Fund Managers</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder="Search fund managers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#02040A]/60 border-[#1A2744] text-white placeholder:text-[#475569] focus:border-[#0047AB]"
          data-testid="search-assignments-input"
        />
      </div>

      {funds.length === 0 ? (
        <div className="border border-[#1A2744] rounded-xl p-12 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
          }}
        >
          <Link2 className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Funds Available</h3>
          <p className="text-[#94A3B8]">Create some funds first before making assignments.</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="border border-[#1A2744] rounded-xl p-12 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
          }}
        >
          <Link2 className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Fund Managers</h3>
          <p className="text-[#94A3B8]">Create Fund Manager users to assign them to funds.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="border border-[#1A2744] rounded-xl p-6"
              style={{
                background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.8) 0%, rgba(2, 4, 10, 0.8) 100%)'
              }}
              data-testid={`assignment-row-${user.id}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* User Info */}
                <div className="flex items-center gap-4 min-w-[250px]">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url ? `${API_URL}${user.avatar_url}` : undefined} />
                    <AvatarFallback className="bg-[#0047AB] text-white">
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-[#94A3B8]">{user.email}</p>
                  </div>
                </div>

                {/* Fund Checkboxes */}
                <div className="flex-1">
                  <p className="text-sm text-[#94A3B8] mb-3">Assigned Funds:</p>
                  <div className="flex flex-wrap gap-3">
                    {funds.map(fund => (
                      <label
                        key={fund.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          assignments[user.id]?.includes(fund.id)
                            ? 'bg-[#0047AB]/20 border-[#0047AB] text-[#00A3FF]'
                            : 'bg-[#02040A]/60 border-[#1A2744] text-[#94A3B8] hover:border-[#0047AB]/50'
                        }`}
                        data-testid={`assignment-${user.id}-${fund.id}`}
                      >
                        <Checkbox
                          checked={assignments[user.id]?.includes(fund.id)}
                          onCheckedChange={() => handleToggleFund(user.id, fund.id)}
                          className="border-[#1A2744] data-[state=checked]:bg-[#0047AB] data-[state=checked]:border-[#0047AB]"
                        />
                        <span className="text-sm">{fund.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="lg:ml-4">
                  <Button
                    onClick={() => handleSaveAssignments(user.id)}
                    disabled={saving[user.id]}
                    className="text-white"
                    style={{
                      background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)'
                    }}
                    data-testid={`save-assignment-${user.id}`}
                  >
                    {saving[user.id] ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;
