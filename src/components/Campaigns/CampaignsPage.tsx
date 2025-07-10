import React, { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit, Pause, Play, Trash2, Clock, Users, CheckCircle, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Campaign, Talent, Founder } from '../../types';
import CampaignCard from './CampaignCard';
import CreateCampaignForm from './CreateCampaignForm';
import EditCampaignForm from './EditCampaignForm';
import CampaignDetailsModal from './CampaignDetailsModal';
import CampaignApplicantsModal from './CampaignApplicantsModal';
import { updateCampaign, deleteCampaign } from '../../lib/api';

const CampaignsPage: React.FC = () => {
  const { user } = useAuth();
  const { campaigns, setCampaigns, talents, refreshData } = useApp();
  const [showCreateForm, setShowCreateForm] = useState(false); 
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null); 
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null); 
  const [viewingApplicants, setViewingApplicants] = useState<Campaign | null>(null); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [statusFilter, setStatusFilter] = useState<string>('all'); 
  const [loading, setLoading] = useState(false); 

  // Filter campaigns for the current founder
  const founderCampaigns = campaigns.filter(campaign => campaign.founderId === user?.id);

  // Apply search and status filters
  const filteredCampaigns = founderCampaigns.filter(campaign => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    refreshData();
  };

  const handleEditSuccess = () => {
    setEditingCampaign(null);
    refreshData();
  };

const handleStatusChange = async (campaignId: string, newStatus: 'active' | 'paused') => {
  setLoading(true);
  try {
    await updateCampaign(campaignId, { status: newStatus });
    await refreshData();
  } catch (error) {
    alert('Failed to update campaign status. Please try again.');
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  const handleDeleteCampaign = async (campaignId: string) => {
  if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;

  setLoading(true);
  try {
    await deleteCampaign(campaignId);
    await refreshData();
  } catch (error) {
    alert('Failed to delete campaign. Please try again.');
    console.error(error);
  } finally {
    setLoading(false);
  }
};


  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
  };

  const handleViewCampaign = (campaign: Campaign) => {
    setViewingCampaign(campaign);
  };

  const handleViewApplicants = (campaign: Campaign) => {
    setViewingApplicants(campaign);
  };

  const getApprovedTalents = (campaign: Campaign): Talent[] => {
    return talents.filter(talent => campaign.approvedTalents.includes(talent.id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case '30sec':
        return '30 Seconds';
      case '1min':
        return '1 Minute';
      case '3min':
        return '3 Minutes';
      default:
        return duration;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Campaigns</h1>
          <p className="text-sm md:text-base text-gray-600">Create and manage your marketing campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* Payment Hold Info Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 md:p-4 border border-yellow-200">
        <div className="flex items-start space-x-2 md:space-x-3">
          <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm md:text-base font-medium text-yellow-900 mb-0.5 md:mb-1">Payment Hold System</h4>
            <p className="text-xs md:text-sm text-yellow-700">
              When you approve a talent application, the campaign amount will be immediately deducted from your wallet and held until the review is completed. 
              Payment will be released to the talent only after you approve their submitted content.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-blue-500">
              <Play className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Active</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {founderCampaigns.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-yellow-500">
              <Pause className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Paused</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {founderCampaigns.filter(c => c.status === 'paused').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-green-500">
              <Users className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Applicants</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {founderCampaigns.reduce((total, campaign) => total + campaign.applicants.length, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-purple-500">
              <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {formatCurrency(founderCampaigns.reduce((total, campaign) => total + campaign.price, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3 md:space-y-4">
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => {
            const approvedTalents = getApprovedTalents(campaign);
            
            return (
              <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900">{campaign.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                      {campaign.approvedTalents.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-0.5" />
                          {campaign.approvedTalents.length} Approved
                        </span>
                      )}
                      {campaign.applicants.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex items-center">
                          <Clock className="h-3 w-3 mr-0.5" />
                          {campaign.applicants.length} Pending
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs md:text-sm mb-2 md:mb-3 line-clamp-2">{campaign.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mb-2 md:mb-3">
                      <span className="whitespace-nowrap">Product: {campaign.productName}</span>
                      <span className="whitespace-nowrap">Category: {campaign.category}</span>
                      <div className="flex items-center whitespace-nowrap">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 mr-0.5 md:mr-1" />
                        <span>{getDurationLabel(campaign.duration)}</span>
                      </div>
                      <span className="whitespace-nowrap">Level: {campaign.rateLevel}★</span>
                      <div className="flex items-center whitespace-nowrap">
                        <Users className="h-3 w-3 md:h-4 md:w-4 mr-0.5 md:mr-1" />
                        <span>{campaign.applicants.length} applicants</span>
                      </div>
                      <div className="flex items-center font-semibold text-green-600 whitespace-nowrap">
                        <DollarSign className="h-3 w-3 md:h-4 md:w-4 mr-0.5 md:mr-1" />
                        <span>{formatCurrency(campaign.price)}</span>
                      </div>
                    </div>

                    {/* Approved Talents Display */}
                    {approvedTalents.length > 0 && (
                      <div className="mt-2 md:mt-3 p-2 md:p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="text-xs md:text-sm font-medium text-green-800 mb-1 md:mb-2">Approved Talents:</h4>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {approvedTalents.map((talent) => (
                            <div key={talent.id} className="flex items-center space-x-1 md:space-x-2 bg-white px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-green-200">
                              <div className="w-4 h-4 md:w-6 md:h-6 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs font-bold">
                                {talent.avatar ? (
                                  <img
                                    src={talent.avatar}
                                    alt={talent.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  talent.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="text-sm text-green-800 font-medium">{talent.name}</span>
                              <span className="text-xs text-green-600">
                                ({Array.from({ length: talent.rateLevel }).map((_, i) => (
                                  <span key={i}>⭐</span>
                                ))})
                              </span>
                              <span className="text-xs md:text-sm text-green-800 font-medium truncate max-w-[60px] md:max-w-[100px]">{talent.name}</span>
                              <span className="text-xs text-green-600">({talent.rateLevel}★)</span>
                              <span className="text-xs text-green-600 bg-green-100 px-1.5 md:px-2 py-0.5 rounded-full hidden sm:inline-block">
                                {formatCurrency(campaign.price)} held
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1 md:gap-2 justify-end">
                    {campaign.applicants.length > 0 && (
                      <button
                        onClick={() => handleViewApplicants(campaign)}
                        className="p-1.5 md:p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors relative"
                        title="View Applicants"
                      >
                        <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        {campaign.applicants.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 md:h-5 md:w-5 flex items-center justify-center text-[10px] md:text-xs">
                            {campaign.applicants.length}
                          </span>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleViewCampaign(campaign)}
                      onClose={() => {
                                      setViewingCampaign(null);
                                      refreshData();
                                    }}
                      className="p-1.5 md:p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleEditCampaign(campaign)}
                      className="p-1.5 md:p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Campaign"
                    >
                      <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                    
                    {campaign.status === 'active' ? (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'paused')}
                        className="p-1.5 md:p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Pause Campaign"
                      >
                        <Pause className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                        className="p-1.5 md:p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Activate Campaign"
                      >
                        <Play className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="p-1.5 md:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 md:py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-500">
              <Plus className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-gray-300" />
              <h3 className="text-base md:text-lg font-medium mb-1 md:mb-2">No campaigns found</h3>
              <p className="text-xs md:text-sm mb-3 md:mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first campaign to get started'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>Create Your First Campaign</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateForm && (
        <CreateCampaignForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <EditCampaignForm
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Campaign Details Modal */}
      {viewingCampaign && (
        <CampaignDetailsModal
          campaign={viewingCampaign}
          onClose={() => setViewingCampaign(null)}
          onEdit={() => {
            setEditingCampaign(viewingCampaign);
            setViewingCampaign(null);
          }}
          onDelete={() => handleDeleteCampaign(viewingCampaign.id)}
          onStatusChange={(status) => handleStatusChange(viewingCampaign.id, status)}
        />
      )}

      {/* View Applicants Modal */}
      {viewingApplicants && (
        <CampaignApplicantsModal
          campaignId={viewingApplicants.id}
          onClose={() => {
            setViewingApplicants(null);
            refreshData(); // Refresh data when modal closes to ensure we have the latest state
          }}
        />
      )}
    </div>
  );
};

export default CampaignsPage;